"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/i18n/provider";
import { interpolate, pickPlural } from "@/i18n";
import type { BreakdownRow, ValuePoint } from "@/lib/analytics";
import { formatAxisMoney, formatShare, shareBarWidth } from "@/lib/analytics-view";
import { formatMoney, type DisplayCurrency } from "@/lib/money";

function useAccentColor() {
  const [color, setColor] = useState("#4ade80");
  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (value) setColor(value);
  }, []);
  return color;
}

export function AnalyticsTrend({
  series,
  snapshotCount,
  currency,
}: {
  series: Array<ValuePoint & { label: string }>;
  snapshotCount: number;
  currency: DisplayCurrency;
}) {
  const { locale, m } = useI18n();
  const accent = useAccentColor();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article className="panel overflow-hidden">
      <div className="border-b border-white/6 px-5 py-4">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          {m.analytics.trendTitle}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{m.analytics.trendHint}</p>
      </div>
      {series.length < 2 ? (
        <p className="px-5 py-10 text-sm leading-6 text-zinc-500">{m.analytics.trendNeedSync}</p>
      ) : (
        <>
          <div className="h-64 px-2 pb-2 pt-4 sm:px-4">
            {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsValueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={36}
                />
                <YAxis
                  width={56}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatAxisMoney(value, currency, locale)}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.12)" }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      | (ValuePoint & { label: string })
                      | undefined;
                    if (!active || !point) return null;
                    return (
                      <div className="rounded-xl border border-white/10 bg-[#0c0f14] px-3 py-2 shadow-xl">
                        <p className="text-xs text-zinc-500">{point.label}</p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatMoney(point.value, currency, locale)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={2}
                  fill="url(#analyticsValueFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : null}
          </div>
          {snapshotCount < 3 ? (
            <p className="border-t border-white/6 px-5 py-3 text-xs text-zinc-600">
              {interpolate(
                snapshotCount === 1 ? m.analytics.trendSparse : m.analytics.trendSparsePlural,
                { count: String(snapshotCount) },
              )}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}

type BreakdownTab = {
  id: string;
  label: string;
  rows: BreakdownRow[];
};

export function AnalyticsBreakdown({
  tabs,
  currency,
}: {
  tabs: BreakdownTab[];
  currency: DisplayCurrency;
}) {
  const { locale, m } = useI18n();
  const [active, setActive] = useState(tabs[0]?.id ?? "set");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <article className="panel overflow-hidden">
      <div className="border-b border-white/6 px-5 py-4">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
          {m.analytics.breakdown}
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                tab.id === current?.id
                  ? "bg-accent/15 text-accent"
                  : "text-zinc-500 hover:bg-white/4 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {current?.rows.length ? (
        <div className="divide-y divide-white/5">
          {current.rows.map((row) => (
            <div key={row.key} className="px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{row.label}</p>
                <p className="shrink-0 text-sm font-semibold">
                  {formatMoney(row.value, currency, locale)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-zinc-600">
                {pickPlural(row.quantity, m.analytics.cardsInGroup, m.analytics.cardsInGroupPlural, {
                  count: row.quantity,
                })}
                {row.share != null
                  ? ` · ${interpolate(m.analytics.share, { pct: formatShare(row.share, locale) })}`
                  : ""}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${shareBarWidth(row.share)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-sm leading-6 text-zinc-500">{m.analytics.breakdownEmpty}</p>
      )}
    </article>
  );
}
