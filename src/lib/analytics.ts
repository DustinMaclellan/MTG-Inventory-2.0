export const ANALYTICS_HISTORY_DAYS = 90;
export const ANALYTICS_TOP_LOTS = 10;
export const ANALYTICS_BREAKDOWN_LIMIT = 8;

export type AnalyticsHolding = {
  printingId: string;
  finish: string;
  quantity: number;
};

export type PriceSnapshot = {
  printingId: string;
  finish: string;
  date: string;
  market: number;
};

export type CurrentMarket = {
  printingId: string;
  finish: string;
  market: number | null;
};

export type ValuePoint = {
  date: string;
  value: number;
  pricedQuantity: number;
};

export type BreakdownInput = {
  key: string;
  label: string;
  quantity: number;
  value: number | null;
};

export type BreakdownRow = {
  key: string;
  label: string;
  quantity: number;
  value: number | null;
  share: number | null;
};

export type Concentration = {
  topValue: number;
  total: number;
  share: number | null;
};

export type PriceMover = {
  printingId: string;
  finish: string;
  quantity: number;
  from: number;
  to: number;
  change: number;
  changePct: number | null;
};

export function holdingKey(printingId: string, finish: string) {
  return `${printingId}::${finish}`;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];

export function formatUtcDayLabel(dateKey: string, locale: "en" | "fr") {
  const [, month, day] = dateKey.split("-").map(Number);
  if (!month || month < 1 || month > 12 || !day) return dateKey;
  const months = locale === "fr" ? MONTHS_FR : MONTHS_EN;
  return `${months[month - 1]} ${day}`;
}

export function utcDayKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addUtcDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDayKey(date);
}

export function eachUtcDay(from: string, to: string) {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

function latestOnOrBefore(
  snapshots: Array<{ date: string; market: number }>,
  date: string,
) {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snap = snapshots[index];
    if (snap && snap.date <= date) return snap.market;
  }
  return null;
}

/** Mark-to-market of today's holdings at the last known price on each day. */
export function collectionValueSeries(
  holdings: AnalyticsHolding[],
  history: PriceSnapshot[],
  today: { date: string; prices: CurrentMarket[] },
): ValuePoint[] {
  const byHolding = new Map<string, Array<{ date: string; market: number }>>();
  for (const snap of history) {
    if (!Number.isFinite(snap.market)) continue;
    const key = holdingKey(snap.printingId, snap.finish);
    const list = byHolding.get(key) ?? [];
    list.push({ date: snap.date, market: snap.market });
    byHolding.set(key, list);
  }
  for (const list of byHolding.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  const todayMarkets = new Map<string, number>();
  for (const price of today.prices) {
    if (price.market == null || !Number.isFinite(price.market)) continue;
    todayMarkets.set(holdingKey(price.printingId, price.finish), price.market);
  }

  const historyDates = history
    .filter((snap) => Number.isFinite(snap.market))
    .map((snap) => snap.date)
    .sort();
  const start = historyDates[0];
  if (!start && todayMarkets.size === 0) return [];

  const from = start && start < today.date ? start : today.date;
  const points: ValuePoint[] = [];

  for (const date of eachUtcDay(from, today.date)) {
    let value = 0;
    let pricedQuantity = 0;
    for (const holding of holdings) {
      const key = holdingKey(holding.printingId, holding.finish);
      const market =
        date === today.date && todayMarkets.has(key)
          ? todayMarkets.get(key)!
          : latestOnOrBefore(byHolding.get(key) ?? [], date);
      if (market == null) continue;
      value += market * holding.quantity;
      pricedQuantity += holding.quantity;
    }
    if (pricedQuantity > 0) {
      points.push({ date, value, pricedQuantity });
    }
  }

  return points;
}

export function coverageRatio(a: number, b: number) {
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (max <= 0) return 0;
  return min / max;
}

/** Drop early days that only price a thin slice of today's holdings. */
export function comparableTrendPoints(points: ValuePoint[], minCoverage = 0.85): ValuePoint[] {
  const last = points[points.length - 1];
  if (!last || last.pricedQuantity <= 0) return [];
  return points.filter((point) => coverageRatio(point.pricedQuantity, last.pricedQuantity) >= minCoverage);
}

export function seriesChange(points: ValuePoint[], minCoverage = 0.85) {
  const comparable = comparableTrendPoints(points, minCoverage);
  const first = comparable[0];
  const last = comparable[comparable.length - 1];
  if (!first || !last || comparable.length < 2 || first.date === last.date) return null;
  return {
    from: first.value,
    to: last.value,
    change: last.value - first.value,
    fromDate: first.date,
    toDate: last.date,
  };
}

export function groupBreakdown(
  rows: BreakdownInput[],
  options: { limit?: number; otherKey?: string; otherLabel?: string } = {},
): BreakdownRow[] {
  const limit = options.limit ?? ANALYTICS_BREAKDOWN_LIMIT;
  const otherKey = options.otherKey ?? "other";
  const otherLabel = options.otherLabel ?? "Other";

  const groups = new Map<string, { label: string; quantity: number; value: number | null }>();
  for (const row of rows) {
    const group = groups.get(row.key) ?? {
      label: row.label,
      quantity: 0,
      value: null,
    };
    group.quantity += row.quantity;
    if (row.value != null && Number.isFinite(row.value)) {
      group.value = (group.value ?? 0) + row.value;
    }
    groups.set(row.key, group);
  }

  const ranked = [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) => {
      const av = a.value;
      const bv = b.value;
      if (av == null && bv == null) return b.quantity - a.quantity || a.label.localeCompare(b.label);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (bv !== av) return bv - av;
      return b.quantity - a.quantity || a.label.localeCompare(b.label);
    });

  const pricedTotal = ranked.reduce((sum, row) => sum + (row.value ?? 0), 0);
  const withShare = (row: (typeof ranked)[number]): BreakdownRow => ({
    key: row.key,
    label: row.label,
    quantity: row.quantity,
    value: row.value,
    share: pricedTotal > 0 && row.value != null ? row.value / pricedTotal : null,
  });

  if (ranked.length <= limit) return ranked.map(withShare);

  const head = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  const restValue = rest.some((row) => row.value != null)
    ? rest.reduce((sum, row) => sum + (row.value ?? 0), 0)
    : null;
  return [
    ...head.map(withShare),
    withShare({
      key: otherKey,
      label: otherLabel,
      quantity: rest.reduce((sum, row) => sum + row.quantity, 0),
      value: restValue,
    }),
  ];
}

