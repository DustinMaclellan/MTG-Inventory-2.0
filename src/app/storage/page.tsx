import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { dateLocale, getMessages, isLocale } from "@/i18n";
import { formatMoney } from "@/lib/money";
import { getStorageOverview } from "@/services/inventory";
import { StorageLocationCard } from "./storage-location-card";

export const metadata = { title: "Storage" };

function money(value: number | null, currency: "USD" | "CAD" | "EUR", locale: "en" | "fr") {
  return value === null ? "—" : formatMoney(value, currency, locale);
}

export default async function StoragePage() {
  const { user, locations, summary } = await getStorageOverview();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const currency = user.preferredCurrency;
  const numbers = dateLocale(locale);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">{m.storage.eyebrow}</p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{m.storage.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">{m.storage.intro}</p>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={16} />
            {m.common.addCards}
          </Link>
        </header>

        {!locations.length ? (
          <div className="panel px-5 py-20 text-center">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/8 text-accent">
              <Archive size={22} />
            </div>
            <p className="font-semibold">{m.storage.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              {m.storage.emptyBody}
            </p>
            <Link href="/add" className="button-primary mt-6 text-sm">
              <Plus size={16} />
              {m.storage.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={m.storage.locations} value={summary.locationCount.toLocaleString(numbers)} />
              <Stat label={m.storage.cardsStored} value={summary.totalCards.toLocaleString(numbers)} />
              <Stat
                label={m.storage.storedValue}
                value={summary.hasPricedCards ? money(summary.totalValue, currency, locale) : "—"}
              />
              <Stat
                label={m.storage.unassigned}
                value={summary.unassignedCards.toLocaleString(numbers)}
                accent={summary.unassignedCards > 0 ? "text-amber-400" : undefined}
              />
            </section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {locations.map((location) => (
                <StorageLocationCard
                  key={location.name}
                  otherNames={locations
                    .filter((loc) => loc.name !== "Unassigned" && loc.name !== location.name)
                    .map((loc) => loc.name)}
                  location={{
                    name: location.name,
                    quantity: location.quantity,
                    lots: location.lots,
                    marketValue: money(location.marketValue, currency, locale),
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
