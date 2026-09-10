import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getMessages, interpolate, isLocale } from "@/i18n";
import { requireEntitlement } from "@/lib/auth";
import { displayFx, storedMarketCurrency, toDisplayMarket } from "@/lib/pricing";
import { searchCatalog } from "@/services/catalog";
import { AddPrintingCard } from "./add-printing-card";

export const metadata = { title: "Add cards" };

export default async function AddCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; added?: string }>;
}) {
  const user = await requireEntitlement();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const justAdded = params.added === "1";
  const results = query.length >= 2 ? await searchCatalog(query) : [];
  const currency = user.preferredCurrency;
  const fx = await displayFx(currency);
  const storedCurrency = storedMarketCurrency(currency);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">{m.add.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{m.add.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{m.add.intro}</p>
        </header>

        {justAdded && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} /> {m.add.added}
            </span>
            <Link href="/collection" className="text-emerald-300 underline-offset-2 hover:underline">
              {m.add.viewCollection}
            </Link>
          </div>
        )}

        <form className="panel flex gap-3 p-3" action="/add">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
              size={19}
              aria-hidden
            />
            <input
              className="field field-with-icon"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder={m.add.searchExample}
            />
          </div>
          <button className="button-primary px-5">{m.common.search}</button>
        </form>

        {query && (
          <p className="my-5 text-sm text-zinc-500">
            {interpolate(m.add.results, { count: results.length, query })}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((printing) => (
            <AddPrintingCard
              key={printing.id}
              printingId={printing.id}
              name={printing.name}
              setName={printing.set.name}
              setCode={printing.set.code}
              collectorNumber={printing.collectorNumber}
              rarity={printing.rarity}
              imageSmallUrl={printing.imageSmallUrl}
              finishes={printing.finishes}
              currency={currency}
              query={query}
              prices={printing.currentPrices
                .filter((price) => price.currency === storedCurrency)
                .map((price) => ({
                  finish: price.finish,
                  market: toDisplayMarket(price.market, fx),
                }))}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
