import "server-only";

import { Currency, Finish, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDisplayMarket } from "@/lib/pricing";
import { scryfall } from "@/services/scryfall";

const EXACT_TAKE = 200;
const FUZZY_TAKE = 80;
const COLD_CATALOG = 1_000;

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

export async function searchCatalog(rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const cards = await db.card.findMany({
    where: { normalizedName: query.toLocaleLowerCase() },
    select: { id: true },
    take: 8,
  });
  if (cards.length > 0) {
    return db.cardPrinting.findMany({
      where: { digital: false, cardId: { in: cards.map((card) => card.id) } },
      include: printingInclude,
      orderBy: { releasedAt: "desc" },
      take: EXACT_TAKE,
    });
  }

  const where = printingWhere(query);
  const local = await db.cardPrinting.findMany({
    where,
    include: printingInclude,
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: FUZZY_TAKE,
  });
  if (local.length > 0) return local;

  const catalogSize = await db.cardPrinting.count();
  if (catalogSize >= COLD_CATALOG) return local;

  try {
    const remote = await scryfall.searchPrintings(`${query} game:paper`, { maxPages: 1 });
    await scryfall.synchronizePrintings(remote.slice(0, FUZZY_TAKE));
  } catch {
    return local;
  }

  return db.cardPrinting.findMany({
    where,
    include: printingInclude,
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: FUZZY_TAKE,
  });
}
