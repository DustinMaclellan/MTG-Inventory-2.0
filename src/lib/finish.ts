import type { Finish } from "@prisma/client";

/** If the printing does not come in `requested`, use the first finish it actually has. */
export function coerceFinish(requested: Finish, available: Finish[]): Finish {
  if (available.length === 0) return requested;
  if (available.includes(requested)) return requested;
  return available[0];
}

export function pickFinish(options: Finish[], preferred: Finish): Finish {
  if (options.length === 0) return preferred;
  return options.includes(preferred) ? preferred : options[0];
}

/** Finishes the importer may store for a picked printing. */
export function availableFinishes(
  catalog: Finish[],
  lineFinish: Finish,
  specified: boolean,
): Finish[] {
  if (specified) {
    if (catalog.length === 0 || catalog.includes(lineFinish)) return [lineFinish];
    return catalog;
  }
  if (catalog.length > 0) return catalog;
  return [lineFinish];
}
