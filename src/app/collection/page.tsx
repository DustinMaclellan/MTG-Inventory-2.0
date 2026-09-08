import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { deleteInventoryAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getInventory } from "@/services/inventory";

export const metadata = { title: "Collection" };

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const parsedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const { items, total, pageSize } = await getInventory(page);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell userName={user.displayName}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">{total.toLocaleString()} inventory lots</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Collection</h1>
          </div>
          <Link href="/add" className="button-primary text-sm"><Plus size={17} /> Add cards</Link>
        </header>

        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="border-b border-white/8 text-[11px] uppercase tracking-wider text-zinc-600">
              <tr>{["Card", "Printing", "Qty", "Condition", "Finish", "Paid", "Market", "Value", "Storage", ""].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {items.map((item) => {
                const market = item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market?.toNumber() ?? null;
                return (
                  <tr key={item.id} className="hover:bg-white/[.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-10 overflow-hidden rounded bg-zinc-900">
                          {item.cardPrinting.imageSmallUrl && <Image src={item.cardPrinting.imageSmallUrl} alt="" fill sizes="40px" className="object-cover" />}
                        </div>
                        <span className="max-w-52 truncate font-medium">{item.cardPrinting.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{item.cardPrinting.set.code.toUpperCase()} · #{item.cardPrinting.collectorNumber}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{item.condition.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{item.finish}</td>
                    <td className="px-4 py-3 text-sm">{formatMoney(item.purchasePrice?.toNumber() ?? null, item.purchaseCurrency)}</td>
                    <td className="px-4 py-3 text-sm">{formatMoney(market, user.preferredCurrency)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatMoney(market === null ? null : market * item.quantity, user.preferredCurrency)}</td>
                    <td className="max-w-36 truncate px-4 py-3 text-xs text-zinc-500">{item.storageLocation || "—"}</td>
                    <td className="px-4 py-3">
                      <form action={deleteInventoryAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button title="Delete lot" className="rounded-lg p-2 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={16} /></button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length && <div className="px-5 py-16 text-center text-sm text-zinc-500">No cards yet. Add an exact printing to begin.</div>}
        </div>
        {pages > 1 && (
          <nav className="mt-5 flex justify-end gap-2 text-sm">
            {page > 1 && <Link className="panel px-4 py-2" href={`/collection?page=${page - 1}`}>Previous</Link>}
            <span className="px-3 py-2 text-zinc-500">Page {page} of {pages}</span>
            {page < pages && <Link className="panel px-4 py-2" href={`/collection?page=${page + 1}`}>Next</Link>}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
