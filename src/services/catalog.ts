import "server-only";

import { Currency, Finish, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDisplayMarket } from "@/lib/pricing";
import { ingestPaperPrintings } from "@/services/catalog-sync";
import { scryfall } from "@/services/scryfall";

const EXACT_TAKE = 200;
const FUZZY_TAKE = 80;
const BULK_COMPLETE = 50_000;

const printingInclude = {
  set: true,
  card: { select: { typeLine: true } },
  currentPrices: { where: { provider: "SCRYFALL" as const } },
} satisfies Prisma.CardPrintingInclude;

function printingWhere(query: string): Prisma.CardPrintingWhereInput {
  const setCode = query.match(/\b(?:set|e):([a-z0-9]+)/i)?.[1];
  const collectorNumber = query.match(/\b(?:number|cn):([a-z0-9-]+)/i)?.[1];
  if (setCode || collectorNumber) {
    return {
      digital: false,
      ...(setCode && { set: { code: { equals: setCode, mode: "insensitive" } } }),
      ...(collectorNumber && { collectorNumber }),
    };
  }
  return {
    digital: false,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { set: { code: { equals: query, mode: "insensitive" } } },
      { collectorNumber: query },
    ],
  };
}

function rawNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function pricesFromPrinting(
  currentPrices: Array<{ finish: Finish; currency: Currency; market: { toNumber(): number } | number | null }>,
  rawPrices: unknown,
  storedCurrency: Currency,
  fx: number,
) {
  const fromTable = currentPrices
    .filter((price) => price.currency === storedCurrency)
    .map((price) => ({
      finish: price.finish,
      market: toDisplayMarket(price.market, fx),
    }));
  if (fromTable.some((price) => price.market != null)) return fromTable;

  const raw = rawPrices && typeof rawPrices === "object" ? (rawPrices as Record<string, unknown>) : {};
  const useEur = storedCurrency === Currency.EUR;
  return [
    {
      finish: Finish.NONFOIL,
      market: toDisplayMarket(rawNumber(useEur ? raw.eur : raw.usd), fx),
    },
    {
      finish: Finish.FOIL,
      market: toDisplayMarket(rawNumber(useEur ? raw.eur_foil : raw.usd_foil), fx),
    },
    {
      finish: Finish.ETCHED,
      market: toDisplayMarket(rawNumber(raw.usd_etched), fx),
    },
  ];
}

async function catalogIsComplete() {
  try {
    const rows = await db.$queryRaw<Array<{ printingCount: number }>>`
      SELECT "printingCount" FROM "CatalogSync" WHERE id = 'scryfall' LIMIT 1
    `;
    return (rows[0]?.printingCount ?? 0) >= BULK_COMPLETE;
  } catch {
    return false;
  }
}

function isSetOrNumberQuery(query: string) {
  return (
    /\b(?:set|e|number|cn):/i.test(query) ||
    /^[a-z0-9]{2,5}$/i.test(query) ||
    /^\d+[a-z]?$/i.test(query)
  );
}

async function backfillFromScryfall(query: string) {
  const cleaned = query.replaceAll('"', "").trim();
  const exactName = !isSetOrNumberQuery(cleaned);
  const remote = await scryfall.searchPrintings(
    exactName ? `!"${cleaned}" game:paper` : `${cleaned} game:paper`,
    exactName ? {} : { maxPages: 1 },
  );
  await ingestPaperPrintings(remote);
}

async function localExact(query: string) {
  const cards = await db.card.findMany({
    where: { normalizedName: query.toLocaleLowerCase() },
    select: { id: true },
    take: 8,
  });
  if (cards.length === 0) return [];
  return db.cardPrinting.findMany({
    where: { digital: false, cardId: { in: cards.map((card) => card.id) } },
    include: printingInclude,
    orderBy: { releasedAt: "desc" },
    take: EXACT_TAKE,
  });
}

export async function searchCatalog(rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  if (!(await catalogIsComplete())) {
    try {
      await backfillFromScryfall(query);
    } catch {
      // Serve whatever is already in the catalog.
    }
  }

  const exact = await localExact(query);
  if (exact.length > 0) return exact;

  return db.cardPrinting.findMany({
    where: printingWhere(query),
    include: printingInclude,
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: FUZZY_TAKE,
  });
}
