"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { bulkUpdateInventoryAction, deleteInventoryAction } from "@/app/actions";
import type { BulkUpdateState } from "@/app/actions";
import type { Condition, Currency, Finish } from "@prisma/client";
import { formatMoney } from "@/lib/money";

// ─── Serialized types (no Prisma Decimal) ─────────────────
export type CollectionRow = {
  id: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  language: string;
  purchasePrice: number | null;
  purchaseCurrency: Currency;
  storageLocation: string | null;
  cardPrinting: {
    name: string;
    collectorNumber: string;
    imageSmallUrl: string | null;
    set: { name: string; code: string };
    currentPrices: Array<{ finish: Finish; market: number | null }>;
  };
};

// ─── Condition label map ───────────────────────────────────
const CONDITION_LABELS: Record<Condition, string> = {
  NEAR_MINT: "NM",
  LIGHTLY_PLAYED: "LP",
  MODERATELY_PLAYED: "MP",
  HEAVILY_PLAYED: "HP",
  DAMAGED: "DMG",
};

const ALL_CONDITIONS: Condition[] = [
  "NEAR_MINT",
  "LIGHTLY_PLAYED",
  "MODERATELY_PLAYED",
  "HEAVILY_PLAYED",
  "DAMAGED",
];

function buildStorageHref(storage: string, currentQ: string) {
  const search = new URLSearchParams();
  if (currentQ) search.set("q", currentQ);
  search.set("storage", storage);
  return `/collection?${search.toString()}`;
}

// ─── Main component ────────────────────────────────────────
export function CollectionTable({
  items,
  currency,
  filtersActive,
  currentQ,
}: {
  items: CollectionRow[];
  currency: Currency;
  filtersActive: boolean;
  currentQ: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setSelected(new Set()); }, [items]);

  const allChecked = items.length > 0 && selected.size === items.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id)));
  }

  return (
    <div className="relative">
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead className="border-b border-white/8 text-[11px] uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  className="accent-emerald-400 cursor-pointer"
                  aria-label="Select all"
                />
              </th>
              {["Card", "Printing", "Qty", "Cond.", "Finish", "Paid", "Market", "Value", "Storage", ""].map(
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
              const market = item.cardPrinting.currentPrices.find((p) => p.finish === item.finish)?.market ?? null;
              const isSelected = selected.has(item.id);

              return (
                <tr
                  key={item.id}
                  className={`transition-colors cursor-pointer ${isSelected ? "bg-emerald-400/4" : "hover:bg-white/[.02]"}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button,a,form,input,select")) return;
                    toggle(item.id);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(item.id)}
                      className="accent-emerald-400 cursor-pointer"
                      aria-label={`Select ${item.cardPrinting.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-900">
                        {item.cardPrinting.imageSmallUrl && (
                          <Image src={item.cardPrinting.imageSmallUrl} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <span className="max-w-52 truncate font-medium">{item.cardPrinting.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {item.cardPrinting.set.code.toUpperCase()} · #{item.cardPrinting.collectorNumber}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 text-xs text-zinc-300">
                      {CONDITION_LABELS[item.condition]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {item.finish.charAt(0) + item.finish.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatMoney(item.purchasePrice, item.purchaseCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatMoney(market, currency)}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatMoney(market === null ? null : market * item.quantity, currency)}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 text-xs text-zinc-500">
                    {item.storageLocation ? (
                      <Link
                        href={buildStorageHref(item.storageLocation, currentQ)}
                        className="hover:text-emerald-400 transition-colors"
                      >
                        {item.storageLocation}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteInventoryAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        title="Delete lot"
                        className="rounded-lg p-2 text-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={15} />
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
            {filtersActive ? "No lots match these filters." : "No cards yet. Add an exact printing to begin."}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <BulkBar selectedIds={[...selected]} onDone={() => setSelected(new Set())} />
      )}
    </div>
  );
}

// ─── Floating bulk action bar ──────────────────────────────
function BulkBar({ selectedIds, onDone }: { selectedIds: string[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<BulkUpdateState, FormData>(
    bulkUpdateInventoryAction,
    {},
  );

  useEffect(() => {
    if (state.updated !== undefined) onDone();
  }, [state.updated, onDone]);

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-xl -translate-x-1/2 px-4 lg:bottom-6">
      <div className="panel-raised flex flex-col gap-3 p-4 shadow-2xl ring-1 ring-emerald-400/10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-300">
            {selectedIds.length} lot{selectedIds.length === 1 ? "" : "s"} selected
          </p>
          <button onClick={onDone} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {state.error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.error}</p>
        )}

        <form action={formAction} className="flex flex-wrap items-end gap-2.5">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <div className="flex flex-1 min-w-[140px] flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Set storage location
            </label>
            <input name="storageLocation" className="field py-2 px-3 text-sm" placeholder="Binder A, Box 2…" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Set condition
            </label>
            <select name="condition" defaultValue="" className="field py-2 px-3 text-sm">
              <option value="">— unchanged —</option>
              {ALL_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <button disabled={pending} className="button-primary flex items-center gap-2 py-2 text-sm disabled:opacity-50">
            <Check size={15} />
            {pending ? "Updating…" : "Apply"}
          </button>
        </form>
      </div>
    </div>
  );
}
