import { parse } from "csv-parse/sync";
import { Condition, Finish } from "@prisma/client";
import { z } from "zod";

const rowSchema = z.object({
  card_name: z.string().trim().min(1),
  set_code: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  collector_number: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  quantity: z.coerce.number().int().min(1).max(9999).default(1),
  condition: z.string().trim().default("near mint"),
  finish: z.string().trim().default("nonfoil"),
  language: z.string().trim().default("en"),
  purchase_price: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  storage_location: z.string().trim().optional(),
});

const conditions: Record<string, Condition> = {
  nm: Condition.NEAR_MINT,
  "near mint": Condition.NEAR_MINT,
  lp: Condition.LIGHTLY_PLAYED,
  "lightly played": Condition.LIGHTLY_PLAYED,
  mp: Condition.MODERATELY_PLAYED,
  "moderately played": Condition.MODERATELY_PLAYED,
  hp: Condition.HEAVILY_PLAYED,
  "heavily played": Condition.HEAVILY_PLAYED,
  damaged: Condition.DAMAGED,
};

const finishes: Record<string, Finish> = {
  nonfoil: Finish.NONFOIL,
  regular: Finish.NONFOIL,
  foil: Finish.FOIL,
  etched: Finish.ETCHED,
  "etched foil": Finish.ETCHED,
};

export type CsvInventoryRow = {
  row: number;
  cardName: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  language: string;
  purchasePrice?: number;
  storageLocation?: string;
};

export type CsvParseResult = {
  valid: CsvInventoryRow[];
  invalid: Array<{ row: number; message: string }>;
};

export function parseInventoryCsv(csv: string): CsvParseResult {
  let records: Record<string, string>[];
  try {
    records = parse(csv, {
      columns: (headers: string[]) => headers.map((header) => header.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (error) {
    return { valid: [], invalid: [{ row: 1, message: error instanceof Error ? error.message : "Invalid CSV" }] };
  }

  const valid: CsvInventoryRow[] = [];
  const invalid: CsvParseResult["invalid"] = [];
  records.forEach((record, index) => {
    const row = index + 2;
    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      invalid.push({ row, message: parsed.error.issues[0]?.message ?? "Invalid row" });
      return;
    }
    const condition = conditions[parsed.data.condition.toLowerCase()];
    const finish = finishes[parsed.data.finish.toLowerCase()];
    if (!condition || !finish) {
      invalid.push({ row, message: "Unsupported condition or finish" });
      return;
    }
    valid.push({
      row,
      cardName: parsed.data.card_name,
      setCode: parsed.data.set_code?.toLowerCase() ?? "",
      collectorNumber: parsed.data.collector_number ?? "",
      quantity: parsed.data.quantity,
      condition,
      finish,
      language: parsed.data.language,
      purchasePrice: parsed.data.purchase_price,
      storageLocation: parsed.data.storage_location,
    });
  });
  return { valid, invalid };
}
