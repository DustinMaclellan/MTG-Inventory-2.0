import { describe, expect, it } from "vitest";
import { calculatePortfolio } from "./money";

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