export function concentrationShare(lotValues: number[], topN = ANALYTICS_TOP_LOTS): Concentration {
  const priced = lotValues.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a);
  const total = priced.reduce((sum, value) => sum + value, 0);
  const topValue = priced.slice(0, topN).reduce((sum, value) => sum + value, 0);
  return {
    topValue,
    total,
    share: total > 0 ? topValue / total : null,
  };
}

export function averageLotValue(lotValues: Array<number | null>) {
  const priced = lotValues.filter((value): value is number => value != null && Number.isFinite(value));
  if (!priced.length) return null;
  return priced.reduce((sum, value) => sum + value, 0) / priced.length;
}

export function priceMovers(
  holdings: AnalyticsHolding[],
  history: PriceSnapshot[],
  current: CurrentMarket[],
): PriceMover[] {
  const firstByHolding = new Map<string, { date: string; market: number }>();
  for (const snap of history) {
    if (!Number.isFinite(snap.market)) continue;
    const key = holdingKey(snap.printingId, snap.finish);
    const previous = firstByHolding.get(key);
    if (!previous || snap.date < previous.date) {
      firstByHolding.set(key, { date: snap.date, market: snap.market });
    }
  }

  const currentByHolding = new Map<string, number>();
  for (const price of current) {
    if (price.market == null || !Number.isFinite(price.market)) continue;
    currentByHolding.set(holdingKey(price.printingId, price.finish), price.market);
  }

  const movers: PriceMover[] = [];
  for (const holding of holdings) {
    const key = holdingKey(holding.printingId, holding.finish);
    const first = firstByHolding.get(key);
    const to = currentByHolding.get(key);
    if (!first || to == null || first.market === to) continue;
    const unitChange = to - first.market;
    movers.push({
      printingId: holding.printingId,
      finish: holding.finish,
      quantity: holding.quantity,
      from: first.market,
      to,
      change: unitChange * holding.quantity,
      changePct: first.market !== 0 ? unitChange / first.market : null,
    });
  }

  return movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}
