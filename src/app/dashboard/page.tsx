import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Plus, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireEntitlement } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getDashboard } from "@/services/inventory";

export const metadata = { title: "Dashboard" };

function greeting(name: string) {
  const hour = new Date().getUTCHours();
  // UTC-based — close enough for a friendly label
  const salutation =
    hour < 5 ? "Working late" :
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    "Good evening";
  return `${salutation}, ${name.split(" ")[0]}`;
}

export default async function DashboardPage() {
  const user = await requireEntitlement();
  const { items, totals, uniqueCards, mostValuable, lastPriceUpdate } = await getDashboard();
  const currency = user.preferredCurrency;

  const gainPositive = totals.unrealizedGain !== null && totals.unrealizedGain >= 0;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm text-zinc-500">{greeting(user.displayName)}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Your collection</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/collection"
              className="panel flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Search size={16} />
              Search collection
            </Link>
            <Link href="/add" className="button-primary text-sm">
              <Plus size={16} />
              Add cards
            </Link>
          </div>
        </header>

        {/* Total value hero */}
        <section className="panel relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-[350px] w-[350px] rounded-full bg-emerald-400/6 blur-[80px]"
            aria-hidden
          />
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
            Total collection value
          </p>
          <div className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatMoney(totals.marketValue, currency)}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                gainPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {totals.unrealizedGain === null
                ? "—"
                : `${gainPositive ? "+" : ""}${formatMoney(totals.unrealizedGain, currency)} unrealized`}
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Clock3 size={13} />
              {lastPriceUpdate
                ? `Prices updated ${lastPriceUpdate.toLocaleDateString()}`
                : "Prices not synced yet"}
            </span>
          </div>
        </section>

        {/* Stat cards */}
        <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total cards", value: totals.totalQuantity.toLocaleString() },
            { label: "Unique cards", value: uniqueCards.toLocaleString() },
            { label: "Cost basis", value: formatMoney(totals.costBasis, currency) },
            {
              label: "Priced copies",
              value:
                totals.totalQuantity > 0
                  ? `${totals.pricedQuantity} / ${totals.totalQuantity}`
                  : "—",
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

        {/* Recent + largest position */}
        <section className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          {/* Recently added */}
          <article className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
              <h2 className="text-sm font-semibold">Recently added</h2>
              <Link
                href="/collection"
                className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {items.length ? (
              <div className="divide-y divide-white/5">
                {items.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-white/[.015] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.cardPrinting.name}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-600">
                        {item.cardPrinting.set.name} · #{item.cardPrinting.collectorNumber} ·{" "}
                        {item.finish.charAt(0) + item.finish.slice(1).toLowerCase()}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-white/6 bg-white/4 px-2.5 py-1 text-xs font-medium text-zinc-400">
                      × {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </article>

          {/* Largest position */}
          <article className="panel overflow-hidden">
            <div className="border-b border-white/6 px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                Largest position
              </p>
            </div>
            {mostValuable ? (
              <div className="flex gap-4 p-5">
                {mostValuable.item.cardPrinting.imageSmallUrl && (
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-lg">
                    <Image
                      src={mostValuable.item.cardPrinting.imageSmallUrl}
                      alt={mostValuable.item.cardPrinting.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex flex-col justify-between">
                  <div>
                    <h2 className="font-semibold leading-tight">
                      {mostValuable.item.cardPrinting.name}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {mostValuable.item.cardPrinting.set.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {mostValuable.item.quantity}{" "}
                      {mostValuable.item.quantity === 1 ? "copy" : "copies"} ·{" "}
                      {mostValuable.item.finish.charAt(0) + mostValuable.item.finish.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">
                    {formatMoney(mostValuable.value, currency)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="px-5 py-8 text-sm leading-6 text-zinc-500">
                Your largest position by market value will appear here once prices are synced.
              </p>
            )}
          </article>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-400">
        <Sparkles size={22} />
      </div>
      <p className="font-semibold">Your ledger is ready.</p>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
        Search exact Scryfall printings and log your first physical card.
      </p>
      <Link href="/add" className="button-primary mt-6 text-sm">
        <Plus size={16} />
        Add your first card
      </Link>
    </div>
  );
}
