import Link from "next/link";
import { ArrowUpRight, Clock3, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/money";
import { getDashboard } from "@/services/inventory";

export default async function Home() {
  const { user, items, totals, uniqueCards, mostValuable, lastPriceUpdate } =
    await getDashboard();
  const currency = user.preferredCurrency;

  return (
    <AppShell userName={user.displayName}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-1 text-sm text-zinc-500">Good evening, {user.displayName}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Your collection</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/collection" className="panel flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300">
              <Search size={17} /> Browse
            </Link>
            <Link href="/add" className="button-primary text-sm"><Plus size={17} /> Add cards</Link>
          </div>
        </header>

        <section className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-24 -top-32 size-80 rounded-full bg-emerald-400/8 blur-3xl" />
          <p className="text-sm font-medium text-zinc-500">Total collection value</p>
          <div className="mt-2 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
            {formatMoney(totals.marketValue, currency)}
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            <span className={totals.unrealizedGain !== null && totals.unrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {totals.unrealizedGain === null ? "Gain unavailable" : `${formatMoney(totals.unrealizedGain, currency)} unrealized`}
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Clock3 size={14} />
              {lastPriceUpdate ? `Updated ${lastPriceUpdate.toLocaleDateString()}` : "No market prices synced"}
            </span>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Total cards", totals.totalQuantity.toLocaleString()],
            ["Unique cards", uniqueCards.toLocaleString()],
            ["Cost basis", formatMoney(totals.costBasis, currency)],
            ["Priced copies", `${totals.pricedQuantity} / ${totals.totalQuantity}`],
          ].map(([label, value]) => (
            <article key={label} className="panel p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-600">{label}</p>
              <p className="mt-3 text-xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <article className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <h2 className="font-medium">Recently added</h2>
              <Link href="/collection" className="flex items-center gap-1 text-xs text-emerald-400">View all <ArrowUpRight size={13} /></Link>
            </div>
            {items.length ? (
              <div className="divide-y divide-white/6">
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
                    <div>
                      <p className="font-medium">{item.cardPrinting.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.cardPrinting.set.name} · #{item.cardPrinting.collectorNumber} · {item.finish.toLowerCase()}</p>
                    </div>
                    <span className="self-center text-sm text-zinc-400">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState />}
          </article>
          <article className="panel p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Largest position</p>
            {mostValuable ? (
              <>
                <h2 className="mt-5 text-xl font-semibold">{mostValuable.item.cardPrinting.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{mostValuable.item.cardPrinting.set.name}</p>
                <p className="mt-8 text-3xl font-semibold">{formatMoney(mostValuable.value, currency)}</p>
              </>
            ) : <p className="mt-5 text-sm leading-6 text-zinc-500">A largest position will appear after market pricing is available.</p>}
          </article>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-medium">Your ledger is ready.</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">Search real Scryfall printings and add your first physical card.</p>
      <Link href="/add" className="button-primary mt-5 text-sm">Add your first card</Link>
    </div>
  );
}
