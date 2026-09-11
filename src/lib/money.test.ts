import { describe, expect, it } from "vitest";
import { calculatePortfolio, convertMoney, toDisplayPaid } from "./money";

describe("calculatePortfolio", () => {
  it("calculates quantity-weighted value, cost, and gain", () => {
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
    });
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      calculatePortfolio([{ quantity: -1, purchasePrice: null, marketPrice: null }]),
    ).toThrow("Quantity");
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
