export const DECK_FORMATS = [
  "commander",
  "standard",
  "modern",
  "legacy",
  "vintage",
  "pioneer",
  "pauper",
  "draft",
] as const;

export type DeckFormat = (typeof DECK_FORMATS)[number];

/** Formats that use a command zone (Commander / EDH). Constructed and Limited do not. */
const COMMANDER_FORMATS = new Set<string>(["commander"]);

export function deckFormatAllowsCommander(format: string | null | undefined) {
  return Boolean(format && COMMANDER_FORMATS.has(format));
}
