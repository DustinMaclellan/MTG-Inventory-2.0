import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CollectionTable } from "@/components/collection-table";
import { requireEntitlement } from "@/lib/auth";
import { getInventory } from "@/services/inventory";

export const metadata = { title: "Collection" };

function buildCollectionHref(params: { page?: number; q?: string; storage?: string }) {
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
              {total.toLocaleString()} lot{total === 1 ? "" : "s"}
              {filtersActive ? " matching filters" : ""}
            </p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">Collection</h1>
          </div>
          <Link href="/add" className="button-primary text-sm">
            <Plus size={16} /> Add cards
          </Link>
        </header>

        {/* Filters */}
        <form className="panel mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, set, number, or storage…"
              className="w-full rounded-xl border border-white/8 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-700 focus:border-emerald-400/40"
            />
          </label>
          <select
            name="storage"
            defaultValue={storage}
            className="rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/40"
          >
            <option value="">All storage</option>
            <option value="unassigned">Unassigned</option>
            {storageLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="button-primary flex-1 text-sm sm:flex-none">
              Search
            </button>
            {filtersActive && (
              <Link href="/collection" className="panel px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                Clear
              </Link>
            )}
          </div>
        </form>

        {/* Serialize Prisma Decimal fields before passing to the client component */}
        <CollectionTable
          items={items.map((item) => ({
            ...item,
            purchasePrice: item.purchasePrice?.toNumber() ?? null,
            cardPrinting: {
              ...item.cardPrinting,
              currentPrices: item.cardPrinting.currentPrices.map((p) => ({
                ...p,
                market: p.market?.toNumber() ?? null,
              })),
            },
          }))}
          currency={user.preferredCurrency}
          filtersActive={filtersActive}
          currentQ={q}
        />

        {/* Pagination */}
        {pages > 1 && (
          <nav className="mt-5 flex justify-end gap-2 text-sm">
            {page > 1 && (
              <Link className="panel px-4 py-2 hover:bg-white/4 transition-colors" href={buildCollectionHref({ page: page - 1, q, storage })}>
                Previous
              </Link>
            )}
            <span className="px-3 py-2 text-zinc-500">Page {page} of {pages}</span>
            {page < pages && (
              <Link className="panel px-4 py-2 hover:bg-white/4 transition-colors" href={buildCollectionHref({ page: page + 1, q, storage })}>
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
