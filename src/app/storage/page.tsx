import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/money";
import { getStorageOverview } from "@/services/inventory";
import { StorageLocationCard } from "./storage-location-card";

export const metadata = { title: "Storage" };

function money(value: number | null, currency: "USD" | "CAD" | "EUR") {
  return value === null ? "—" : formatMoney(value, currency);
}

export default async function StoragePage() {
  const { user, locations, summary } = await getStorageOverview();
  const currency = user.preferredCurrency;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Physical locations</p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">Storage</h1>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={16} />
            Add cards
          </Link>
        </header>

        {!locations.length ? (
          <div className="panel px-5 py-20 text-center">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-400">
              <Archive size={22} />
            </div>
            <p className="font-semibold">No storage yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              Add a location when you log cards — Binder A, Deck box, closet shelf — and they will group here.
            </p>
            <Link href="/add" className="button-primary mt-6 text-sm">
              <Plus size={16} />
              Add your first card
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Locations" value={summary.locationCount.toLocaleString()} />
              <Stat label="Cards stored" value={summary.totalCards.toLocaleString()} />
              <Stat
                label="Stored value"
                value={summary.hasPricedCards ? money(summary.totalValue, currency) : "—"}
              />
              <Stat
                label="Unassigned"
                value={summary.unassignedCards.toLocaleString()}
                accent={summary.unassignedCards > 0 ? "text-amber-400" : undefined}
              />
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {locations.map((location) => (
                <StorageLocationCard
                  key={location.name}
                  location={{
                    name: location.name,
                    quantity: location.quantity,
                    lots: location.lots,
                    marketValue: money(location.marketValue, currency),
                    topCards: location.topCards.map((card) => ({
                      id: card.id,
                      imageSmallUrl: card.imageSmallUrl,
                    })),
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <article className="panel p-5">
      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={`mt-3 text-[1.375rem] font-semibold leading-none ${accent ?? ""}`}>{value}</p>
    </article>
  );
}
