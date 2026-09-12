import { describe, expect, it } from "vitest";
import {
  ANALYTICS_BREAKDOWN_LIMIT,
  ANALYTICS_HISTORY_DAYS,
  ANALYTICS_TOP_LOTS,
  addUtcDays,
  averageLotValue,
  collectionValueSeries,
  comparableTrendPoints,
  concentrationShare,
  coverageRatio,
  eachUtcDay,
  formatUtcDayLabel,
  groupBreakdown,
  holdingKey,
  priceMovers,
  seriesChange,
  utcDayKey,
} from "./analytics";

describe("constants", () => {
  it("keeps the analytics window and list sizes stable", () => {
    expect(ANALYTICS_HISTORY_DAYS).toBe(90);
    expect(ANALYTICS_TOP_LOTS).toBe(10);
    expect(ANALYTICS_BREAKDOWN_LIMIT).toBe(8);
  });
});

describe("holdingKey", () => {
  it("separates the same printing in two finishes", () => {
    expect(holdingKey("sol", "NONFOIL")).toBe("sol::NONFOIL");
    expect(holdingKey("sol", "FOIL")).not.toBe(holdingKey("sol", "NONFOIL"));
  });
});

describe("utc day helpers", () => {
  it("formats a UTC instant without shifting the calendar date", () => {
    expect(utcDayKey(new Date("2026-03-08T23:30:00.000Z"))).toBe("2026-03-08");
    expect(utcDayKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
    expect(utcDayKey(new Date("2026-12-31T23:59:59.999Z"))).toBe("2026-12-31");
  });

  it("does not use the local timezone to pick the day", () => {
    expect(utcDayKey(new Date("2026-03-09T00:30:00.000+04:00"))).toBe("2026-03-08");
  });

  it("walks forward and backward across month and year boundaries", () => {
    expect(addUtcDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addUtcDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addUtcDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addUtcDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addUtcDays("2026-01-01", 0)).toBe("2026-01-01");
  });

  it("lists inclusive UTC days and stays empty when the range is backwards", () => {
    expect(eachUtcDay("2026-03-08", "2026-03-10")).toEqual([
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
    expect(eachUtcDay("2026-03-08", "2026-03-08")).toEqual(["2026-03-08"]);
    expect(eachUtcDay("2026-03-10", "2026-03-08")).toEqual([]);
  });
});

describe("formatUtcDayLabel", () => {
  it("uses stable English and French month labels", () => {
    expect(formatUtcDayLabel("2026-01-01", "en")).toBe("Jan 1");
    expect(formatUtcDayLabel("2026-09-09", "en")).toBe("Sep 9");
    expect(formatUtcDayLabel("2026-12-31", "en")).toBe("Dec 31");
    expect(formatUtcDayLabel("2026-09-09", "fr")).toBe("sept. 9");
    expect(formatUtcDayLabel("2026-02-03", "fr")).toBe("févr. 3");
    expect(formatUtcDayLabel("2026-08-15", "fr")).toBe("août 15");
  });

  it("returns the raw key when the date is not YYYY-MM-DD", () => {
    expect(formatUtcDayLabel("nope", "en")).toBe("nope");
    expect(formatUtcDayLabel("2026-00-10", "en")).toBe("2026-00-10");
    expect(formatUtcDayLabel("2026-13-01", "en")).toBe("2026-13-01");
  });
});

describe("collectionValueSeries", () => {
  const holdings = [
    { printingId: "sol", finish: "NONFOIL", quantity: 2 },
    { printingId: "bolt", finish: "FOIL", quantity: 1 },
  ];

  it("marks today's cards at the last known past price, then uses live prices today", () => {
    expect(
      collectionValueSeries(
        holdings,
        [
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-08", market: 10 },
          { printingId: "bolt", finish: "FOIL", date: "2026-03-08", market: 4 },
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 12 },
        ],
        {
          date: "2026-03-11",
          prices: [
            { printingId: "sol", finish: "NONFOIL", market: 13 },
            { printingId: "bolt", finish: "FOIL", market: 5 },
          ],
        },
      ),
    ).toEqual([
      { date: "2026-03-08", value: 24, pricedQuantity: 3 },
      { date: "2026-03-09", value: 24, pricedQuantity: 3 },
      { date: "2026-03-10", value: 28, pricedQuantity: 3 },
      { date: "2026-03-11", value: 31, pricedQuantity: 3 },
    ]);
  });

  it("does not invent a price before the first snapshot for that printing", () => {
    expect(
      collectionValueSeries(
        holdings,
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 10 }],
        {
          date: "2026-03-11",
          prices: [
            { printingId: "sol", finish: "NONFOIL", market: 11 },
            { printingId: "bolt", finish: "FOIL", market: 5 },
          ],
        },
      ),
    ).toEqual([
      { date: "2026-03-10", value: 20, pricedQuantity: 2 },
      { date: "2026-03-11", value: 27, pricedQuantity: 3 },
    ]);
  });

  it("returns a single today point when history is empty", () => {
    expect(
      collectionValueSeries(holdings, [], {
        date: "2026-03-11",
        prices: [{ printingId: "sol", finish: "NONFOIL", market: 10 }],
      }),
    ).toEqual([{ date: "2026-03-11", value: 20, pricedQuantity: 2 }]);
  });

  it("returns nothing when nothing is priced", () => {
    expect(
      collectionValueSeries(holdings, [], {
        date: "2026-03-11",
        prices: [{ printingId: "sol", finish: "NONFOIL", market: null }],
      }),
    ).toEqual([]);
  });

  it("returns nothing for an empty collection", () => {
    expect(
      collectionValueSeries(
        [],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 10 }],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 11 }] },
      ),
    ).toEqual([]);
  });

  it("keeps foil and non-foil prices on the same printing apart", () => {
    expect(
      collectionValueSeries(
        [
          { printingId: "sol", finish: "NONFOIL", quantity: 1 },
          { printingId: "sol", finish: "FOIL", quantity: 1 },
        ],
        [
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 2 },
          { printingId: "sol", finish: "FOIL", date: "2026-03-10", market: 20 },
        ],
        {
          date: "2026-03-10",
          prices: [
            { printingId: "sol", finish: "NONFOIL", market: 2 },
            { printingId: "sol", finish: "FOIL", market: 20 },
          ],
        },
      ),
    ).toEqual([{ date: "2026-03-10", value: 22, pricedQuantity: 2 }]);
  });

  it("lets today's current price win over a same-day history row", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-11", market: 9 }],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 12 }] },
      ),
    ).toEqual([{ date: "2026-03-11", value: 12, pricedQuantity: 1 }]);
  });

  it("skips NaN and infinite history rows", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-09", market: Number.NaN },
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: Number.POSITIVE_INFINITY },
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-11", market: 7 },
        ],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 7 }] },
      ),
    ).toEqual([{ date: "2026-03-11", value: 7, pricedQuantity: 1 }]);
  });

  it("ignores a future history date and still prices today", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-20", market: 99 }],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 8 }] },
      ),
    ).toEqual([{ date: "2026-03-11", value: 8, pricedQuantity: 1 }]);
  });

  it("accepts unsorted history and still carries the last known price forward", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 12 },
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-08", market: 10 },
        ],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 13 }] },
      ),
    ).toEqual([
      { date: "2026-03-08", value: 10, pricedQuantity: 1 },
      { date: "2026-03-09", value: 10, pricedQuantity: 1 },
      { date: "2026-03-10", value: 12, pricedQuantity: 1 },
      { date: "2026-03-11", value: 13, pricedQuantity: 1 },
    ]);
  });

  it("sums two lots of the same printing when they are passed separately", () => {
    expect(
      collectionValueSeries(
        [
          { printingId: "sol", finish: "NONFOIL", quantity: 1 },
          { printingId: "sol", finish: "NONFOIL", quantity: 3 },
        ],
        [],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 5 }] },
      ),
    ).toEqual([{ date: "2026-03-11", value: 20, pricedQuantity: 4 }]);
  });

  it("does not count a zero-quantity lot", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 0 }],
        [],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: 40 }] },
      ),
    ).toEqual([]);
  });

  it("can carry history when today has no current price yet", () => {
    expect(
      collectionValueSeries(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 2 }],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-10", market: 6 }],
        { date: "2026-03-11", prices: [{ printingId: "sol", finish: "NONFOIL", market: null }] },
      ),
    ).toEqual([
      { date: "2026-03-10", value: 12, pricedQuantity: 2 },
      { date: "2026-03-11", value: 12, pricedQuantity: 2 },
    ]);
  });
});

