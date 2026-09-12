import type { Messages } from "@/i18n";
import type { BreakdownRow } from "@/lib/analytics";

export const ANALYTICS_MOVER_LIMIT = 5;

export function formatShare(share: number | null, locale: "en" | "fr") {
  if (share == null) return "—";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
}

export function formatAxisMoney(
  value: number,
  currency: "USD" | "CAD" | "EUR",
  locale: "en" | "fr",
) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatMoverPercent(changePct: number | null, locale: "en" | "fr") {
  if (changePct == null) return "—";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-US", {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: Math.abs(changePct) < 0.005 ? 2 : 0,
  }).format(changePct);
}

export function shareBarWidth(share: number | null) {
  return Math.max(0, Math.min(100, (share ?? 0) * 100));
}

export function splitMovers<T extends { change: number }>(movers: T[], limit = ANALYTICS_MOVER_LIMIT) {
  return {
    gained: movers.filter((mover) => mover.change > 0).slice(0, limit),
    lost: movers.filter((mover) => mover.change < 0).slice(0, limit),
  };
}

export function canDrawTrend(pointCount: number) {
  return pointCount >= 2;
}

export function showSparseTrendHint(snapshotCount: number) {
  return snapshotCount < 3;
}

export function translateBreakdown(
  rows: BreakdownRow[],
  m: Messages,
  kind: "set" | "finish" | "condition" | "storage",
): BreakdownRow[] {
  return rows.map((row) => {
    if (row.key === "other") return { ...row, label: m.analytics.other };
    if (kind === "finish" && row.key in m.finish) {
      return { ...row, label: m.finish[row.key as keyof typeof m.finish] };
    }
    if (kind === "condition" && row.key in m.condition) {
      return { ...row, label: m.condition[row.key as keyof typeof m.condition] };
    }
    if (kind === "storage" && row.key === "unassigned") {
      return { ...row, label: m.common.unassigned };
    }
    return row;
  });
}

export function gainTone(value: number | null) {
  if (value == null) return "neutral";
  return value >= 0 ? "up" : "down";
}