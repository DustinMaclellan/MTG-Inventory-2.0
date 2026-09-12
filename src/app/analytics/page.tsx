import Image from "next/image";
import Link from "next/link";
import { Clock3, Plus, Sparkles } from "lucide-react";
import { AnalyticsBreakdown, AnalyticsTrend } from "@/components/analytics-charts";
import { AppShell } from "@/components/app-shell";
import { dateLocale, getMessages, interpolate, isLocale, type Messages } from "@/i18n";
import { formatUtcDayLabel } from "@/lib/analytics";
import {
  formatMoverPercent,
  formatShare,
  gainTone,
  splitMovers,
  translateBreakdown,
} from "@/lib/analytics-view";
import { formatMoney } from "@/lib/money";
import { getAnalytics, type AnalyticsMover } from "@/services/analytics";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const {
    user,
    empty,
    totals,
    lastPriceUpdate,
    series,
    seriesDelta,
    snapshotCount,
    averageLot,
    concentration,
    breakdowns,
    topLots,
    movers,
  } = await getAnalytics();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const currency = user.preferredCurrency;
  const numbers = dateLocale(locale);
  const gainToneClass = gainTone(totals.unrealizedGain);
  const trendTone = gainTone(seriesDelta?.change ?? null);
  const { gained, lost } = splitMovers(movers);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm text-zinc-500">{m.analytics.eyebrow}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{m.analytics.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">{m.analytics.intro}</p>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={16} />
            {m.common.addCards}
          </Link>
        </header>

        {empty ? (
          <EmptyState m={m} />
        ) : (
          <>
            <section className="panel relative overflow-hidden p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-[350px] w-[350px] rounded-full bg-accent/6 blur-[80px]"
                aria-hidden
              />
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                {m.analytics.totalValue}
              </p>
              <div className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatMoney(totals.marketValue, currency, locale)}
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <span
                  className={`flex items-center gap-1.5 font-medium ${
                    gainToneClass === "up" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {totals.unrealizedGain === null
                    ? "—"
                    : `${gainToneClass === "up" ? "+" : ""}${formatMoney(totals.unrealizedGain, currency, locale)} ${m.dashboard.unrealized}`}
                </span>
                {seriesDelta ? (
                  <span className={`font-medium ${trendTone === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                    {`${trendTone === "up" ? "+" : ""}${formatMoney(seriesDelta.change, currency, locale)} ${interpolate(
                      m.analytics.changeSince,
                      { date: formatUtcDayLabel(seriesDelta.fromDate, locale) },
                    )}`}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <Clock3 size={13} />
                  {lastPriceUpdate
                    ? interpolate(m.dashboard.pricesUpdated, {
                        date: lastPriceUpdate.toLocaleDateString(numbers),
                      })
                    : m.dashboard.pricesNotSynced}
                </span>
              </div>
            </section>

            <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: m.dashboard.totalCards,
                  value: totals.totalQuantity.toLocaleString(numbers),
                },
                {
                  label: m.dashboard.costBasis,
                  value: formatMoney(totals.costBasis, currency, locale),
                },
                {
                  label: m.analytics.avgLot,
                  value: formatMoney(averageLot, currency, locale),
                },
                {
                  label: m.analytics.topShare,
                  value: formatShare(concentration.share, locale),
                },
              ].map(({ label, value }) => (
                <article key={label} className="panel p-5">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-3 text-[1.375rem] font-semibold leading-none">{value}</p>
                </article>
              ))}
            </section>

            <section className="mt-5">
              <AnalyticsTrend series={series} snapshotCount={snapshotCount} currency={currency} />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <AnalyticsBreakdown
                currency={currency}
                tabs={[
                  {
                    id: "set",
                    label: m.analytics.bySet,
                    rows: translateBreakdown(breakdowns.set, m, "set"),
                  },
                  {
                    id: "finish",
                    label: m.analytics.byFinish,
                    rows: translateBreakdown(breakdowns.finish, m, "finish"),
                  },
                  {
                    id: "condition",
                    label: m.analytics.byCondition,
                    rows: translateBreakdown(breakdowns.condition, m, "condition"),
                  },
                  {
                    id: "storage",
                    label: m.analytics.byStorage,
                    rows: translateBreakdown(breakdowns.storage, m, "storage"),
                  },
                ]}
              />

              <article className="panel overflow-hidden">
                <div className="border-b border-white/6 px-5 py-4">
                  <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                    {m.analytics.topLots}
                  </h2>
                </div>
                {topLots.length ? (
                  <div className="divide-y divide-white/5">
                    {topLots.map((lot) => (
                      <Link
                        key={lot.id}
                        href={`/collection?lot=${lot.id}`}
                        className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[.015] transition-colors"
                      >
                        {lot.imageSmallUrl ? (
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-900 shadow-md">
                            <Image
                              src={lot.imageSmallUrl}
                              alt={lot.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lot.name}</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-600">
                            {lot.setName} · {m.finish[lot.finish]} · {lot.quantity}{" "}
                            {lot.quantity === 1 ? m.dashboard.copy : m.dashboard.copies}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatMoney(lot.value, currency, locale)}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-5 py-8 text-sm leading-6 text-zinc-500">
                    {m.analytics.topLotsEmpty}
                  </p>
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <MoverList
                title={m.analytics.gained}
                empty={m.analytics.moversEmpty}
                movers={gained}
                currency={currency}
                locale={locale}
                m={m}
              />
              <MoverList
                title={m.analytics.lost}
                empty={m.analytics.moversEmpty}
                movers={lost}
                currency={currency}
                locale={locale}
                m={m}
              />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MoverList({
  title,
  empty,
  movers,
  currency,
  locale,
  m,
}: {
  title: string;
  empty: string;
  movers: AnalyticsMover[];
  currency: "USD" | "CAD" | "EUR";
  locale: "en" | "fr";
  m: Messages;
}) {
  return (
    <article className="panel overflow-hidden">
      <div className="border-b border-white/6 px-5 py-4">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{m.analytics.moversHint}</p>
      </div>
      {movers.length ? (
        <div className="divide-y divide-white/5">
          {movers.map((mover) => {
            const up = mover.change > 0;
            return (
              <Link
                key={`${mover.id}-${mover.finish}`}
                href={`/collection?lot=${mover.id}`}
                className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[.015] transition-colors"
              >
                {mover.imageSmallUrl ? (
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-900 shadow-md">
                    <Image
                      src={mover.imageSmallUrl}
                      alt={mover.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mover.name}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-600">
                    {mover.setName} · {m.finish[mover.finish]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                    {`${up ? "+" : ""}${formatMoney(mover.change, currency, locale)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {formatMoverPercent(mover.changePct, locale)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-5 py-8 text-sm leading-6 text-zinc-500">{empty}</p>
      )}
    </article>
  );
}

function EmptyState({ m }: { m: Messages }) {
  return (
    <div className="panel px-5 py-20 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/8 text-accent">
        <Sparkles size={22} />
      </div>
      <p className="font-semibold">{m.analytics.emptyTitle}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">{m.analytics.emptyBody}</p>
      <Link href="/add" className="button-primary mt-6 text-sm">
        <Plus size={16} />
        {m.analytics.emptyCta}
      </Link>
    </div>
  );
}