describe("coverage and series change", () => {
  it("returns 0 when either side has no priced cards", () => {
    expect(coverageRatio(0, 0)).toBe(0);
    expect(coverageRatio(0, 10)).toBe(0);
    expect(coverageRatio(10, 0)).toBe(0);
  });

  it("is symmetric and 1 when the counts match", () => {
    expect(coverageRatio(8, 10)).toBe(0.8);
    expect(coverageRatio(10, 8)).toBe(0.8);
    expect(coverageRatio(34, 34)).toBe(1);
  });

  it("drops early days that only price a thin slice of today's cards", () => {
    expect(
      comparableTrendPoints([
        { date: "2026-03-09", value: 40, pricedQuantity: 2 },
        { date: "2026-03-10", value: 4700, pricedQuantity: 34 },
        { date: "2026-03-11", value: 4800, pricedQuantity: 34 },
      ]),
    ).toEqual([
      { date: "2026-03-10", value: 4700, pricedQuantity: 34 },
      { date: "2026-03-11", value: 4800, pricedQuantity: 34 },
    ]);
  });

  it("keeps a day that sits on the default 85% coverage line", () => {
    expect(
      comparableTrendPoints([
        { date: "2026-03-10", value: 85, pricedQuantity: 85 },
        { date: "2026-03-11", value: 100, pricedQuantity: 100 },
      ]),
    ).toHaveLength(2);
  });

  it("honors a custom coverage floor", () => {
    expect(
      comparableTrendPoints(
        [
          { date: "2026-03-10", value: 50, pricedQuantity: 5 },
          { date: "2026-03-11", value: 100, pricedQuantity: 10 },
        ],
        0.6,
      ),
    ).toHaveLength(1);
    expect(
      comparableTrendPoints(
        [
          { date: "2026-03-10", value: 50, pricedQuantity: 5 },
          { date: "2026-03-11", value: 100, pricedQuantity: 10 },
        ],
        0.5,
      ),
    ).toHaveLength(2);
  });

  it("returns no trend points when the last day is unpriced or the series is empty", () => {
    expect(comparableTrendPoints([])).toEqual([]);
    expect(comparableTrendPoints([{ date: "2026-03-11", value: 0, pricedQuantity: 0 }])).toEqual([]);
  });

  it("needs two distinct comparable days before it reports a change", () => {
    expect(seriesChange([{ date: "2026-03-11", value: 10, pricedQuantity: 1 }])).toBeNull();
    expect(
      seriesChange([
        { date: "2026-03-10", value: 10, pricedQuantity: 1 },
        { date: "2026-03-11", value: 14, pricedQuantity: 1 },
      ]),
    ).toEqual({
      from: 10,
      to: 14,
      change: 4,
      fromDate: "2026-03-10",
      toDate: "2026-03-11",
    });
  });

  it("does not treat a coverage jump as a market move", () => {
    expect(
      seriesChange([
        { date: "2026-03-09", value: 40, pricedQuantity: 2 },
        { date: "2026-03-11", value: 4800, pricedQuantity: 34 },
      ]),
    ).toBeNull();
  });

  it("reports a loss when comparable value falls", () => {
    expect(
      seriesChange([
        { date: "2026-03-10", value: 100, pricedQuantity: 10 },
        { date: "2026-03-11", value: 90, pricedQuantity: 10 },
      ]),
    ).toMatchObject({ change: -10, from: 100, to: 90 });
  });

  it("reports a flat change when the priced value did not move", () => {
    expect(
      seriesChange([
        { date: "2026-03-10", value: 50, pricedQuantity: 4 },
        { date: "2026-03-11", value: 50, pricedQuantity: 4 },
      ]),
    ).toMatchObject({ change: 0 });
  });
});

