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
  costedQuantity: number;
  costedMarketValue: number | null;
  costCoverage: number | null;
};

/** Share of priced market that also has a logged paid price. */
export const COST_COVERAGE_MIN = 0.85;

export function calculatePortfolio(lines: ValuationLine[]): PortfolioTotals {
  let marketValue = 0;
  let costBasis = 0;
  let pricedQuantity = 0;
  let totalQuantity = 0;
  let costedQuantity = 0;
  let costedMarket = 0;
  let pairedCost = 0;
  let pairedQuantity = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new Error("Quantity must be a non-negative integer");
    }

    totalQuantity += line.quantity;
    const paid = line.purchasePrice;
    if (paid != null) {
      costBasis += paid * line.quantity;
      costedQuantity += line.quantity;
    }

    if (line.marketPrice !== null) {
      marketValue += line.marketPrice * line.quantity;
      pricedQuantity += line.quantity;
      if (paid != null) {
        costedMarket += line.marketPrice * line.quantity;
        pairedCost += paid * line.quantity;
        pairedQuantity += line.quantity;
      }
    }
  }

  const hasPrices = pricedQuantity > 0;
  const hasPaired = pairedQuantity > 0;
  return {
    marketValue: hasPrices ? marketValue : null,
    costBasis,
    unrealizedGain: hasPaired ? costedMarket - pairedCost : null,
    pricedQuantity,
    totalQuantity,
    costedQuantity,
    costedMarketValue: hasPaired ? costedMarket : null,
    costCoverage: hasPrices && marketValue > 0 ? costedMarket / marketValue : null,
  };
}

export function displayCostBasis(totals: PortfolioTotals) {
  return totals.costedQuantity > 0 ? totals.costBasis : null;
}

export function canShowUnrealized(totals: PortfolioTotals) {
  return (
    totals.unrealizedGain !== null &&
    totals.costCoverage !== null &&
    totals.costCoverage >= COST_COVERAGE_MIN
  );
}

export function unrealizedDisplay(
  totals: PortfolioTotals,
  format: (value: number) => string,
  labels: { unrealized: string; addPaid: string },
): { text: string; tone: "up" | "down" | "muted" } {
  if (canShowUnrealized(totals) && totals.unrealizedGain !== null) {
    const up = totals.unrealizedGain >= 0;
    return {
      text: `${up ? "+" : ""}${format(totals.unrealizedGain)} ${labels.unrealized}`,
      tone: up ? "up" : "down",
    };
  }
  if (totals.marketValue != null) {
    return { text: labels.addPaid, tone: "muted" };
  }
  return { text: "—", tone: "muted" };
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
