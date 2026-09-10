import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { addInventoryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { getMessages, interpolate, isLocale } from "@/i18n";
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
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const justAdded = params.added === "1";
  const results = query.length >= 2 ? await searchCatalog(query) : [];

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">{m.add.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{m.add.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {m.add.intro}
          </p>
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
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
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
                        <span className="text-sm font-semibold">{formatMoney(market, "USD", locale)}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">{m.common.pricingUnavailable}</span>
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
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.add.qty}</label>
                    <input
                      className="field py-2 px-3 text-sm"
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      aria-label={m.add.quantity}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.add.finish}</label>
                    <select className="field py-2 px-3 text-sm" name="finish" defaultValue={printing.finishes[0]}>
                      {printing.finishes.map((finish) => (
                        <option key={finish} value={finish}>{m.finish[finish as keyof typeof m.finish]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.add.condition}</label>
                    <select className="field py-2 px-3 text-sm" name="condition" defaultValue="NEAR_MINT">
                      <option value="NEAR_MINT">{m.condition.NEAR_MINT}</option>
                      <option value="LIGHTLY_PLAYED">{m.condition.LIGHTLY_PLAYED}</option>
                      <option value="MODERATELY_PLAYED">{m.condition.MODERATELY_PLAYED}</option>
                      <option value="HEAVILY_PLAYED">{m.condition.HEAVILY_PLAYED}</option>
                      <option value="DAMAGED">{m.condition.DAMAGED}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.add.paidEach}</label>
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
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.add.storageLocation}</label>
                    <input
                      className="field py-2 px-3 text-sm"
                      name="storageLocation"
                      placeholder={m.add.storageHint}
                    />
                  </div>
                  <button className="button-primary col-span-2 py-2.5 text-sm">
                    {m.add.addToCollection}
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
