import Link from "next/link";
import { Archive, ArrowUpRight, MapPin } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/money";
import { getStorageOverview } from "@/services/inventory";

export const metadata = { title: "Storage" };

export default async function StoragePage() {
  const { user, locations } = await getStorageOverview();
  const currency = user.preferredCurrency;

  return (
    <AppShell userName={user.displayName}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 max-w-2xl">
          <p className="text-sm text-zinc-500">Where your physical cards live</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Storage</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Storage is a free-text location you set when adding cards (for example{" "}
            <span className="text-zinc-300">Binder A / Page 3</span> or{" "}
            <span className="text-zinc-300">Deck box — blue</span>). This page groups your
            inventory by those labels so you can find what is where.
          </p>
        </header>

        {!locations.length ? (
          <div className="panel px-5 py-16 text-center">
            <Archive className="mx-auto text-zinc-600" size={28} />
            <p className="mt-4 font-medium">No inventory yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              Add cards and fill in the Storage field to start organizing physical locations.
            </p>
            <Link href="/add" className="button-primary mt-5 text-sm">
              Add cards
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {locations.map((location) => (
              <article key={location.name} className="panel overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="shrink-0 text-emerald-400" />
                      <h2 className="truncate font-medium">{location.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {location.quantity} card{location.quantity === 1 ? "" : "s"} · {location.lots}{" "}
                      lot{location.lots === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatMoney(location.marketValue, currency)}</p>
                    <Link
                      href={`/collection?storage=${encodeURIComponent(
                        location.name === "Unassigned" ? "unassigned" : location.name,
                      )}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400"
                    >
                      View lots <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
                <ul className="divide-y divide-white/6">
                  {location.topCards.map((card) => (
                    <li
                      key={card.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{card.name}</p>
                        <p className="text-xs text-zinc-500">
                          {card.setCode} #{card.collectorNumber} · ×{card.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-zinc-400">{formatMoney(card.value, currency)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
