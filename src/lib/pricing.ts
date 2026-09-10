import { Currency, PriceProvider } from "@prisma/client";
import { usdCadRate } from "@/lib/fx";

/** Scryfall stores USD and EUR. CAD is converted from USD at read time. */
export function storedMarketCurrency(preferred: Currency): Currency {
  return preferred === Currency.CAD ? Currency.USD : preferred;
}

export function scryfallPriceWhere(preferred: Currency) {
  return {
    provider: PriceProvider.SCRYFALL,
    currency: storedMarketCurrency(preferred),
  } as const;
}

export async function displayFx(preferred: Currency): Promise<number> {
  if (preferred !== Currency.CAD) return 1;
  return usdCadRate();
}

export function toDisplayMarket(
  market: { toNumber(): number } | number | null | undefined,
  fx: number,
): number | null {
  if (market == null) return null;
  const value = typeof market === "number" ? market : market.toNumber();
  return value * fx;
}
