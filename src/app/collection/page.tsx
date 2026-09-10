import Image from "next/image";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { deleteInventoryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { requireEntitlement } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getInventory } from "@/services/inventory";

export const metadata = { title: "Collection" };

function buildCollectionHref(params: {
  page?: number;
  q?: string;
  storage?: string;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.storage) search.set("storage", params.storage);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/collection?${query}` : "/collection";
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; storage?: string }>;
}) {
  const user = await requireEntitlement();
  const params = await searchParams;
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const q = params.q?.trim() ?? "";
  const storage = params.storage?.trim() ?? "";
  const { items, total, pageSize, storageLocations } = await getInventory(page, 25, { q, storage });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtersActive = Boolean(q || storage);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              {total.toLocaleString()} inventory lot{total === 1 ? "" : "s"}
              {filtersActive ? " matching filters" : ""}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Collection</h1>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={17} /> Add cards
          </Link>
        </header>

        <form className="panel mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, set, number, or storage…"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-400/40"
            />
          </label>
          <select
            name="storage"
            defaultValue={storage}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/40"
          >
            <option value="">All storage</option>
            <option value="unassigned">Unassigned</option>
            {storageLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="button-primary flex-1 text-sm sm:flex-none">
              Search
            </button>
            {filtersActive && (
              <Link href="/collection" className="panel px-4 py-2.5 text-sm text-zinc-400">
                Clear
              </Link>
            )}
          </div>
        </form>

        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="border-b border-white/8 text-[11px] uppercase tracking-wider text-zinc-600">
              <tr>
                {["Card", "Printing", "Qty", "Condition", "Finish", "Paid", "Market", "Value", "Storage", ""].map(
                  (label) => (
                    <th key={label || "actions"} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {items.map((item) => {
                const market =
                  item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market?.toNumber() ??
                  null;
                return (
                  <tr key={item.id} className="hover:bg-white/[.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-10 overflow-hidden rounded bg-zinc-900">
                          {item.cardPrinting.imageSmallUrl && (
                            <Image
                              src={item.cardPrinting.imageSmallUrl}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <span className="max-w-52 truncate font-medium">{item.cardPrinting.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {item.cardPrinting.set.code.toUpperCase()} · #{item.cardPrinting.collectorNumber}
                    </td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{item.condition.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{item.finish}</td>
                    <td className="px-4 py-3 text-sm">
                      {formatMoney(item.purchasePrice?.toNumber() ?? null, item.purchaseCurrency)}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatMoney(market, user.preferredCurrency)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatMoney(market === null ? null : market * item.quantity, user.preferredCurrency)}
                    </td>
                    <td className="max-w-36 truncate px-4 py-3 text-xs text-zinc-500">
                      {item.storageLocation ? (
                        <Link
                          href={buildCollectionHref({ storage: item.storageLocation })}
                          className="hover:text-emerald-400"
                        >
                          {item.storageLocation}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteInventoryAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          title="Delete lot"
                          className="rounded-lg p-2 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length && (
            <div className="px-5 py-16 text-center text-sm text-zinc-500">
              {filtersActive
                ? "No lots match these filters."
                : "No cards yet. Add an exact printing to begin."}
            </div>
          )}
        </div>
        {pages > 1 && (
          <nav className="mt-5 flex justify-end gap-2 text-sm">
            {page > 1 && (
              <Link className="panel px-4 py-2" href={buildCollectionHref({ page: page - 1, q, storage })}>
                Previous
              </Link>
            )}
            <span className="px-3 py-2 text-zinc-500">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="panel px-4 py-2" href={buildCollectionHref({ page: page + 1, q, storage })}>
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
