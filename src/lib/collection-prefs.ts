export const LOTS_PER_PAGE = [25, 50, 100] as const;
export type LotsPerPage = (typeof LOTS_PER_PAGE)[number];

export function isLotsPerPage(value: unknown): value is LotsPerPage {
  return LOTS_PER_PAGE.includes(Number(value) as LotsPerPage);
}

export function lotsPerPageFor(value: unknown): LotsPerPage {
  return isLotsPerPage(value) ? value : 25;
}
