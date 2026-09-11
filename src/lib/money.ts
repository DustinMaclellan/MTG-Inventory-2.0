import type { AppLocale } from "@/i18n/config";

export type ValuationLine = {
  quantity: number;
  purchasePrice: number | null;
  marketPrice: number | null;
};

export type PortfolioTotals = {
  marketValue: number | null;
  costBasis: number;
  unrealizedGain: number | null;
  pricedQuantity: number;
  totalQuantity: number;
};

export function calculatePortfolio(lines: ValuationLine[]): PortfolioTotals {
  let marketValue = 0;
  let costBasis = 0;
  let pricedQuantity = 0;
  let totalQuantity = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new Error("Quantity must be a non-negative integer");
    }

    totalQuantity += line.quantity;
    costBasis += (line.purchasePrice ?? 0) * line.quantity;

    if (line.marketPrice !== null) {
      marketValue += line.marketPrice * line.quantity;
      pricedQuantity += line.quantity;
    }
  }

  const hasPrices = pricedQuantity > 0;
  return {
    marketValue: hasPrices ? marketValue : null,
    costBasis,
    unrealizedGain: hasPrices ? marketValue - costBasis : null,
    pricedQuantity,
    totalQuantity,
  };
}

export type DisplayCurrency = "USD" | "CAD" | "EUR";

/** USD→CAD and USD→EUR multipliers. */
export type UsdFx = { cad: number; eur: number };

export function convertMoney(
  amount: number,
  from: DisplayCurrency,
  to: DisplayCurrency,
  fx: UsdFx,
): number {
  if (from === to) return amount;
  const cad = fx.cad > 0 ? fx.cad : 1;
  const eur = fx.eur > 0 ? fx.eur : 1;
  const usd =
    from === "USD" ? amount : from === "CAD" ? amount / cad : amount / eur;
  if (to === "USD") return usd;
  if (to === "CAD") return usd * cad;
  return usd * eur;
}

export function toDisplayPaid(
  amount: number | null,
  from: DisplayCurrency,
  to: DisplayCurrency,
  fx: UsdFx,
): number | null {
  if (amount == null) return null;
  return convertMoney(amount, from, to, fx);
}

export function formatMoney(
  value: number | null,
  currency: DisplayCurrency = "USD",
  locale: AppLocale = "en",
) {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