describe("groupBreakdown", () => {
  it("ranks by value and lumps the rest into Other", () => {
    expect(
      groupBreakdown(
        [
          { key: "mh3", label: "Modern Horizons 3", quantity: 2, value: 40 },
          { key: "mh3", label: "Modern Horizons 3", quantity: 1, value: 10 },
          { key: "cmm", label: "Commander Masters", quantity: 4, value: 20 },
          { key: "unx", label: "Unfinity", quantity: 1, value: 2 },
          { key: "sld", label: "Secret Lair", quantity: 1, value: null },
        ],
        { limit: 2, otherLabel: "Other" },
      ),
    ).toEqual([
      { key: "mh3", label: "Modern Horizons 3", quantity: 3, value: 50, share: 50 / 72 },
      { key: "cmm", label: "Commander Masters", quantity: 4, value: 20, share: 20 / 72 },
      { key: "other", label: "Other", quantity: 2, value: 2, share: 2 / 72 },
    ]);
  });

  it("does not invent an Other row when everything fits", () => {
    expect(
      groupBreakdown(
        [
          { key: "foil", label: "Foil", quantity: 2, value: 80 },
          { key: "non", label: "Non-foil", quantity: 3, value: 20 },
        ],
        { limit: 8 },
      ),
    ).toHaveLength(2);
  });

  it("returns an empty list for an empty collection", () => {
    expect(groupBreakdown([])).toEqual([]);
  });

  it("keeps unpriced groups after priced ones and gives them no share", () => {
    expect(
      groupBreakdown([
        { key: "nm", label: "Near Mint", quantity: 2, value: 10 },
        { key: "hp", label: "Heavily Played", quantity: 5, value: null },
      ]),
    ).toEqual([
      { key: "nm", label: "Near Mint", quantity: 2, value: 10, share: 1 },
      { key: "hp", label: "Heavily Played", quantity: 5, value: null, share: null },
    ]);
  });

  it("ranks two unpriced groups by quantity, then label", () => {
    expect(
      groupBreakdown([
        { key: "b", label: "Beta", quantity: 2, value: null },
        { key: "a", label: "Alpha", quantity: 2, value: null },
        { key: "c", label: "Gamma", quantity: 5, value: null },
      ]).map((row) => row.key),
    ).toEqual(["c", "a", "b"]);
  });

  it("breaks a value tie by quantity, then label", () => {
    expect(
      groupBreakdown([
        { key: "b", label: "Beta", quantity: 2, value: 10 },
        { key: "a", label: "Alpha", quantity: 2, value: 10 },
        { key: "c", label: "Gamma", quantity: 4, value: 10 },
      ]).map((row) => row.key),
    ).toEqual(["c", "a", "b"]);
  });

  it("uses the default limit of 8 and a custom Other label", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      key: `s${index}`,
      label: `Set ${index}`,
      quantity: 1,
      value: 10 - index,
    }));
    const grouped = groupBreakdown(rows, { otherLabel: "Autre", otherKey: "reste" });
    expect(grouped).toHaveLength(9);
    expect(grouped[8]).toMatchObject({ key: "reste", label: "Autre", quantity: 2, value: 3 });
  });

  it("treats a group of only unpriced leftovers as Other with a null value", () => {
    expect(
      groupBreakdown(
        [
          { key: "top", label: "Top", quantity: 1, value: 50 },
          { key: "u1", label: "U1", quantity: 2, value: null },
          { key: "u2", label: "U2", quantity: 3, value: null },
        ],
        { limit: 1 },
      )[1],
    ).toMatchObject({ key: "other", quantity: 5, value: null, share: null });
  });

  it("ignores non-finite values when summing a group", () => {
    expect(
      groupBreakdown([
        { key: "mh3", label: "MH3", quantity: 1, value: 10 },
        { key: "mh3", label: "MH3", quantity: 1, value: Number.NaN },
      ]),
    ).toEqual([{ key: "mh3", label: "MH3", quantity: 2, value: 10, share: 1 }]);
  });
});

