import { parse } from "csv-parse/sync";
import { Condition, Finish } from "@prisma/client";

const conditions: Record<string, Condition> = {
  nm: Condition.NEAR_MINT,
  near_mint: Condition.NEAR_MINT,
  "near mint": Condition.NEAR_MINT,
  lp: Condition.LIGHTLY_PLAYED,
  lightly_played: Condition.LIGHTLY_PLAYED,
  "lightly played": Condition.LIGHTLY_PLAYED,
  "good (lightly played)": Condition.LIGHTLY_PLAYED,
  good: Condition.LIGHTLY_PLAYED,
  mp: Condition.MODERATELY_PLAYED,
  moderately_played: Condition.MODERATELY_PLAYED,
  "moderately played": Condition.MODERATELY_PLAYED,
  played: Condition.MODERATELY_PLAYED,
  hp: Condition.HEAVILY_PLAYED,
  heavily_played: Condition.HEAVILY_PLAYED,
  "heavily played": Condition.HEAVILY_PLAYED,
  damaged: Condition.DAMAGED,
  poor: Condition.DAMAGED,
};

const finishes: Record<string, Finish> = {
  "": Finish.NONFOIL,
  normal: Finish.NONFOIL,
  nonfoil: Finish.NONFOIL,
  "non-foil": Finish.NONFOIL,
  regular: Finish.NONFOIL,
  foil: Finish.FOIL,
  etched: Finish.ETCHED,
  "etched foil": Finish.ETCHED,
};

const languages: Record<string, string> = {
  en: "en",
  english: "en",
  fr: "fr",
  french: "fr",
  de: "de",
  german: "de",
  es: "es",
  spanish: "es",
  it: "it",
  italian: "it",
  ja: "ja",
  japanese: "ja",
  ko: "ko",
  korean: "ko",
  pt: "pt",
  portuguese: "pt",
  ru: "ru",
  russian: "ru",
  zhs: "zhs",
  "simplified chinese": "zhs",
  zht: "zht",
  "traditional chinese": "zht",
  ph: "ph",
  phyrexian: "ph",
};

export type CsvInventoryRow = {
  row: number;
  cardName: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  finishSpecified?: boolean;
  language: string;
  purchasePrice?: number;
  storageLocation?: string;
  setName?: string;
  scryfallId?: string;
  source?: string;
};

export type ImportInvalidReason =
  | "unreadable"
  | "quantity"
  | "emptyName"
  | "csv"
  | "conditionFinish";

export type CsvParseResult = {
  valid: CsvInventoryRow[];
  invalid: Array<{ row: number; reason: ImportInvalidReason; line?: string }>;
};

type FieldMap = {
  name: string[];
  quantity: string[];
  setCode: string[];
  setName: string[];
  collectorNumber: string[];
  condition: string[];
  finish: string[];
  language: string[];
  purchasePrice: string[];
  storageLocation: string[];
  scryfallId: string[];
};

const LEDGER: FieldMap = {
  name: ["card_name"],
  quantity: ["quantity"],
  setCode: ["set_code"],
  setName: ["set_name"],
  collectorNumber: ["collector_number"],
  condition: ["condition"],
  finish: ["finish"],
  language: ["language"],
  purchasePrice: ["purchase_price"],
  storageLocation: ["storage_location"],
  scryfallId: [],
};

const MOXFIELD: FieldMap = {
  name: ["name"],
  quantity: ["count"],
  setCode: ["edition"],
  setName: [],
  collectorNumber: ["collector number"],
  condition: ["condition"],
  finish: ["foil"],
  language: ["language"],
  purchasePrice: ["purchase price"],
  storageLocation: ["tags"],
  scryfallId: [],
};

const ARCHIDEKT: FieldMap = {
  name: ["name"],
  quantity: ["quantity"],
  setCode: ["set code"],
  setName: ["set name"],
  collectorNumber: ["collector number"],
  condition: ["condition"],
  finish: ["foil"],
  language: ["language"],
  purchasePrice: ["purchase price"],
  storageLocation: [],
  scryfallId: ["scryfall id"],
};

const MANABOX: FieldMap = {
  name: ["name"],
  quantity: ["quantity"],
  setCode: ["set code"],
  setName: ["set name"],
  collectorNumber: ["collector number"],
  condition: ["condition"],
  finish: ["foil"],
  language: ["language"],
  purchasePrice: ["purchase price"],
  storageLocation: [],
  scryfallId: ["scryfall id"],
};

const DECKBOX: FieldMap = {
  name: ["name"],
  quantity: ["count"],
  setCode: [],
  setName: ["edition"],
  collectorNumber: ["card number"],
  condition: ["condition"],
  finish: ["foil"],
  language: ["language"],
  purchasePrice: ["my price"],
  storageLocation: [],
  scryfallId: [],
};

const TCGPLAYER: FieldMap = {
  name: ["name", "simple name"],
  quantity: ["quantity"],
  setCode: ["set code"],
  setName: ["set"],
  collectorNumber: ["card number"],
  condition: ["condition"],
  finish: ["printing"],
  language: ["language"],
  purchasePrice: [],
  storageLocation: [],
  scryfallId: [],
};

