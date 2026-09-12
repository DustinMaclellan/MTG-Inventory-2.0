import { describe, expect, it } from "vitest";
import {
  calculatePortfolio,
  canShowUnrealized,
  convertMoney,
  displayCostBasis,
  toDisplayPaid,
  unrealizedDisplay,
} from "./money";

describe("calculatePortfolio", () => {
  it("calculates quantity-weighted value, cost, and gain when every lot has a cost", () => {
    expect(
      calculatePortfolio([
        { quantity: 2, purchasePrice: 42.5, marketPrice: 61.25 },
        { quantity: 3, purchasePrice: 10, marketPrice: 12 },
      ]),
    ).toEqual({
      marketValue: 158.5,
      costBasis: 115,
      unrealizedGain: 43.5,
      pricedQuantity: 5,
      totalQuantity: 5,
      costedQuantity: 5,
      costedMarketValue: 158.5,
      costCoverage: 1,
    });
  });

  it("keeps an unavailable portfolio distinct from a zero value", () => {
    expect(
      calculatePortfolio([{ quantity: 4, purchasePrice: 2, marketPrice: null }]),
    ).toEqual({
      marketValue: null,
      costBasis: 8,
      unrealizedGain: null,
      pricedQuantity: 0,
      totalQuantity: 4,
      costedQuantity: 4,
      costedMarketValue: null,
      costCoverage: null,
    });
  });

  it("does not treat a missing paid price as zero cost", () => {
    expect(
      calculatePortfolio([{ quantity: 1, purchasePrice: null, marketPrice: 100 }]),
    ).toEqual({
      marketValue: 100,
      costBasis: 0,
      unrealizedGain: null,
      pricedQuantity: 1,
      totalQuantity: 1,
      costedQuantity: 0,
      costedMarketValue: null,
      costCoverage: 0,
    });
  });

  it("measures gain only on lots that have both a cost and a market price", () => {
    expect(
      calculatePortfolio([
        { quantity: 1, purchasePrice: 2, marketPrice: 5 },
        { quantity: 1, purchasePrice: null, marketPrice: 1000 },
      ]),
    ).toEqual({
      marketValue: 1005,
      costBasis: 2,
      unrealizedGain: 3,
      pricedQuantity: 2,
      totalQuantity: 2,
      costedQuantity: 1,
      costedMarketValue: 5,
      costCoverage: 5 / 1005,
    });
  });

  it("counts a logged zero as a real paid price", () => {
    expect(
      calculatePortfolio([{ quantity: 2, purchasePrice: 0, marketPrice: 4 }]),
    ).toMatchObject({
      costBasis: 0,
      costedQuantity: 2,
      unrealizedGain: 8,
      costCoverage: 1,
    });
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      calculatePortfolio([{ quantity: -1, purchasePrice: null, marketPrice: null }]),
    ).toThrow("Quantity");
  });
});

describe("displayCostBasis", () => {
  it("hides $0.00 when no lot has a paid price", () => {
    expect(
      displayCostBasis(
        calculatePortfolio([{ quantity: 2, purchasePrice: null, marketPrice: 10 }]),
      ),
    ).toBeNull();
    expect(
      displayCostBasis(
        calculatePortfolio([{ quantity: 2, purchasePrice: 3, marketPrice: 10 }]),
      ),
    ).toBe(6);
  });
});

describe("canShowUnrealized", () => {
  it("hides a collection-wide gain until most of the priced value has a cost", () => {
    const thin = calculatePortfolio([
      { quantity: 1, purchasePrice: 2, marketPrice: 5 },
      { quantity: 1, purchasePrice: null, marketPrice: 1000 },
    ]);
    expect(canShowUnrealized(thin)).toBe(false);

    const covered = calculatePortfolio([
      { quantity: 1, purchasePrice: 800, marketPrice: 900 },
      { quantity: 1, purchasePrice: null, marketPrice: 100 },
    ]);
    expect(covered.costCoverage).toBeCloseTo(0.9);
    expect(canShowUnrealized(covered)).toBe(true);
    expect(covered.unrealizedGain).toBe(100);
  });

  it("hides gain when nothing is paired", () => {
    expect(
      canShowUnrealized(
        calculatePortfolio([{ quantity: 1, purchasePrice: null, marketPrice: 10 }]),
      ),
    ).toBe(false);
  });
});

describe("unrealizedDisplay", () => {
  const format = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value)}`;
  const labels = { unrealized: "unrealized", addPaid: "Add what you paid to see gain." };

  it("asks for paid prices instead of inventing a profit", () => {
    expect(
      unrealizedDisplay(
        calculatePortfolio([
          { quantity: 1, purchasePrice: 2, marketPrice: 5 },
          { quantity: 1, purchasePrice: null, marketPrice: 1000 },
        ]),
        format,
        labels,
      ),
    ).toEqual({ text: "Add what you paid to see gain.", tone: "muted" });
  });

  it("shows a signed gain when cost covers the collection", () => {
    expect(
      unrealizedDisplay(
        calculatePortfolio([{ quantity: 1, purchasePrice: 10, marketPrice: 14 }]),
        format,
        labels,
      ),
    ).toEqual({ text: "+$4 unrealized", tone: "up" });
    expect(
      unrealizedDisplay(
        calculatePortfolio([{ quantity: 1, purchasePrice: 14, marketPrice: 10 }]),
        format,
        labels,
      ),
    ).toEqual({ text: "-$4 unrealized", tone: "down" });
  });

  it("shows an em dash when there is no market value yet", () => {
    expect(
      unrealizedDisplay(
        calculatePortfolio([{ quantity: 1, purchasePrice: 10, marketPrice: null }]),
        format,
        labels,
      ),
    ).toEqual({ text: "—", tone: "muted" });
  });
});

describe("convertMoney", () => {
  const fx = { cad: 1.4, eur: 0.9 };

  it("leaves the amount alone when currencies match", () => {
    expect(convertMoney(10, "USD", "USD", fx)).toBe(10);
  });

  it("converts USD into CAD and back", () => {
    expect(convertMoney(10, "USD", "CAD", fx)).toBeCloseTo(14);
    expect(convertMoney(14, "CAD", "USD", fx)).toBeCloseTo(10);
  });

  it("converts EUR into CAD through USD", () => {
    expect(convertMoney(9, "EUR", "CAD", fx)).toBeCloseTo(14);
  });
});

describe("toDisplayPaid", () => {
  const fx = { cad: 1.4, eur: 0.9 };

  it("returns null when the lot has no paid price", () => {
    expect(toDisplayPaid(null, "USD", "CAD", fx)).toBeNull();
  });

  it("converts a USD paid price into CAD for display", () => {
    expect(toDisplayPaid(10, "USD", "CAD", fx)).toBeCloseTo(14);
  });
});
