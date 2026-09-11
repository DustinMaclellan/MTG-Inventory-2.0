import { describe, expect, it } from "vitest";
import { Currency, Finish } from "@prisma/client";
import { marketForFinish } from "./pricing";

describe("marketForFinish", () => {
  it("uses the CurrentPrice row for that finish", () => {
    expect(
      marketForFinish(
        Finish.FOIL,
        [
          { finish: Finish.NONFOIL, currency: Currency.USD, market: 1 },
          { finish: Finish.FOIL, currency: Currency.USD, market: 4.5 },
        ],
        { usd: "9.00", usd_foil: "99.00" },
        Currency.USD,
        1,
      ),
    ).toBe(4.5);
  });

  it("falls back to stored Scryfall JSON when that finish has no CurrentPrice row", () => {
    expect(
      marketForFinish(
        Finish.NONFOIL,
        [{ finish: Finish.FOIL, currency: Currency.USD, market: 12 }],
        { usd: "0.60", usd_foil: "1.20" },
        Currency.USD,
        1,
      ),
    ).toBe(0.6);
  });

  it("returns null when neither table nor JSON has a price", () => {
    expect(
      marketForFinish(Finish.NONFOIL, [], { usd: null, usd_foil: null }, Currency.USD, 1),
    ).toBeNull();
  });

  it("applies CAD display FX to the raw Scryfall fallback", () => {
    expect(
      marketForFinish(Finish.NONFOIL, [], { usd: "0.50" }, Currency.USD, 1.4),
    ).toBe(0.7);
  });
});
