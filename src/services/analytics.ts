import "server-only";

import { PriceProvider, type Condition, type Finish } from "@prisma/client";
import {
  ANALYTICS_BREAKDOWN_LIMIT,
  ANALYTICS_HISTORY_DAYS,
  ANALYTICS_TOP_LOTS,
  addUtcDays,
  averageLotValue,
  collectionValueSeries,
  comparableTrendPoints,
  concentrationShare,
  formatUtcDayLabel,
  groupBreakdown,
  holdingKey,
  priceMovers,
  seriesChange,
  utcDayKey,
  type BreakdownRow,
  type PriceMover,
  type ValuePoint,
} from "@/lib/analytics";
import { db } from "@/lib/db";
import { displayFx, storedMarketCurrency, toDisplayMarket } from "@/lib/pricing";
import { getDashboard } from "@/services/inventory";

function numericMarket(market: { toNumber(): number } | number | null | undefined) {
  if (market == null) return null;
  return typeof market === "number" ? market : market.toNumber();
}

export type AnalyticsLot = {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
  condition: Condition;
  quantity: number;
  value: number | null;
  imageSmallUrl: string | null;
};

export type AnalyticsMover = PriceMover & {
  id: string;
  name: string;
  setName: string;
  finish: Finish;
  imageSmallUrl: string | null;
};

export type AnalyticsPayload = {
  user: Awaited<ReturnType<typeof getDashboard>>["user"];
  empty: boolean;
  totals: Awaited<ReturnType<typeof getDashboard>>["totals"];
  uniqueCards: number;
  lastPriceUpdate: Date | null;
  series: Array<ValuePoint & { label: string }>;
  seriesDelta: ReturnType<typeof seriesChange>;
  historyDays: number;
  snapshotCount: number;
  averageLot: number | null;
  concentration: ReturnType<typeof concentrationShare>;
  breakdowns: {
    set: BreakdownRow[];
    finish: BreakdownRow[];
    condition: BreakdownRow[];
    storage: BreakdownRow[];
  };
  topLots: AnalyticsLot[];
  movers: AnalyticsMover[];
};

