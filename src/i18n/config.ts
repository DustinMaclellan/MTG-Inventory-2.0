export const LOCALES = ["en", "fr"] as const;
export type AppLocale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "fr";
}

export function interpolate(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function dateLocale(locale: AppLocale) {
  return locale === "fr" ? "fr-CA" : "en-US";
}

export function pickPlural(
  count: number,
  one: string,
  many: string,
  extra: Record<string, string | number> = {},
) {
  return interpolate(count === 1 ? one : many, { count, ...extra });
}
