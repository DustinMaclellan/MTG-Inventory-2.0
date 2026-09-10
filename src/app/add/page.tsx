import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { addInventoryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { requireEntitlement } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { searchCatalog } from "@/services/catalog";

export const metadata = { title: "Add cards" };

function rarityColor(rarity: string) {
  switch (rarity.toLowerCase()) {
    case "mythic":    return "text-orange-400";
    case "rare":      return "text-yellow-400";
    case "uncommon":  return "text-zinc-300";
    default:          return "text-zinc-600";
  }
}

export default async function AddCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; added?: string }>;
}) {
  const user = await requireEntitlement();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const justAdded = params.added === "1";
  const results = query.length >= 2 ? await searchCatalog(query) : [];

  return (
    <AppShell user={user}>
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
            const market = usd?.market?.toNumber() ?? null;
            return (
              <article key={printing.id} className="panel overflow-hidden">
                {/* Card header: image + identity */}
                <div className="flex gap-4 p-4 pb-3">
                  <div className="relative aspect-[63/88] w-[88px] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-md">
                    {printing.imageSmallUrl && (
                      <Image
                        src={printing.imageSmallUrl}
                        alt=""
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col justify-between py-0.5">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold leading-snug">{printing.name}</h2>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {printing.set.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">
                        {printing.set.code.toUpperCase()} · #{printing.collectorNumber}
                      </p>
                      <span className={`mt-1.5 inline-block text-[11px] font-medium capitalize ${rarityColor(printing.rarity)}`}>
                        {printing.rarity}
                      </span>
                    </div>
                    <div className="mt-3">
                      {market !== null ? (
                        <span className="text-sm font-semibold">{formatMoney(market, "USD")}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">Pricing unavailable</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/6" />

                {/* Add form */}
                <form action={addInventoryAction} className="grid grid-cols-2 gap-2.5 p-4">
                  <input type="hidden" name="cardPrintingId" value={printing.id} />
                  <input type="hidden" name="returnQuery" value={query} />

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Qty</label>
                    <input
                      className="field py-2 px-3 text-sm"
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      aria-label="Quantity"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Finish</label>
                    <select className="field py-2 px-3 text-sm" name="finish" defaultValue={printing.finishes[0]}>
                      {printing.finishes.map((finish) => (
                        <option key={finish} value={finish}>{finish.charAt(0) + finish.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Condition</label>
                    <select className="field py-2 px-3 text-sm" name="condition" defaultValue="NEAR_MINT">
                      <option value="NEAR_MINT">Near Mint</option>
                      <option value="LIGHTLY_PLAYED">Lightly Played</option>
                      <option value="MODERATELY_PLAYED">Moderately Played</option>
                      <option value="HEAVILY_PLAYED">Heavily Played</option>
                      <option value="DAMAGED">Damaged</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Paid each</label>
                    <input
                      className="field py-2 px-3 text-sm"
                      name="purchasePrice"
                      type="number"
                      min="0"
                      step=".01"
                      placeholder="$ —"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Storage location</label>
                    <input
                      className="field py-2 px-3 text-sm"
                      name="storageLocation"
                      placeholder="Binder A, Box 2… (optional)"
                    />
                  </div>
                  <button className="button-primary col-span-2 py-2.5 text-sm">
                    Add to collection
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
