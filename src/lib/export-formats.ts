import { Condition, Finish } from "@prisma/client";

export const EXPORT_FORMATS = [
  "moxfield",
  "archidekt",
  "manabox",
  "deckbox",
  "tcgplayer",
  "mtggoldfish",
  "arena",
  "mystic-ledger",
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

export type ExportRow = {
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  condition: Condition | null;
  finish: Finish | null;
  language: string;
  purchasePrice: string | null;
  marketPrice: string | null;
  currentValue: string | null;
  storageLocation: string | null;
  purchaseDate: string | null;
  notes: string | null;
  scryfallId: string | null;
  tcgplayerId: number | null;
  rarity: string | null;
  commander: boolean;
  updatedAt: string | null;
};

export type SerializedExport = {
  body: string;
  contentType: string;
  extension: "csv" | "txt";
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  ru: "Russian",
  zhs: "Simplified Chinese",
  zht: "Traditional Chinese",
  ph: "Phyrexian",
};

const MoxfieldCondition: Record<Condition, string> = {
  NEAR_MINT: "Near Mint",
  LIGHTLY_PLAYED: "Lightly Played",
  MODERATELY_PLAYED: "Played",
  HEAVILY_PLAYED: "Heavily Played",
  DAMAGED: "Damaged",
};

const DeckboxCondition: Record<Condition, string> = {
  NEAR_MINT: "Near Mint",
  LIGHTLY_PLAYED: "Good (Lightly Played)",
  MODERATELY_PLAYED: "Played",
  HEAVILY_PLAYED: "Heavily Played",
  DAMAGED: "Damaged",
};

const ManaBoxCondition: Record<Condition, string> = {
  NEAR_MINT: "near_mint",
  LIGHTLY_PLAYED: "lightly_played",
  MODERATELY_PLAYED: "moderately_played",
  HEAVILY_PLAYED: "heavily_played",
  DAMAGED: "poor",
};

function languageName(code: string) {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvFile(headers: string[], rows: unknown[][]) {
  return [headers.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}

function moxfieldFoil(finish: Finish | null) {
  if (finish === Finish.FOIL) return "foil";
  if (finish === Finish.ETCHED) return "etched";
  return "";
}

function arenaLine(row: ExportRow) {
  const set = row.setCode.trim().toUpperCase();
  const number = row.collectorNumber.trim();
  const foil = row.finish === Finish.FOIL || row.finish === Finish.ETCHED ? " *F*" : "";
  if (set && number) return `${row.quantity} ${row.name} (${set}) ${number}${foil}`;
  if (set) return `${row.quantity} ${row.name} (${set})${foil}`;
  return `${row.quantity} ${row.name}${foil}`;
}

function asCsv(headers: string[], rows: unknown[][]): SerializedExport {
  return {
    body: csvFile(headers, rows),
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
  };
}

function serializeMoxfield(rows: ExportRow[]) {
  return asCsv(
    [
      "Count",
      "Tradelist Count",
      "Name",
      "Edition",
      "Condition",
      "Language",
      "Foil",
      "Tags",
      "Last Modified",
      "Collector Number",
      "Alter",
      "Proxy",
      "Purchase Price",
    ],
    rows.map((row) => [
      row.quantity,
      "",
      row.name,
      row.setCode.toLowerCase(),
      row.condition ? MoxfieldCondition[row.condition] : "",
      languageName(row.language || "en"),
      moxfieldFoil(row.finish),
      row.storageLocation ?? "",
      row.updatedAt ?? "",
      row.collectorNumber,
      "",
      "",
      row.purchasePrice ?? "",
    ]),
  );
}

function serializeArchidekt(rows: ExportRow[]) {
  return asCsv(
    [
      "Quantity",
      "Name",
      "Set Code",
      "Set Name",
      "Collector Number",
      "Foil",
      "Condition",
      "Language",
      "Scryfall ID",
      "Purchase Price",
    ],
    rows.map((row) => [
      row.quantity,
      row.name,
      row.setCode.toLowerCase(),
      row.setName,
      row.collectorNumber,
      moxfieldFoil(row.finish),
      row.condition ? MoxfieldCondition[row.condition] : "",
      languageName(row.language || "en"),
      row.scryfallId ?? "",
      row.purchasePrice ?? "",
    ]),
  );
}

function serializeManaBox(rows: ExportRow[]) {
  return asCsv(
    [
      "Name",
      "Set code",
      "Set name",
      "Collector number",
      "Foil",
      "Rarity",
      "Quantity",
      "Scryfall ID",
      "Purchase price",
      "Misprint",
      "Altered",
      "Condition",
      "Language",
      "Purchase price currency",
    ],
    rows.map((row) => [
      row.name,
      row.setCode.toLowerCase(),
      row.setName,
      row.collectorNumber,
      moxfieldFoil(row.finish) || "normal",
      row.rarity ?? "",
      row.quantity,
      row.scryfallId ?? "",
      row.purchasePrice ?? "",
      "",
      "",
      row.condition ? ManaBoxCondition[row.condition] : "near_mint",
      (row.language || "en").toLowerCase(),
      "",
    ]),
  );
}

function serializeDeckbox(rows: ExportRow[]) {
  return asCsv(
    [
      "Count",
      "Tradelist Count",
      "Name",
      "Edition",
      "Card Number",
      "Condition",
      "Language",
      "Foil",
      "Signed",
      "Artist Proof",
      "Altered Art",
      "Misprint",
      "Promo",
      "Textless",
      "My Price",
    ],
    rows.map((row) => [
      row.quantity,
      "",
      row.name,
      row.setName,
      row.collectorNumber,
      row.condition ? DeckboxCondition[row.condition] : "Near Mint",
      languageName(row.language || "en"),
      row.finish === Finish.FOIL || row.finish === Finish.ETCHED ? "foil" : "",
      "",
      "",
      "",
      "",
      "",
      "",
      row.purchasePrice ?? "",
    ]),
  );
}

function serializeTcgplayer(rows: ExportRow[]) {
  return asCsv(
    [
      "Quantity",
      "Name",
      "Simple Name",
      "Set",
      "Card Number",
      "Set Code",
      "Printing",
      "Condition",
      "Language",
      "Rarity",
      "Product ID",
      "SKU",
    ],
    rows.map((row) => [
      row.quantity,
      row.name,
      row.name,
      row.setName,
      row.collectorNumber,
      row.setCode.toUpperCase(),
      row.finish === Finish.FOIL || row.finish === Finish.ETCHED ? "Foil" : "Normal",
      row.condition ? MoxfieldCondition[row.condition] : "Near Mint",
      languageName(row.language || "en"),
      row.rarity ? row.rarity.replace(/^\w/, (letter) => letter.toUpperCase()) : "",
      row.tcgplayerId ?? "",
      "",
    ]),
  );
}

function serializeMtgGoldfish(rows: ExportRow[]) {
  return asCsv(
    ["Card", "Set ID", "Set Name", "Quantity", "Foil", "Variation"],
    rows.map((row) => [
      row.name,
      row.setCode.toUpperCase(),
      row.setName,
      row.quantity,
      row.finish === Finish.FOIL || row.finish === Finish.ETCHED ? "FOIL" : "",
      "",
    ]),
  );
}

function serializeMysticLedger(rows: ExportRow[]) {
  return asCsv(
    [
      "card_name",
      "set_name",
      "set_code",
      "collector_number",
      "quantity",
      "condition",
      "finish",
      "language",
      "purchase_price",
      "market_price",
      "current_value",
      "storage_location",
      "purchase_date",
    ],
    rows.map((row) => [
      row.name,
      row.setName,
      row.setCode,
      row.collectorNumber,
      row.quantity,
      row.condition ?? "",
      row.finish ?? "",
      row.language,
      row.purchasePrice ?? "",
      row.marketPrice ?? "",
      row.currentValue ?? "",
      row.storageLocation ?? "",
      row.purchaseDate ?? "",
    ]),
  );
}

function serializeArena(rows: ExportRow[]): SerializedExport {
  const commanders = rows.filter((row) => row.commander);
  const main = rows.filter((row) => !row.commander);
  const lines = [
    ...main.map(arenaLine),
    ...(commanders.length
      ? ["", "Commander", ...commanders.map(arenaLine)]
      : []),
  ];
  return {
    body: lines.join("\n"),
    contentType: "text/plain; charset=utf-8",
    extension: "txt",
  };
}

export function serializeExport(format: ExportFormat, rows: ExportRow[]): SerializedExport {
  switch (format) {
    case "moxfield":
      return serializeMoxfield(rows);
    case "archidekt":
      return serializeArchidekt(rows);
    case "manabox":
      return serializeManaBox(rows);
    case "deckbox":
      return serializeDeckbox(rows);
    case "tcgplayer":
      return serializeTcgplayer(rows);
    case "mtggoldfish":
      return serializeMtgGoldfish(rows);
    case "arena":
      return serializeArena(rows);
    case "mystic-ledger":
      return serializeMysticLedger(rows);
  }
}