export async function getAnalytics(): Promise<AnalyticsPayload> {
  const { user, items, totals, uniqueCards, lastPriceUpdate } = await getDashboard();
  const today = utcDayKey(new Date());
  const empty = items.length === 0;

  const lotRows = items.map((item) => {
    const market = numericMarket(
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market,
    );
    return {
      id: item.id,
      printingId: item.cardPrintingId,
      name: item.cardPrinting.name,
      setName: item.cardPrinting.set.name,
      setCode: item.cardPrinting.set.code,
      collectorNumber: item.cardPrinting.collectorNumber,
      finish: item.finish,
      condition: item.condition,
      quantity: item.quantity,
      storage: item.storageLocation?.trim() || "",
      value: market == null ? null : market * item.quantity,
      market,
      imageSmallUrl: item.cardPrinting.imageSmallUrl,
    };
  });

  const holdingsMap = new Map<string, { printingId: string; finish: Finish; quantity: number }>();
  const currentMap = new Map<string, { printingId: string; finish: Finish; market: number | null }>();
  const lotByKey = new Map<string, (typeof lotRows)[number]>();
  for (const lot of lotRows) {
    const key = holdingKey(lot.printingId, lot.finish);
    const existing = holdingsMap.get(key);
    if (existing) existing.quantity += lot.quantity;
    else holdingsMap.set(key, { printingId: lot.printingId, finish: lot.finish, quantity: lot.quantity });
    if (!currentMap.has(key)) {
      currentMap.set(key, { printingId: lot.printingId, finish: lot.finish, market: lot.market });
    }
    const linked = lotByKey.get(key);
    if (!linked || (lot.value ?? -1) > (linked.value ?? -1)) lotByKey.set(key, lot);
  }
  const holdings = [...holdingsMap.values()];
  const current = [...currentMap.values()];

  const printingIds = [...new Set(lotRows.map((lot) => lot.printingId))];
  const fx = await displayFx(user.preferredCurrency);
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);
  const since = new Date(`${addUtcDays(today, -ANALYTICS_HISTORY_DAYS)}T00:00:00.000Z`);

  const historyRows =
    printingIds.length === 0
      ? []
      : await db.priceHistory.findMany({
          where: {
            cardPrintingId: { in: printingIds },
            provider: PriceProvider.SCRYFALL,
            currency: storedCurrency,
            snapshotDate: { gte: since },
          },
          select: {
            cardPrintingId: true,
            finish: true,
            snapshotDate: true,
            market: true,
          },
        });

  const history = historyRows.flatMap((row) => {
    const market = toDisplayMarket(row.market, fx);
    if (market == null) return [];
    return [
      {
        printingId: row.cardPrintingId,
        finish: row.finish,
        date: utcDayKey(row.snapshotDate),
        market,
      },
    ];
  });

  const locale = user.preferredLocale === "fr" ? "fr" : "en";
  const rawSeries = collectionValueSeries(holdings, history, { date: today, prices: current });
  const series = comparableTrendPoints(rawSeries).map((point) => ({
    ...point,
    label: formatUtcDayLabel(point.date, locale),
  }));
  const snapshotCount = new Set(history.map((row) => row.date)).size;
  const lotValues = lotRows.map((lot) => lot.value);
  const otherLabel = "Other";

  const movers = priceMovers(holdings, history, current);

  return {
    user,
    empty,
    totals,
    uniqueCards,
    lastPriceUpdate,
    series,
    seriesDelta: seriesChange(series),
    historyDays: ANALYTICS_HISTORY_DAYS,
    snapshotCount,
    averageLot: averageLotValue(lotValues),
    concentration: concentrationShare(
      lotValues.filter((value): value is number => value != null),
      ANALYTICS_TOP_LOTS,
    ),
    breakdowns: {
      set: groupBreakdown(
        lotRows.map((lot) => ({
          key: lot.setCode,
          label: lot.setName,
          quantity: lot.quantity,
          value: lot.value,
        })),
        { limit: ANALYTICS_BREAKDOWN_LIMIT, otherLabel },
      ),
      finish: groupBreakdown(
        lotRows.map((lot) => ({
          key: lot.finish,
          label: lot.finish,
          quantity: lot.quantity,
          value: lot.value,
        })),
        { limit: ANALYTICS_BREAKDOWN_LIMIT, otherLabel },
      ),
      condition: groupBreakdown(
        lotRows.map((lot) => ({
          key: lot.condition,
          label: lot.condition,
          quantity: lot.quantity,
          value: lot.value,
        })),
        { limit: ANALYTICS_BREAKDOWN_LIMIT, otherLabel },
      ),
      storage: groupBreakdown(
        lotRows.map((lot) => ({
          key: lot.storage || "unassigned",
          label: lot.storage || "unassigned",
          quantity: lot.quantity,
          value: lot.value,
        })),
        { limit: ANALYTICS_BREAKDOWN_LIMIT, otherLabel },
      ),
    },
    topLots: [...lotRows]
      .filter((lot): lot is typeof lot & { value: number } => lot.value != null)
      .sort((a, b) => b.value - a.value)
      .slice(0, ANALYTICS_TOP_LOTS)
      .map((lot) => ({
        id: lot.id,
        name: lot.name,
        setName: lot.setName,
        setCode: lot.setCode,
        collectorNumber: lot.collectorNumber,
        finish: lot.finish,
        condition: lot.condition,
        quantity: lot.quantity,
        value: lot.value,
        imageSmallUrl: lot.imageSmallUrl,
      })),
    movers: movers.flatMap((mover) => {
      const lot = lotByKey.get(holdingKey(mover.printingId, mover.finish));
      if (!lot) return [];
      return [
        {
          ...mover,
          finish: lot.finish,
          id: lot.id,
          name: lot.name,
          setName: lot.setName,
          imageSmallUrl: lot.imageSmallUrl,
        },
      ];
    }),
  };
}
