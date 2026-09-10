import { Condition, Finish } from "@prisma/client";
import { parseInventoryCsv, type CsvInventoryRow, type CsvParseResult } from "./csv";

const SECTION =
  /^(deck|sideboard|maybeboard|commander|companion|mainboard|maindeck|main|about|tokens?|creatures?|instants?|sorceries|artifacts?|enchantments?|planeswalkers?|lands?|other|notes?)$/i;
const SEPARATOR = /^[-*=_~.·—–]{2,}$/;
const LONE_COUNT = /^\d+x?$/i;

export function looksLikeCsv(text: string) {
  const first = text.trim().split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  return first.includes("card_name") && first.includes(",");
}

export function parseImportPaste(text: string): CsvParseResult {
  if (looksLikeCsv(text)) return parseInventoryCsv(text);
  return parseDecklist(text);
}

export function parseDecklist(text: string): CsvParseResult {
  const valid: CsvInventoryRow[] = [];
  const invalid: CsvParseResult["invalid"] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  lines.forEach((raw, index) => {
    const row = index + 1;
    const { finish, line: marked } = extractFinish(raw);
    const line = cleanDecklistLine(marked);
    if (!line) return;
    if (line.startsWith("#") || line.startsWith("//")) return;
    if (/^https?:\/\//i.test(line)) return;
    if (SECTION.test(line.replace(/:$/, ""))) return;
    if (SEPARATOR.test(line) || LONE_COUNT.test(line)) return;
    if (!/[a-zA-Z]{2,}/.test(line)) return;

    const parsed = parseDecklistLine(line);
    if (!parsed) {
      if (/[a-zA-Z]{3,}/.test(line)) {
        invalid.push({ row, message: "Could not read this line" });
      }
      return;
    }
    if (SECTION.test(parsed.cardName.replace(/:$/, ""))) return;
    valid.push({
      row,
      cardName: parsed.cardName,
      setCode: parsed.setCode ?? "",
      collectorNumber: parsed.collectorNumber ?? "",
      quantity: parsed.quantity,
      condition: Condition.NEAR_MINT,
      finish,
      language: "en",
    });
  });

  return { valid, invalid };
}

function extractFinish(raw: string): { finish: Finish; line: string } {
  let line = raw.replace(/\s*\*F\*/gi, " ").replace(/\s*\*FOIL\*/gi, " ");
  const etched = /(?:\s+|\s*[(\[]\s*)(?:etched(?:\s+foil)?|etch)(?:\s*[)\]])?\s*$/i;
  const nonfoil = /(?:\s+|\s*[(\[]\s*)(?:nonfoil|non-foil|regular)(?:\s*[)\]])?\s*$/i;
  const foil = /(?:\s+|\s*[(\[]\s*)foil(?:\s*[)\]])?\s*$/i;

  if (etched.test(line)) {
    return { finish: Finish.ETCHED, line: line.replace(etched, "").trim() };
  }
  if (nonfoil.test(line)) {
    return { finish: Finish.NONFOIL, line: line.replace(nonfoil, "").trim() };
  }
  if (foil.test(line) || /\*F\*/i.test(raw) || /\*FOIL\*/i.test(raw)) {
    return { finish: Finish.FOIL, line: line.replace(foil, "").trim() };
  }
  return { finish: Finish.NONFOIL, line };
}

function cleanDecklistLine(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^SB:\s*/i, "")
    .replace(/\s+#\S+$/g, "")
    .replace(/\s+\(foil\)$/i, "")
    .replace(/\s+\*F\*$/i, "")
    .replace(/\s+\*$/g, "")
    .trim();
}

function parseDecklistLine(line: string) {
  const body = line;

  const arena = body.match(
    /^(?:(\d+)x?\s+)?(.+?)\s+\(([A-Za-z0-9]{2,8})\)(?:\s+([0-9A-Za-z-]+))?\s*$/i,
  );
  if (arena) {
    const cardName = arena[2].trim();
    if (!cardName) return null;
    return {
      quantity: arena[1] ? Number(arena[1]) : 1,
      cardName,
      setCode: arena[3].toLowerCase(),
      collectorNumber: arena[4] || undefined,
      foil: false,
    };
  }

  const withQty = body.match(/^(\d+)x?\s+(.+)$/);
  if (withQty) {
    const cardName = withQty[2].trim();
    if (!cardName) return null;
    const quantity = Number(withQty[1]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
    return { quantity, cardName, foil: false };
  }

  if (body.length < 2 || LONE_COUNT.test(body)) return null;
  return { quantity: 1, cardName: body, foil: false };
}
