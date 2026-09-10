import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { db } from "@/lib/db";
import {
  scryfall,
  scryfallFinishes,
  scryfallImage,
  type ScryfallCard,
} from "./scryfall";

const SCRYFALL_HEADERS = { "User-Agent": "MysticLedger/1.0 (catalog sync)" };
const SET_BATCH = 200;
const CARD_BATCH = 400;
const PRINTING_BATCH = 400;
const NEWEST_PAGES = 3;
const BULK_READY_COUNT = 5_000;

type BulkFile = {
  type: string;
  updated_at: string;
  jsonl_download_uri?: string;
  download_uri?: string;
};

type Page = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
};

function isPaperPrinting(card: ScryfallCard) {
  if (!card.oracle_id || card.digital) return false;
  if (card.games?.length) return card.games.includes("paper");
  return true;
}

async function bulkFile(type = "default_cards") {
  const response = await fetch("https://api.scryfall.com/bulk-data", { headers: SCRYFALL_HEADERS });
  if (!response.ok) throw new Error(`Scryfall bulk-data failed (${response.status})`);
  const body = (await response.json()) as { data: BulkFile[] };
  const file = body.data.find((entry) => entry.type === type);
  if (!file) throw new Error(`Scryfall bulk file "${type}" was not listed`);
  const uri = file.jsonl_download_uri ?? file.download_uri;
  if (!uri) throw new Error(`Scryfall bulk file "${type}" has no download URL`);
  return { ...file, uri };
}

async function* iterateJsonl(url: string) {
  const response = await fetch(url, { headers: SCRYFALL_HEADERS });
  if (!response.ok || !response.body) {
    throw new Error(`Scryfall bulk download failed (${response.status})`);
  }
  const encoded = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  const unzipped = url.endsWith(".gz") ? encoded.pipe(createGunzip()) : encoded;
  const lines = createInterface({ input: unzipped });
  for await (const line of lines) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as ScryfallCard;
  }
}

async function createMissing<T>(
  rows: T[],
  batchSize: number,
  write: (chunk: T[]) => Promise<unknown>,
) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await write(rows.slice(index, index + batchSize));
  }
}

export async function syncCatalogFromBulk() {
  const file = await bulkFile();
  const sets = new Map<string, { scryfallId: string; code: string; name: string; setType: string | null }>();
  const cards = new Map<
    string,
    {
      oracleId: string;
      name: string;
      normalizedName: string;
      typeLine: string | null;
      oracleText: string | null;
      manaCost: string | null;
      colorIdentity: string[];
    }
  >();
  const printings: ScryfallCard[] = [];

  for await (const card of iterateJsonl(file.uri)) {
    if (!isPaperPrinting(card) || !card.oracle_id) continue;
    sets.set(card.set_id, {
      scryfallId: card.set_id,
      code: card.set,
      name: card.set_name,
      setType: card.set_type ?? null,
    });
    cards.set(card.oracle_id, {
      oracleId: card.oracle_id,
      name: card.name,
      normalizedName: card.name.toLocaleLowerCase(),
      typeLine: card.type_line ?? null,
      oracleText: card.oracle_text ?? null,
      manaCost: card.mana_cost ?? null,
      colorIdentity: card.color_identity ?? [],
    });
    printings.push(card);
  }

  const existingSets = await db.mtgSet.findMany({ select: { scryfallId: true } });
  const haveSets = new Set(existingSets.map((row) => row.scryfallId));
  await createMissing(
    [...sets.values()].filter((row) => !haveSets.has(row.scryfallId)),
    SET_BATCH,
    (chunk) => db.mtgSet.createMany({ data: chunk, skipDuplicates: true }),
  );

  const existingCards = await db.card.findMany({ select: { oracleId: true } });
  const haveCards = new Set(existingCards.map((row) => row.oracleId));
  await createMissing(
    [...cards.values()].filter((row) => !haveCards.has(row.oracleId)),
    CARD_BATCH,
    (chunk) => db.card.createMany({ data: chunk, skipDuplicates: true }),
  );

  const setIdByScryfall = new Map(
    (await db.mtgSet.findMany({ select: { id: true, scryfallId: true } })).map((row) => [
      row.scryfallId,
      row.id,
    ]),
  );
  const cardIdByOracle = new Map(
    (await db.card.findMany({ select: { id: true, oracleId: true } })).map((row) => [
      row.oracleId,
      row.id,
    ]),
  );

  const printingRows = printings.flatMap((card) => {
    const cardId = card.oracle_id ? cardIdByOracle.get(card.oracle_id) : undefined;
    const setId = setIdByScryfall.get(card.set_id);
    if (!cardId || !setId) return [];
    return [
      {
        scryfallId: card.id,
        cardId,
        setId,
        collectorNumber: card.collector_number,
        name: card.name,
        rarity: card.rarity,
        artist: card.artist ?? null,
        language: card.lang || "en",
        releasedAt: card.released_at ? new Date(card.released_at) : null,
        imageSmallUrl: scryfallImage(card, "small"),
        imageNormalUrl: scryfallImage(card, "normal"),
        finishes: scryfallFinishes(card.finishes),
        promo: card.promo,
        digital: false,
        tcgplayerId: card.tcgplayer_id ?? null,
        cardmarketId: card.cardmarket_id ?? null,
        rawPrices: card.prices ?? undefined,
        pricesUpdatedAt: new Date(),
      },
    ];
  });

  await createMissing(printingRows, PRINTING_BATCH, (chunk) =>
    db.cardPrinting.createMany({ data: chunk, skipDuplicates: true }),
  );

  const printingCount = await db.cardPrinting.count();
  await db.$executeRaw`
    INSERT INTO "CatalogSync" (id, "bulkType", "bulkUpdatedAt", "lastSyncedAt", "printingCount")
    VALUES (
      'scryfall',
      ${file.type},
      ${new Date(file.updated_at)},
      ${new Date()},
      ${printingCount}
    )
    ON CONFLICT (id) DO UPDATE SET
      "bulkType" = EXCLUDED."bulkType",
      "bulkUpdatedAt" = EXCLUDED."bulkUpdatedAt",
      "lastSyncedAt" = EXCLUDED."lastSyncedAt",
      "printingCount" = EXCLUDED."printingCount"
  `;

  return { source: "bulk" as const, synchronized: printingRows.length, printingCount };
}

async function syncNewestPages(maxPages = NEWEST_PAGES) {
  let url =
    "https://api.scryfall.com/cards/search?q=game%3Apaper&unique=prints&order=released&dir=desc";
  let page = 0;
  let synchronized = 0;

  while (url && page < maxPages) {
    const response = await fetch(url, { headers: SCRYFALL_HEADERS });
    if (!response.ok) throw new Error(`Scryfall sync failed (${response.status})`);
    const result = (await response.json()) as Page;
    synchronized += await scryfall.synchronizePrintings(result.data);
    page += 1;
    url = result.has_more && result.next_page ? result.next_page : "";
    if (url) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { source: "newest" as const, pages: page, synchronized };
}

/** Full bulk import, or a short newest-prints pass when the catalog is already loaded. */
export async function syncCatalog(options: { bulk?: boolean } = {}) {
  const printingCount = await db.cardPrinting.count();
  if (options.bulk || printingCount < BULK_READY_COUNT) {
    return syncCatalogFromBulk();
  }
  return syncNewestPages();
}
