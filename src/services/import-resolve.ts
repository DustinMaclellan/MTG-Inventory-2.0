import type { Condition, Finish } from "@prisma/client";
import { db } from "@/lib/db";
import { scryfall } from "@/services/scryfall";
import type { CsvInventoryRow } from "./csv";

export type ImportCandidate = {
  printingId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageSmallUrl: string | null;
};

export type ImportChoice = {
  row: number;
  cardName: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  language: string;
  purchasePrice?: number;
  storageLocation?: string;
  hint: string;
  candidates: ImportCandidate[];
};

export type RecognizedImportRow = {
  row: number;
  printingId: string;
  cardName: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  language: string;
  purchasePrice?: number;
  storageLocation?: string;
  imageSmallUrl: string | null;
};

function asCandidate(printing: {
  id: string;
  name: string;
  collectorNumber: string;
  imageSmallUrl: string | null;
  set: { code: string; name: string; setType: string | null };
}): ImportCandidate {
  return {
    printingId: printing.id,
    name: printing.name,
    setCode: printing.set.code,
    setName: printing.set.name,
    collectorNumber: printing.collectorNumber,
    imageSmallUrl: printing.imageSmallUrl,
  };
}

function setRank(code: string, setType: string | null, promo = false) {
  const c = code.toLowerCase();
  const t = (setType ?? "").toLowerCase();
  let rank = 0;
  if (t === "token" || t === "memorabilia" || t === "minigame") rank = 6;
  else if (t === "funny") rank = 5;
  else if (t === "promo" || t === "masterpiece") rank = 4;
  else if (["sld", "spg", "mb1", "plst", "plist", "pmtg1"].includes(c)) rank = 3;
  else if (t === "from_the_vault" || t === "premium_deck") rank = 2;
  else if (promo) rank = 1;
  return rank;
}

function sortPrintings<
  T extends { releasedAt: Date | null; promo?: boolean; set: { code: string; setType: string | null } },
>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const rank =
      setRank(a.set.code, a.set.setType, a.promo) - setRank(b.set.code, b.set.setType, b.promo);
    if (rank !== 0) return rank;
    return (b.releasedAt?.getTime() ?? 0) - (a.releasedAt?.getTime() ?? 0);
  });
}

function namesMatch(printingName: string, pasted: string) {
  return printingName.trim().toLowerCase() === pasted.trim().toLowerCase();
}

function hasFinish(printing: { finishes: Finish[] }, finish?: Finish) {
  if (!finish) return true;
  if (printing.finishes.includes(finish)) return true;
  return finish === "NONFOIL" && printing.finishes.length === 0;
}

function finishQuery(finish?: Finish) {
  if (finish === "FOIL") return " is:foil";
  if (finish === "ETCHED") return " is:etched";
  return "";
}

function pickCandidates<
  T extends {
    name: string;
    releasedAt: Date | null;
    promo?: boolean;
    set: { code: string; setType: string | null };
  },
>(rows: T[], pastedName: string) {
  const named = rows.filter((row) => namesMatch(row.name, pastedName));
  const pool = named.length > 0 ? named : rows;
  const ranked = sortPrintings(pool);
  const core = ranked.filter((row) => setRank(row.set.code, row.set.setType, row.promo) <= 1);
  const rest = ranked.filter((row) => setRank(row.set.code, row.set.setType, row.promo) > 1);
  return [...core, ...rest];
}

async function loadPrintings(
  name: string,
  setCode?: string,
  collectorNumber?: string,
  finish?: Finish,
) {
  let useSet = setCode;
  let useNumber = collectorNumber;

  if (setCode && collectorNumber) {
    try {
      const remote = await scryfall.getPrinting(setCode, collectorNumber, "en");
      await scryfall.synchronizePrintings([remote]);
    } catch {
      // Fall through to a local / name search.
    }
    const byNumber = await db.cardPrinting.findMany({
      where: {
        digital: false,
        collectorNumber,
        set: { code: { equals: setCode, mode: "insensitive" } },
      },
      include: { set: true },
      take: 4,
    });
    const named = byNumber.filter(
      (printing) => namesMatch(printing.name, name) && hasFinish(printing, finish),
    );
    if (named.length > 0) return named;
    useNumber = undefined;
  }

  const quoted = name.replaceAll('"', "");
  const query = useSet
    ? `!"${quoted}" set:${useSet} game:paper${finishQuery(finish)}`
    : `!"${quoted}" game:paper${finishQuery(finish)}`;
  try {
    const remote = await scryfall.searchPrintings(query);
    await scryfall.synchronizePrintings(remote);
  } catch {
    // Local matches may still be enough to offer a choice.
  }

  const setFilter = useSet
    ? { set: { code: { equals: useSet, mode: "insensitive" as const } } }
    : {};
  const numberFilter = useNumber ? { collectorNumber: useNumber } : {};
  const restrictFinish = finish === "FOIL" || finish === "ETCHED";
  const finishFilter = restrictFinish ? { finishes: { has: finish } } : {};

  const nameFilter = {
    OR: [
      { name: { equals: name, mode: "insensitive" as const } },
      { card: { name: { equals: name, mode: "insensitive" as const } } },
    ],
  };

  const exact = await db.cardPrinting.findMany({
    where: {
      digital: false,
      ...setFilter,
      ...numberFilter,
      ...finishFilter,
      ...nameFilter,
    },
    include: { set: true },
  });
  const exactMatches = restrictFinish
    ? exact.filter((printing) => hasFinish(printing, finish))
    : exact;
  if (exactMatches.length > 0) return pickCandidates(exactMatches, name);

  const contains = await db.cardPrinting.findMany({
    where: {
      digital: false,
      ...setFilter,
      ...numberFilter,
      ...finishFilter,
      name: { contains: name, mode: "insensitive" },
    },
    include: { set: true },
  });
  const containsMatches = restrictFinish
    ? contains.filter((printing) => hasFinish(printing, finish))
    : contains;
  if (containsMatches.length > 0) return pickCandidates(containsMatches, name);

  try {
    const remote = await scryfall.searchPrintings(
      `!"${quoted}" game:paper${finishQuery(finish)}`,
    );
    await scryfall.synchronizePrintings(remote);
  } catch {
    return [];
  }

  const fallback = await db.cardPrinting.findMany({
    where: {
      digital: false,
      ...finishFilter,
      ...nameFilter,
    },
    include: { set: true },
  });
  return pickCandidates(
    restrictFinish ? fallback.filter((printing) => hasFinish(printing, finish)) : fallback,
    name,
  );
}

