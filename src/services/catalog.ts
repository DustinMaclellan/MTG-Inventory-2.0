import "server-only";

import { Currency, Finish, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDisplayMarket } from "@/lib/pricing";
import {
  parseCatalogQuery,
  restoreRejectedSet,
  scryfallCatalogQuery,
  type CatalogSearchParts,
} from "@/services/catalog-query";
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

function printingWhere(parts: CatalogSearchParts): Prisma.CardPrintingWhereInput {
  const nameFilter = parts.name
    ? parts.setCode || parts.collectorNumber
      ? { equals: parts.name, mode: "insensitive" as const }
      : { contains: parts.name, mode: "insensitive" as const }
    : undefined;
  return {
    digital: false,
    ...(nameFilter && { name: nameFilter }),
    ...(parts.setCode && { set: { code: { equals: parts.setCode, mode: "insensitive" as const } } }),
    ...(parts.collectorNumber && {
      collectorNumber: { equals: parts.collectorNumber, mode: "insensitive" as const },
    }),
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

async function resolveSearchParts(rawQuery: string): Promise<CatalogSearchParts> {
  const sets = await db.mtgSet.findMany({ select: { code: true, name: true } });
  const parsed = parseCatalogQuery(rawQuery, sets);
  if (!parsed.setCode) return parsed;
  const known = await db.mtgSet.findFirst({
    where: { code: { equals: parsed.setCode, mode: "insensitive" } },
    select: { code: true },
  });
  if (known) return { ...parsed, setCode: known.code };
  return restoreRejectedSet(parsed);
}

async function backfillFromScryfall(parts: CatalogSearchParts) {
  const exactName = Boolean(parts.name) && !parts.setCode && !parts.collectorNumber;
  const remote = await scryfall.searchPrintings(
    scryfallCatalogQuery(parts),
    exactName ? {} : { maxPages: 1 },
  );
  await ingestPaperPrintings(remote);
}

async function localExact(name: string) {
  const cards = await db.card.findMany({
    where: { normalizedName: name.toLocaleLowerCase() },
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

  const parts = await resolveSearchParts(query);
  if (!parts.name && !parts.setCode && !parts.collectorNumber) return [];

  if (!(await catalogIsComplete())) {
    try {
      await backfillFromScryfall(parts);
    } catch {
      // Serve whatever is already in the catalog.
    }
  }

  if (parts.name && !parts.setCode && !parts.collectorNumber) {
    const exact = await localExact(parts.name);
    if (exact.length > 0) return exact;
  }

  return db.cardPrinting.findMany({
    where: printingWhere(parts),
    include: printingInclude,
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: parts.name && (parts.setCode || parts.collectorNumber) ? EXACT_TAKE : FUZZY_TAKE,
  });
}
