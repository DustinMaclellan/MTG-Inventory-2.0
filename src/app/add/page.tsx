import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { addInventoryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { searchCatalog } from "@/services/catalog";

export const metadata = { title: "Add cards" };

export default async function AddCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; added?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const justAdded = params.added === "1";
  const results = query.length >= 2 ? await searchCatalog(query) : [];

  return (
    <AppShell userName={user.displayName}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Exact printing search</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Add cards</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Search by card name, set code, or collector number. Results and prices come from Scryfall.
          </p>
        </header>

        {justAdded && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} /> Added to your collection. Keep searching to add more.
            </span>
            <Link href="/collection" className="text-emerald-300 underline-offset-2 hover:underline">
              View collection
            </Link>
          </div>
        )}

        <form className="panel flex gap-3 p-3" action="/add">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
              size={19}
              aria-hidden
            />
            <input
              className="field field-with-icon"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Try “Rhystic Study”, “CMM”, or “161”…"
            />
          </div>
          <button className="button-primary px-5">Search</button>
        </form>

        {query && (
          <p className="my-5 text-sm text-zinc-500">
            {results.length} exact printings for “{query}”
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((printing) => {
            const usd = printing.currentPrices.find(
              (price) => price.currency === "USD" && price.finish === "NONFOIL",
            );
            return (
              <article
                key={printing.id}
                className="panel grid grid-cols-[92px_1fr] gap-4 overflow-hidden p-4"
              >
                <div className="relative aspect-[63/88] overflow-hidden rounded-lg bg-zinc-900">
                  {printing.imageSmallUrl && (
                    <Image
                      src={printing.imageSmallUrl}
                      alt=""
                      fill
                      sizes="92px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{printing.name}</h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {printing.set.name} ({printing.set.code.toUpperCase()})
                  </p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="capitalize text-zinc-500">
                      #{printing.collectorNumber} · {printing.rarity}
                    </span>
                    <span>{formatMoney(usd?.market?.toNumber() ?? null, "USD")}</span>
                  </div>
                  <form action={addInventoryAction} className="mt-4 grid grid-cols-2 gap-2">
                    <input type="hidden" name="cardPrintingId" value={printing.id} />
                    <input type="hidden" name="returnQuery" value={query} />
                    <input
                      className="field px-2 py-2 text-xs"
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      aria-label="Quantity"
                    />
                    <select className="field px-2 py-2 text-xs" name="finish" defaultValue={printing.finishes[0]}>
                      {printing.finishes.map((finish) => (
                        <option key={finish}>{finish}</option>
                      ))}
                    </select>
                    <select className="field px-2 py-2 text-xs" name="condition" defaultValue="NEAR_MINT">
                      <option value="NEAR_MINT">Near Mint</option>
                      <option value="LIGHTLY_PLAYED">Lightly Played</option>
                      <option value="MODERATELY_PLAYED">Moderately Played</option>
                      <option value="HEAVILY_PLAYED">Heavily Played</option>
                      <option value="DAMAGED">Damaged</option>
                    </select>
                    <input
                      className="field px-2 py-2 text-xs"
                      name="purchasePrice"
                      type="number"
                      min="0"
                      step=".01"
                      placeholder="Paid each"
                    />
                    <input
                      className="field col-span-2 px-2 py-2 text-xs"
                      name="storageLocation"
                      placeholder="Storage (optional)"
                    />
                    <button className="button-primary col-span-2 py-2 text-xs">Add exact printing</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
