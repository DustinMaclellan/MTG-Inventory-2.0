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

import type { AppLocale } from "@/i18n/config";

export function formatMoney(
  value: number | null,
  currency: "USD" | "CAD" | "EUR" = "USD",
  locale: AppLocale = "en",
) {
  if (value === null) return locale === "fr" ? "Prix indisponible" : "Pricing unavailable";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
