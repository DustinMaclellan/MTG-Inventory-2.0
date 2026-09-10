import Image from "next/image";
import { ArrowUpRight, Clock3, Plus, Search } from "lucide-react";
import { dateLocale, interpolate, type Messages } from "@/i18n";
import type { AppLocale } from "@/i18n/config";
import { formatMoney } from "@/lib/money";

const JEWELED_LOTUS = {
  name: "Jeweled Lotus",
  set: "Commander Masters",
  number: "396",
  image: "https://cards.scryfall.io/small/front/d/7/d7183700-6941-4a3d-a581-4f33bea795e9.jpg?1783915595",
  value: 79.17,
};

const RECENT = [
  { name: "Marsh Flats", set: "Modern Horizons 2", number: "248", finish: "FOIL" as const, qty: 1 },
  { name: "Jeweled Lotus", set: "Commander Masters", number: "396", finish: "FOIL" as const, qty: 1 },
  { name: "Rhystic Study", set: "Jumpstart 2022", number: "114", finish: "NONFOIL" as const, qty: 1 },
  { name: "Sol Ring", set: "Commander Masters", number: "410", finish: "NONFOIL" as const, qty: 2 },
];

export function LandingDashboardPreview({
  locale,
  m,
}: {
  locale: AppLocale;
  m: Messages;
}) {
  return (
    <div className="pointer-events-none select-none" aria-hidden>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{interpolate(m.dashboard.greetingMorning, { name: "Alex" })}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">{m.dashboard.yourCollection}</p>
        </div>
        <div className="flex gap-2">
          <span className="panel flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400">
            <Search size={16} />
            {m.dashboard.searchCollection}
          </span>
          <span className="button-primary text-sm">
            <Plus size={16} />
            {m.common.addCards}
          </span>
        </div>
      </div>

      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[350px] w-[350px] rounded-full bg-emerald-400/6 blur-[80px]"
        />
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          {m.dashboard.totalValue}
        </p>
        <div className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {formatMoney(4217.5, "USD", locale)}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            +{formatMoney(2277.5, "USD", locale)} {m.dashboard.unrealized}
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Clock3 size={13} />
            {interpolate(m.dashboard.pricesUpdated, {
              date: new Date(2026, 8, 9).toLocaleDateString(dateLocale(locale)),
            })}
          </span>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: m.dashboard.totalCards, value: "48" },
          { label: m.dashboard.uniqueCards, value: "31" },
          { label: m.dashboard.costBasis, value: formatMoney(1940, "USD", locale) },
          { label: m.dashboard.pricedCopies, value: "46 / 48" },
        ].map(({ label, value }) => (
          <article key={label} className="panel p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">{label}</p>
            <p className="mt-3 text-[1.375rem] font-semibold leading-none">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <article className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
            <h2 className="text-sm font-semibold">{m.dashboard.recentlyAdded}</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
              {m.dashboard.viewAll} <ArrowUpRight size={12} />
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {RECENT.map((item) => (
              <div
                key={`${item.name}-${item.number}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-600">
                    {item.set} · #{item.number} · {m.finish[item.finish]}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-white/6 bg-white/4 px-2.5 py-1 text-xs font-medium text-zinc-400">
                  × {item.qty}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-white/6 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
              {m.dashboard.largestPosition}
            </p>
          </div>
          <div className="flex gap-4 p-5">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-lg">
              <Image
                src={JEWELED_LOTUS.image}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex flex-col justify-between">
              <div>
                <h2 className="font-semibold leading-tight">{JEWELED_LOTUS.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{JEWELED_LOTUS.set}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  1 {m.dashboard.copy} · {m.finish.FOIL}
                </p>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {formatMoney(JEWELED_LOTUS.value, "USD", locale)}
              </p>
            </div>
          </div>
        </article>
      </section>

      <p className="mt-4 text-right text-xs text-zinc-700">{m.marketing.mockExample}</p>
    </div>
  );
}
