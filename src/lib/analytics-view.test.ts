import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import {
  ANALYTICS_MOVER_LIMIT,
  canDrawTrend,
  formatAxisMoney,
  formatMoverPercent,
  formatShare,
  gainTone,
  shareBarWidth,
  showSparseTrendHint,
  splitMovers,
  translateBreakdown,
} from "./analytics-view";

describe("formatShare", () => {
  it("formats a share in English and French", () => {
    expect(formatShare(0.45, "en")).toBe("45%");
    expect(formatShare(1, "en")).toBe("100%");
    expect(formatShare(0, "en")).toBe("0%");
    expect(formatShare(0.456, "en")).toBe("46%");
    expect(formatShare(0.45, "fr")).toMatch(/45/);
  });

  it("shows an em dash when there is no priced share", () => {
    expect(formatShare(null, "en")).toBe("—");
    expect(formatShare(null, "fr")).toBe("—");
  });
});

describe("formatAxisMoney", () => {
  it("compacts large USD values", () => {
    expect(formatAxisMoney(1500, "USD", "en")).toMatch(/1\.5/);
    expect(formatAxisMoney(0, "USD", "en")).toMatch(/\$0/);
  });

  it("keeps the requested currency", () => {
    expect(formatAxisMoney(10, "CAD", "en")).toMatch(/CA/);
    expect(formatAxisMoney(10, "EUR", "en")).toMatch(/€/);
  });
});

describe("formatMoverPercent", () => {
  it("shows a sign and whole percents for normal moves", () => {
    expect(formatMoverPercent(0.14, "en")).toBe("+14%");
    expect(formatMoverPercent(-0.03, "en")).toBe("-3%");
  });

  it("keeps two decimals when a move would otherwise round to 0%", () => {
    expect(formatMoverPercent(-0.0006, "en")).toBe("-0.06%");
    expect(formatMoverPercent(0.0043, "en")).toBe("+0.43%");
  });

  it("shows an em dash without a percent", () => {
    expect(formatMoverPercent(null, "en")).toBe("—");
  });
});

describe("shareBarWidth", () => {
  it("converts a share to a 0–100 bar width", () => {
    expect(shareBarWidth(0.45)).toBe(45);
    expect(shareBarWidth(null)).toBe(0);
    expect(shareBarWidth(0)).toBe(0);
    expect(shareBarWidth(1)).toBe(100);
  });

  it("clamps impossible shares", () => {
    expect(shareBarWidth(1.5)).toBe(100);
    expect(shareBarWidth(-0.2)).toBe(0);
  });
});

describe("splitMovers", () => {
  const movers = [
    { id: "a", change: 12 },
    { id: "b", change: -3 },
    { id: "c", change: 4 },
    { id: "d", change: 0 },
    { id: "e", change: -8 },
    { id: "f", change: 1 },
    { id: "g", change: 2 },
    { id: "h", change: 3 },
    { id: "i", change: -1 },
    { id: "j", change: -2 },
    { id: "k", change: -4 },
    { id: "l", change: -5 },
  ];

  it("keeps the default page cap of five up and five down", () => {
    expect(ANALYTICS_MOVER_LIMIT).toBe(5);
    const { gained, lost } = splitMovers(movers);
    expect(gained.map((row) => row.id)).toEqual(["a", "c", "f", "g", "h"]);
    expect(lost.map((row) => row.id)).toEqual(["b", "e", "i", "j", "k"]);
  });

  it("honors a custom limit and ignores flats", () => {
    expect(splitMovers(movers, 1)).toEqual({
      gained: [{ id: "a", change: 12 }],
      lost: [{ id: "b", change: -3 }],
    });
  });

  it("returns empty lists when nothing moved", () => {
    expect(splitMovers([{ id: "flat", change: 0 }])).toEqual({ gained: [], lost: [] });
    expect(splitMovers([])).toEqual({ gained: [], lost: [] });
  });
});

describe("trend visibility", () => {
  it("needs two points before the chart can draw", () => {
    expect(canDrawTrend(0)).toBe(false);
    expect(canDrawTrend(1)).toBe(false);
    expect(canDrawTrend(2)).toBe(true);
    expect(canDrawTrend(12)).toBe(true);
  });

  it("shows the sparse hint until three snapshots exist", () => {
    expect(showSparseTrendHint(0)).toBe(true);
    expect(showSparseTrendHint(1)).toBe(true);
    expect(showSparseTrendHint(2)).toBe(true);
    expect(showSparseTrendHint(3)).toBe(false);
  });
});

describe("gainTone", () => {
  it("treats zero as up and null as neutral", () => {
    expect(gainTone(12)).toBe("up");
    expect(gainTone(0)).toBe("up");
    expect(gainTone(-0.04)).toBe("down");
    expect(gainTone(null)).toBe("neutral");
  });
});

describe("translateBreakdown", () => {
  it("translates finish, condition, unassigned storage, and Other", () => {
    expect(
      translateBreakdown(
        [{ key: "FOIL", label: "FOIL", quantity: 2, value: 10, share: 1 }],
        en,
        "finish",
      )[0]?.label,
    ).toBe("Foil");
    expect(
      translateBreakdown(
        [{ key: "NEAR_MINT", label: "NEAR_MINT", quantity: 1, value: 5, share: 1 }],
        fr,
        "condition",
      )[0]?.label,
    ).toBe(fr.condition.NEAR_MINT);
    expect(
      translateBreakdown(
        [{ key: "unassigned", label: "unassigned", quantity: 3, value: 1, share: 0.1 }],
        en,
        "storage",
      )[0]?.label,
    ).toBe(en.common.unassigned);
    expect(
      translateBreakdown(
        [{ key: "other", label: "Other", quantity: 4, value: 2, share: 0.2 }],
        fr,
        "set",
      )[0]?.label,
    ).toBe(fr.analytics.other);
  });

  it("leaves set names and unknown keys alone", () => {
    expect(
      translateBreakdown(
        [{ key: "mh3", label: "Modern Horizons 3", quantity: 2, value: 40, share: 0.5 }],
        en,
        "set",
      )[0]?.label,
    ).toBe("Modern Horizons 3");
    expect(
      translateBreakdown(
        [{ key: "Binder C", label: "Binder C", quantity: 8, value: 20, share: 0.4 }],
        fr,
        "storage",
      )[0]?.label,
    ).toBe("Binder C");
  });
});

describe("analytics copy", () => {
  it("keeps the English and French analytics blocks aligned", () => {
    expect(Object.keys(en.analytics).sort()).toEqual(Object.keys(fr.analytics).sort());
  });

  it("tells the collector the trend is today's cards at past prices", () => {
    expect(en.analytics.intro).toMatch(/past prices/i);
    expect(en.analytics.trendTitle).toMatch(/past prices/i);
    expect(fr.analytics.intro).toMatch(/prix passés/i);
    expect(en.analytics.moversEmpty).toMatch(/second/i);
    expect(en.analytics.gained).toBe("Up");
    expect(en.analytics.lost).toBe("Down");
    expect(fr.analytics.gained).toBe("En hausse");
    expect(fr.analytics.lost).toBe("En baisse");
  });
});