const GOLDFISH: FieldMap = {
  name: ["card"],
  quantity: ["quantity"],
  setCode: ["set id"],
  setName: ["set name"],
  collectorNumber: ["variation"],
  condition: [],
  finish: ["foil"],
  language: [],
  purchasePrice: [],
  storageLocation: [],
  scryfallId: [],
};

const GENERIC: FieldMap = {
  name: ["card_name", "name", "card", "simple name"],
  quantity: ["quantity", "count", "qty"],
  setCode: ["set_code", "set code", "set id", "edition"],
  setName: ["set_name", "set name", "set", "edition"],
  collectorNumber: ["collector_number", "collector number", "card number", "variation"],
  condition: ["condition"],
  finish: ["finish", "foil", "printing"],
  language: ["language"],
  purchasePrice: ["purchase_price", "purchase price", "my price"],
  storageLocation: ["storage_location", "tags"],
  scryfallId: ["scryfall id", "scryfall_id"],
};

function headerSet(headers: string[]) {
  return new Set(headers.map((header) => header.trim().toLowerCase()));
}

export function detectCsvFormat(headers: string[]): FieldMap | null {
  const headersSet = headerSet(headers);
  const has = (...names: string[]) => names.every((name) => headersSet.has(name));
  if (has("card_name")) return LEDGER;
  if (has("simple name") || has("product id")) return TCGPLAYER;
  if (has("purchase price currency") || (has("misprint") && has("collector number"))) return MANABOX;
  if (has("scryfall id") && has("set code") && has("quantity")) return ARCHIDEKT;
  if (has("card") && has("set id")) return GOLDFISH;
  if (has("tradelist count") && has("collector number")) return MOXFIELD;
  if (has("tradelist count") && has("card number")) return DECKBOX;
  if (has("name") || has("card") || has("card_name")) return GENERIC;
  return null;
}

export function looksLikeInventoryCsv(text: string) {
  const first = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/, 1)[0] ?? "";
  if (!first.includes(",")) return false;
  const headers = first.split(",").map((header) => header.trim().replace(/^"|"$/g, ""));
  return detectCsvFormat(headers) !== null;
}

function pick(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value != null && value.trim() !== "") return value.trim();
  }
  return "";
}

function parseQuantity(value: string) {
  if (!value) return 1;
  const quantity = Number(value.replace(/x$/i, ""));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
  return quantity;
}

function parseMoney(value: string) {
  if (!value) return undefined;
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function parseCondition(value: string) {
  if (!value) return Condition.NEAR_MINT;
  return conditions[value.toLowerCase()] ?? Condition.NEAR_MINT;
}

function parseFinish(value: string): { finish: Finish; specified: boolean } {
  const key = value.trim().toLowerCase();
  if (!key) return { finish: Finish.NONFOIL, specified: false };
  return { finish: finishes[key] ?? Finish.NONFOIL, specified: Boolean(finishes[key]) };
}

function parseLanguage(value: string) {
  if (!value) return "en";
  return languages[value.toLowerCase()] ?? value.slice(0, 8).toLowerCase();
}

function parseSetCode(value: string, setName: string) {
  if (value && /^[a-z0-9]{2,8}$/i.test(value)) return value.toLowerCase();
  if (setName && /^[a-z0-9]{2,8}$/i.test(setName)) return setName.toLowerCase();
  return value && value.length <= 8 ? value.toLowerCase() : "";
}

export function parseInventoryCsv(csv: string): CsvParseResult {
  let records: Record<string, string>[];
  let headers: string[] = [];
  try {
    records = parse(csv, {
      columns: (row: string[]) => {
        headers = row.map((header) => header.trim().toLowerCase());
        return headers;
      },
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch {
    return { valid: [], invalid: [{ row: 1, reason: "csv" }] };
  }

  const fields = detectCsvFormat(headers);
  if (!fields) return { valid: [], invalid: [{ row: 1, reason: "csv" }] };

  const valid: CsvInventoryRow[] = [];
  const invalid: CsvParseResult["invalid"] = [];
  records.forEach((record, index) => {
    const row = index + 2;
    const line = Object.values(record).filter(Boolean).join(", ");
    const cardName = pick(record, fields.name);
    if (!cardName) {
      invalid.push({ row, reason: "emptyName", line });
      return;
    }
    const quantity = parseQuantity(pick(record, fields.quantity));
    if (quantity == null) {
      invalid.push({ row, reason: "quantity", line });
      return;
    }
    const setName = pick(record, fields.setName);
    const finishValue = pick(record, fields.finish);
    const { finish, specified } = parseFinish(finishValue);
    valid.push({
      row,
      cardName,
      setCode: parseSetCode(pick(record, fields.setCode), setName),
      collectorNumber: pick(record, fields.collectorNumber),
      quantity,
      condition: parseCondition(pick(record, fields.condition)),
      finish,
      finishSpecified: specified,
      language: parseLanguage(pick(record, fields.language)),
      purchasePrice: parseMoney(pick(record, fields.purchasePrice)),
      storageLocation: pick(record, fields.storageLocation) || undefined,
      setName: setName || undefined,
      scryfallId: pick(record, fields.scryfallId) || undefined,
      source: line,
    });
  });
  return { valid, invalid };
}