describe("concentration and average lot", () => {
  it("measures the share sitting in the top lots", () => {
    expect(concentrationShare([50, 30, 10, 10], 2)).toEqual({
      topValue: 80,
      total: 100,
      share: 0.8,
    });
    expect(concentrationShare([], 10)).toEqual({ topValue: 0, total: 0, share: null });
  });

  it("drops zeros and uses the default top 10", () => {
    const lots = [100, 20, 10, 5, 4, 3, 2, 1, 1, 1, 1, 0];
    const result = concentrationShare(lots);
    expect(result.total).toBe(148);
    expect(result.topValue).toBe(147);
    expect(result.share).toBeCloseTo(147 / 148);
  });

  it("uses every lot when there are fewer than the requested top N", () => {
    expect(concentrationShare([12, 8], 10)).toEqual({
      topValue: 20,
      total: 20,
      share: 1,
    });
  });

  it("averages priced lots only", () => {
    expect(averageLotValue([10, null, 30])).toBe(20);
    expect(averageLotValue([null, null])).toBeNull();
    expect(averageLotValue([])).toBeNull();
    expect(averageLotValue([7])).toBe(7);
    expect(averageLotValue([10, Number.NaN, 30])).toBe(20);
    expect(averageLotValue([0, 10])).toBe(5);
  });
});

