import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Currency } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { dateLocale, getMessages, interpolate, isLocale } from "@/i18n";
import { formatMoney } from "@/lib/money";
import { getInventoryLot } from "@/services/inventory";
import { LotEditor } from "./lot-editor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await getInventoryLot(id);
  return { title: lot?.item.cardPrinting.name ?? "Lot" };
}

function rarityClass(rarity: string) {
  switch (rarity.toLowerCase()) {
    case "mythic":
      return "bg-orange-400/10 text-orange-300";
    case "rare":
      return "bg-yellow-400/10 text-yellow-300";
    case "uncommon":
      return "bg-zinc-100/8 text-zinc-300";
    default:
      return "bg-white/4 text-zinc-500";
  }
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await getInventoryLot(id);
  if (!lot) notFound();

  const { user, item, storageLocations } = lot;
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const printing = item.cardPrinting;
  const market =
    printing.currentPrices.find((price) => price.finish === item.finish)?.market?.toNumber() ?? null;
  const paid = item.purchasePrice?.toNumber() ?? null;
  const image = printing.imageNormalUrl ?? printing.imageSmallUrl;
  const storageHref = item.storageLocation
    ? `/collection?storage=${encodeURIComponent(item.storageLocation)}`
    : null;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href="/collection"
          className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← {m.collection.backToCollection}
        </Link>

        <header className="mt-3 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{printing.name}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {printing.set.name} · {printing.set.code.toUpperCase()} #{printing.collectorNumber}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="panel overflow-hidden p-4">
              <div className="relative mx-auto aspect-[63/88] w-full max-w-[220px] overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/8">
                {image && (
                  <Image
                    src={image}
                    alt={printing.name}
                    fill
                    sizes="220px"
                    className="object-cover"
                    priority
                  />
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize tracking-wide ${rarityClass(printing.rarity)}`}
                >
                  {printing.rarity}
                </span>
                {printing.artist && (
                  <p className="text-[11px] text-zinc-600">{printing.artist}</p>
                )}
              </div>
            </div>

            <div className="panel grid grid-cols-2 gap-4 p-5">
              <Stat
                label={m.collection.marketEach}
                value={formatMoney(market, user.preferredCurrency, locale)}
              />
              <Stat
                label={m.collection.lotValue}
                value={formatMoney(
                  market === null ? null : market * item.quantity,
                  user.preferredCurrency,
                  locale,
                )}
              />
              <Stat
                label={m.add.paidEach}
                value={formatMoney(paid, item.purchaseCurrency, locale)}
              />
              <Stat
                label={m.collection.cost}
                value={formatMoney(
                  paid === null ? null : paid * item.quantity,
                  item.purchaseCurrency,
                  locale,
                )}
              />
            </div>

            <p className="px-1 text-xs text-zinc-600">
              {interpolate(m.collection.addedOn, {
                date: item.createdAt.toLocaleDateString(dateLocale(locale)),
              })}
            </p>
            {storageHref && item.storageLocation && (
              <Link
                href={storageHref}
                className="inline-flex px-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {m.collection.viewStorage} → {item.storageLocation}
              </Link>
            )}
          </aside>

          <LotEditor
            key={item.updatedAt.toISOString()}
            itemId={item.id}
            name={printing.name}
            quantity={item.quantity}
            condition={item.condition}
            finish={item.finish}
            finishes={printing.finishes}
            purchasePrice={paid}
            purchaseCurrency={item.purchaseCurrency}
            purchaseDate={item.purchaseDate?.toISOString().slice(0, 10) ?? ""}
            purchaseSource={item.purchaseSource ?? ""}
            storageLocation={item.storageLocation ?? ""}
            notes={item.notes ?? ""}
            language={item.language}
            storageLocations={storageLocations}
            currencies={["USD", "CAD", "EUR"] satisfies Currency[]}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
