import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scryfall } from "@/services/scryfall";

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

export async function searchCatalog(rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) return [];
  const where = printingWhere(query);

  const local = await db.cardPrinting.findMany({
    where,
    include: {
      set: true,
      card: { select: { typeLine: true } },
      currentPrices: { where: { provider: "SCRYFALL" } },
    },
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: 24,
  });
  if (local.length >= 8) return local;

  const attempts = [
    query,
    ...(query.match(/^[a-z0-9]{2,6}$/i) ? [`set:${query}`] : []),
    ...(query.match(/^\d+[a-z]?$/i) ? [`number:${query}`] : []),
  ];
  let synchronized = false;
  for (const remoteQuery of attempts) {
    try {
      const remote = await scryfall.searchPrintings(remoteQuery);
      await scryfall.synchronizePrintings(remote.slice(0, 24));
      synchronized = true;
      break;
    } catch {
      // Try the next supported interpretation (set code or collector number).
    }
  }
  if (!synchronized) return local;

  return db.cardPrinting.findMany({
    where,
    include: {
      set: true,
      card: { select: { typeLine: true } },
      currentPrices: { where: { provider: "SCRYFALL" } },
    },
    orderBy: [{ name: "asc" }, { releasedAt: "desc" }],
    take: 24,
  });
}