describe("priceMovers", () => {
  it("weights unit change by quantity and skips flats or missing pairs", () => {
    expect(
      priceMovers(
        [
          { printingId: "sol", finish: "NONFOIL", quantity: 2 },
          { printingId: "bolt", finish: "FOIL", quantity: 1 },
          { printingId: "flat", finish: "NONFOIL", quantity: 4 },
        ],
        [
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-01", market: 10 },
          { printingId: "sol", finish: "NONFOIL", date: "2026-03-08", market: 8 },
          { printingId: "flat", finish: "NONFOIL", date: "2026-03-01", market: 3 },
        ],
        [
          { printingId: "sol", finish: "NONFOIL", market: 13 },
          { printingId: "bolt", finish: "FOIL", market: 5 },
          { printingId: "flat", finish: "NONFOIL", market: 3 },
        ],
      ),
    ).toEqual([
      {
        printingId: "sol",
        finish: "NONFOIL",
        quantity: 2,
        from: 10,
        to: 13,
        change: 6,
        changePct: 0.3,
      },
    ]);
  });

  it("compares against the earliest snapshot, not the latest history row", () => {
    const [mover] = priceMovers(
      [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
      [
        { printingId: "sol", finish: "NONFOIL", date: "2026-03-08", market: 12 },
        { printingId: "sol", finish: "NONFOIL", date: "2026-03-01", market: 10 },
      ],
      [{ printingId: "sol", finish: "NONFOIL", market: 11 }],
    );
    expect(mover).toMatchObject({ from: 10, to: 11, change: 1 });
  });

  it("sorts movers by absolute dollar change", () => {
    expect(
      priceMovers(
        [
          { printingId: "up", finish: "NONFOIL", quantity: 1 },
          { printingId: "down", finish: "FOIL", quantity: 2 },
        ],
        [
          { printingId: "up", finish: "NONFOIL", date: "2026-03-01", market: 10 },
          { printingId: "down", finish: "FOIL", date: "2026-03-01", market: 20 },
        ],
        [
          { printingId: "up", finish: "NONFOIL", market: 12 },
          { printingId: "down", finish: "FOIL", market: 15 },
        ],
      ).map((mover) => mover.printingId),
    ).toEqual(["down", "up"]);
  });

  it("treats a price drop as a negative quantity-weighted change", () => {
    expect(
      priceMovers(
        [{ printingId: "crypt", finish: "FOIL", quantity: 3 }],
        [{ printingId: "crypt", finish: "FOIL", date: "2026-03-01", market: 100 }],
        [{ printingId: "crypt", finish: "FOIL", market: 90 }],
      ),
    ).toEqual([
      {
        printingId: "crypt",
        finish: "FOIL",
        quantity: 3,
        from: 100,
        to: 90,
        change: -30,
        changePct: -0.1,
      },
    ]);
  });

  it("leaves changePct null when the first snapshot was free", () => {
    expect(
      priceMovers(
        [{ printingId: "token", finish: "NONFOIL", quantity: 1 }],
        [{ printingId: "token", finish: "NONFOIL", date: "2026-03-01", market: 0 }],
        [{ printingId: "token", finish: "NONFOIL", market: 2 }],
      )[0]?.changePct,
    ).toBeNull();
  });

  it("skips a holding with history but no current price", () => {
    expect(
      priceMovers(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-01", market: 10 }],
        [{ printingId: "sol", finish: "NONFOIL", market: null }],
      ),
    ).toEqual([]);
  });

  it("skips NaN history and current rows", () => {
    expect(
      priceMovers(
        [{ printingId: "sol", finish: "NONFOIL", quantity: 1 }],
        [{ printingId: "sol", finish: "NONFOIL", date: "2026-03-01", market: Number.NaN }],
        [{ printingId: "sol", finish: "NONFOIL", market: 12 }],
      ),
    ).toEqual([]);
  });

  it("returns nothing when the collection is empty", () => {
    expect(priceMovers([], [], [])).toEqual([]);
  });
});