function mergeImportRows(rows: CsvInventoryRow[]) {
  const merged = new Map<string, CsvInventoryRow>();
  const order: string[] = [];
  for (const row of rows) {
    const key = [
      row.cardName.toLowerCase(),
      row.setCode.trim().toLowerCase(),
      row.collectorNumber.trim().toLowerCase(),
      row.finish,
      row.condition,
      row.language,
    ].join("|");
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      continue;
    }
    merged.set(key, { ...row });
    order.push(key);
  }
  return order.map((key) => merged.get(key)!);
}

function hintFor(row: CsvInventoryRow) {
  if (row.setCode && row.collectorNumber) {
    return `${row.setCode.toUpperCase()} #${row.collectorNumber}`;
  }
  if (row.setCode) return row.setCode.toUpperCase();
  return row.cardName;
}

export async function resolveImportLines(rows: CsvInventoryRow[]): Promise<{
  recognized: RecognizedImportRow[];
  choices: ImportChoice[];
  unresolved: Array<{ row: number; cardName: string; printing: string }>;
  duplicates: number;
}> {
  const recognized: RecognizedImportRow[] = [];
  const choices: ImportChoice[] = [];
  const unresolved: Array<{ row: number; cardName: string; printing: string }> = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const cache = new Map<string, Awaited<ReturnType<typeof loadPrintings>>>();

  for (const row of mergeImportRows(rows)) {
    const setCode = row.setCode.trim() || undefined;
    const collectorNumber = row.collectorNumber.trim() || undefined;
    const cacheKey = `${row.cardName.toLowerCase()}|${setCode ?? ""}|${collectorNumber ?? ""}|${row.finish}`;
    let printings = cache.get(cacheKey);
    if (!printings) {
      printings = await loadPrintings(row.cardName, setCode, collectorNumber, row.finish);
      cache.set(cacheKey, printings);
    }

    const candidates = printings.map(asCandidate);
    const named = candidates.filter((candidate) => namesMatch(candidate.name, row.cardName));
    const pool = named.length > 0 ? named : [];
    if (pool.length === 0) {
      unresolved.push({
        row: row.row,
        cardName: row.cardName,
        printing: hintFor(row),
      });
      continue;
    }

    const exact =
      setCode && collectorNumber
        ? pool.find(
            (candidate) =>
              candidate.setCode.toLowerCase() === setCode.toLowerCase() &&
              candidate.collectorNumber.toLowerCase() === collectorNumber.toLowerCase(),
          )
        : undefined;
    if (pool.length === 1 || exact) {
      const pick = exact ?? pool[0];
      const key = `${pick.printingId}:${row.finish}:${row.condition}:${row.language}`;
      if (seen.has(key)) duplicates += 1;
      seen.add(key);
      recognized.push({
        row: row.row,
        printingId: pick.printingId,
        cardName: pick.name,
        setCode: pick.setCode,
        setName: pick.setName,
        collectorNumber: pick.collectorNumber,
        quantity: row.quantity,
        condition: row.condition,
        finish: row.finish,
        language: row.language,
        purchasePrice: row.purchasePrice,
        storageLocation: row.storageLocation,
        imageSmallUrl: pick.imageSmallUrl,
      });
      continue;
    }

    choices.push({
      row: row.row,
      cardName: row.cardName,
      quantity: row.quantity,
      condition: row.condition,
      finish: row.finish,
      language: row.language,
      purchasePrice: row.purchasePrice,
      storageLocation: row.storageLocation,
      hint: hintFor(row),
      candidates: pool,
    });
  }

  return { recognized, choices, unresolved, duplicates };
}
