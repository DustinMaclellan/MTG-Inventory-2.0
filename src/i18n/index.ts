import { en } from "./en";
import { fr } from "./fr";
import type { AppLocale } from "./config";
import type { Messages } from "./types";

export type { Messages } from "./types";
export type { AppLocale } from "./config";
export { isLocale, interpolate, dateLocale, pickPlural, LOCALES } from "./config";
export { en, fr };

export const dictionaries: Record<AppLocale, Messages> = { en, fr };

export function getMessages(locale: AppLocale): Messages {
  return dictionaries[locale];
}
