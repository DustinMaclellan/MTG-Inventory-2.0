import { Currency, Finish, PriceProvider } from "@prisma/client";
import { usdCadRate } from "./fx";

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

function rawNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function rawMarket(rawPrices: unknown, finish: Finish, storedCurrency: Currency) {
  const raw =
    rawPrices && typeof rawPrices === "object" && !Array.isArray(rawPrices)
      ? (rawPrices as Record<string, unknown>)
      : {};
  const useEur = storedCurrency === Currency.EUR;
  if (finish === Finish.FOIL) return rawNumber(useEur ? raw.eur_foil : raw.usd_foil);
  if (finish === Finish.ETCHED) return rawNumber(raw.usd_etched);
  return rawNumber(useEur ? raw.eur : raw.usd);
}

/** Live market for one finish: CurrentPrice row, else Scryfall JSON stored on the printing. */
export function marketForFinish(
  finish: Finish,
  currentPrices: Array<{
    finish: Finish;
    currency?: Currency;
    market: { toNumber(): number } | number | null;
  }>,
  rawPrices: unknown,
  storedCurrency: Currency,
  fx: number,
): number | null {
  const row = currentPrices.find(
    (price) => price.finish === finish && (price.currency == null || price.currency === storedCurrency),
  );
  const fromTable = toDisplayMarket(row?.market, fx);
  if (fromTable != null) return fromTable;
  return toDisplayMarket(rawMarket(rawPrices, finish, storedCurrency), fx);
}
