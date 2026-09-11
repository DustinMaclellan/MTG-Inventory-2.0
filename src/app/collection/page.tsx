import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { Currency } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { CollectionTable, type CollectionRow } from "@/components/collection-table";
import { getMessages, interpolate, isLocale, pickPlural } from "@/i18n";
import { requireEntitlement } from "@/lib/auth";
import { getInventory, getInventoryLot } from "@/services/inventory";

export const metadata = { title: "Collection" };

function buildCollectionHref(params: {
  page?: number; q?: string; storage?: string; condition?: string; finish?: string;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.storage) search.set("storage", params.storage);
  if (params.condition) search.set("condition", params.condition);
  if (params.finish) search.set("finish", params.finish);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/collection?${query}` : "/collection";
}

function toCollectionRow(item: {
  id: string;
  quantity: number;
  condition: CollectionRow["condition"];
  finish: CollectionRow["finish"];
  language: string;
  purchasePrice: { toNumber(): number } | number | null;
  purchaseCurrency: Currency;
  purchaseDate: Date | null;
  purchaseSource: string | null;
  storageLocation: string | null;
  notes: string | null;
  cardPrinting: {
    name: string;
    collectorNumber: string;
    imageSmallUrl: string | null;
    imageNormalUrl: string | null;
    finishes: CollectionRow["finish"][];
    set: { name: string; code: string };
    currentPrices: Array<{ finish: CollectionRow["finish"]; market: { toNumber(): number } | number | null }>;
  };
}): CollectionRow {
  return {
    id: item.id,
    quantity: item.quantity,
    condition: item.condition,
    finish: item.finish,
    language: item.language,
    purchasePrice:
      item.purchasePrice == null
        ? null
        : typeof item.purchasePrice === "number"
          ? item.purchasePrice
          : item.purchasePrice.toNumber(),
    purchaseCurrency: item.purchaseCurrency,
    purchaseDate: item.purchaseDate?.toISOString().slice(0, 10) ?? "",
    purchaseSource: item.purchaseSource ?? "",
    storageLocation: item.storageLocation,
    notes: item.notes ?? "",
    cardPrinting: {
      name: item.cardPrinting.name,
      collectorNumber: item.cardPrinting.collectorNumber,
      imageSmallUrl: item.cardPrinting.imageSmallUrl,
      imageNormalUrl: item.cardPrinting.imageNormalUrl,
      finishes: item.cardPrinting.finishes,
      set: item.cardPrinting.set,
      currentPrices: item.cardPrinting.currentPrices.map((price) => ({
        finish: price.finish,
        market:
          price.market == null
            ? null
            : typeof price.market === "number"
              ? price.market
              : price.market.toNumber(),
      })),
    },
  };
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    storage?: string;
    condition?: string;
    finish?: string;
    lot?: string;
  }>;
}) {
  const user = await requireEntitlement();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const params = await searchParams;
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const q = params.q?.trim() ?? "";
  const storage = params.storage?.trim() ?? "";
  const condition = params.condition?.trim() ?? "";
  const finish = params.finish?.trim() ?? "";
  const lotId = params.lot?.trim() ?? "";

  const { items, total, pageSize, storageLocations } = await getInventory(page, 25, {
    q, storage, condition, finish,
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtersActive = Boolean(q || storage || condition || finish);
  const rows = items.map(toCollectionRow);
  const focusLot =
    lotId && !rows.some((item) => item.id === lotId)
      ? await getInventoryLot(lotId).then((lot) => (lot ? toCollectionRow(lot.item) : null))
      : null;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              {pickPlural(total, m.collection.lots, m.collection.lotsPlural)}
              {filtersActive ? m.collection.matchingFilters : ""}
            </p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{m.collection.title}</h1>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={16} /> {m.common.addCards}
          </Link>
        </header>

        <form className="panel mb-5 flex flex-wrap gap-3 p-4">
          <label className="relative flex-1 min-w-[180px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              name="q"
              defaultValue={q}
              placeholder={m.collection.searchPlaceholder}
              className="w-full rounded-xl border border-white/8 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-700 focus:border-emerald-400/40"
            />
          </label>

          <select
            name="storage"
            defaultValue={storage}
            className="rounded-xl border border-white/8 bg-black/30 pl-3 pr-8 py-2.5 text-sm outline-none focus:border-emerald-400/40"
          >
            <option value="">{m.collection.allStorage}</option>
            <option value="unassigned">{m.common.unassigned}</option>
            {storageLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            name="condition"
            defaultValue={condition}
            className="rounded-xl border border-white/8 bg-black/30 pl-3 pr-8 py-2.5 text-sm outline-none focus:border-emerald-400/40"
          >
            <option value="">{m.collection.allConditions}</option>
            <option value="NEAR_MINT">{m.condition.NEAR_MINT}</option>
            <option value="LIGHTLY_PLAYED">{m.condition.LIGHTLY_PLAYED}</option>
            <option value="MODERATELY_PLAYED">{m.condition.MODERATELY_PLAYED}</option>
            <option value="HEAVILY_PLAYED">{m.condition.HEAVILY_PLAYED}</option>
            <option value="DAMAGED">{m.condition.DAMAGED}</option>
          </select>

          <select
            name="finish"
            defaultValue={finish}
            className="rounded-xl border border-white/8 bg-black/30 pl-3 pr-8 py-2.5 text-sm outline-none focus:border-emerald-400/40"
          >
            <option value="">{m.collection.allFinishes}</option>
            <option value="NONFOIL">{m.finish.NONFOIL}</option>
            <option value="FOIL">{m.finish.FOIL}</option>
            <option value="ETCHED">{m.finish.ETCHED}</option>
          </select>

          <div className="flex gap-2">
            <button type="submit" className="button-primary text-sm">{m.common.search}</button>
            {filtersActive && (
              <Link href="/collection" className="panel px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                {m.collection.clearAll}
              </Link>
            )}
          </div>
        </form>

        <CollectionTable
          items={rows}
          currency={user.preferredCurrency}
          filtersActive={filtersActive}
          currentQ={q}
          storageLocations={storageLocations}
          listHref={buildCollectionHref({ page, q, storage, condition, finish })}
          initialLotId={lotId || undefined}
          focusLot={focusLot}
        />

        {pages > 1 && (
          <nav className="mt-5 flex justify-end gap-2 text-sm">
            {page > 1 && (
              <Link className="panel px-4 py-2 hover:bg-white/4 transition-colors" href={buildCollectionHref({ page: page - 1, q, storage, condition, finish })}>
                {m.common.previous}
              </Link>
            )}
            <span className="px-3 py-2 text-zinc-500">
              {interpolate(m.common.pageOf, { page, pages })}
            </span>
            {page < pages && (
              <Link className="panel px-4 py-2 hover:bg-white/4 transition-colors" href={buildCollectionHref({ page: page + 1, q, storage, condition, finish })}>
                {m.common.next}
              </Link>
            )}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
