"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Trash2, X } from "lucide-react";
import {
  bulkDeleteInventoryAction,
  bulkUpdateInventoryAction,
  deleteInventoryAction,
} from "@/app/actions";
import type { BulkUpdateState } from "@/app/actions";
import type { Condition, Currency, Finish } from "@prisma/client";
import { formatMoney } from "@/lib/money";

// ─── Types ─────────────────────────────────────────────────
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

const CONDITION_LABELS: Record<Condition, string> = {
  NEAR_MINT: "NM",
  LIGHTLY_PLAYED: "LP",
  MODERATELY_PLAYED: "MP",
  HEAVILY_PLAYED: "HP",
  DAMAGED: "DMG",
};

const ALL_CONDITIONS: Condition[] = [
  "NEAR_MINT", "LIGHTLY_PLAYED", "MODERATELY_PLAYED", "HEAVILY_PLAYED", "DAMAGED",
];

type SortKey = "name" | "qty" | "condition" | "finish" | "paid" | "market" | "value";
type SortDir = "asc" | "desc";

function itemMarket(item: CollectionRow) {
  return item.cardPrinting.currentPrices.find((p) => p.finish === item.finish)?.market ?? null;
}

function buildStorageHref(storage: string, currentQ: string) {
  const s = new URLSearchParams();
  if (currentQ) s.set("q", currentQ);
  s.set("storage", storage);
  return `/collection?${s.toString()}`;
}

// ─── Table ─────────────────────────────────────────────────
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      switch (sortKey) {
        case "name":      av = a.cardPrinting.name;   bv = b.cardPrinting.name;   break;
        case "qty":       av = a.quantity;             bv = b.quantity;             break;
        case "condition": av = a.condition;            bv = b.condition;            break;
        case "finish":    av = a.finish;               bv = b.finish;               break;
        case "paid":      av = a.purchasePrice ?? -1;  bv = b.purchasePrice ?? -1;  break;
        case "market":    av = itemMarket(a) ?? -1;   bv = itemMarket(b) ?? -1;   break;
        case "value": {
          const am = itemMarket(a); const bm = itemMarket(b);
          av = am === null ? -1 : am * a.quantity;
          bv = bm === null ? -1 : bm * b.quantity;
          break;
        }
      }
      if (av === bv) return 0;
      if (av === null || av < bv!) return sortDir === "asc" ? -1 : 1;
      return sortDir === "asc" ? 1 : -1;
    });
  }, [items, sortKey, sortDir]);

  const cols: { label: string; key: SortKey }[] = [
    { label: "Qty",      key: "qty" },
    { label: "Cond.",    key: "condition" },
    { label: "Finish",   key: "finish" },
    { label: "Paid",     key: "paid" },
    { label: "Market",   key: "market" },
    { label: "Value",    key: "value" },
  ];

  return (
    <div className="relative">
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead className="border-b border-white/8 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
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

              {/* Card — sortable */}
              <th className="px-4 py-3">
                <SortBtn label="Card" col="name" current={sortKey} dir={sortDir} onSort={handleSort} />
              </th>

              {/* Printing — static */}
              <th className="px-4 py-3">Printing</th>

              {/* Sortable columns */}
              {cols.map(({ label, key }) => (
                <th key={key} className="px-4 py-3">
                  <SortBtn label={label} col={key} current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
              ))}

              {/* Storage + actions — static */}
              <th className="px-4 py-3">Storage</th>
              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-white/6">
            {sorted.map((item) => {
              const market = itemMarket(item);
              const isSelected = selected.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`transition-colors cursor-pointer ${isSelected ? "bg-emerald-400/4" : "hover:bg-white/[.018]"}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button,a,form,input,select")) return;
                    toggle(item.id);
                  }}
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(item.id)}
                      className="accent-emerald-400 cursor-pointer" />
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
                  <td className="px-4 py-3 text-sm">{formatMoney(item.purchasePrice, item.purchaseCurrency)}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(market, currency)}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatMoney(market === null ? null : market * item.quantity, currency)}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 text-xs text-zinc-500">
                    {item.storageLocation ? (
                      <Link href={buildStorageHref(item.storageLocation, currentQ)}
                        className="hover:text-emerald-400 transition-colors">
                        {item.storageLocation}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteInventoryAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button title="Delete lot"
                        className="rounded-lg p-2 text-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!sorted.length && (
          <div className="px-5 py-16 text-center text-sm text-zinc-500">
            {filtersActive
              ? "No lots match these filters."
              : "No cards yet. Add an exact printing to begin."}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <BulkBar selectedIds={[...selected]} onDone={() => setSelected(new Set())} />
      )}
    </div>
  );
}

// ─── Sortable header button ─────────────────────────────────
function SortBtn({
  label, col, current, dir, onSort,
}: {
  label: string; col: SortKey; current: SortKey | null;
  dir: SortDir; onSort: (col: SortKey) => void;
}) {
  const active = current === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 whitespace-nowrap text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-zinc-300 ${active ? "text-emerald-400" : "text-zinc-600"}`}
    >
      {label}
      {active
        ? dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        : <ChevronsUpDown size={11} className="opacity-35" />}
    </button>
  );
}

// ─── Bulk action bar ────────────────────────────────────────
function BulkBar({ selectedIds, onDone }: { selectedIds: string[]; onDone: () => void }) {
  const [updateState, updateAction, updatePending] = useActionState<BulkUpdateState, FormData>(
    bulkUpdateInventoryAction, {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState<BulkUpdateState, FormData>(
    bulkDeleteInventoryAction, {},
  );

  useEffect(() => {
    if (updateState.updated !== undefined || deleteState.deleted !== undefined) onDone();
  }, [updateState.updated, deleteState.deleted, onDone]);

  const pending = updatePending || deletePending;
  const count = selectedIds.length;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 lg:bottom-6">
      <div className="panel-raised overflow-hidden shadow-2xl ring-1 ring-white/8">
        {/* Single no-wrap row */}
        <div className="flex items-center gap-0 divide-x divide-white/8">

          {/* Label */}
          <span className="px-4 py-3 text-sm font-semibold text-emerald-300 whitespace-nowrap">
            {count} {count === 1 ? "lot" : "lots"} selected
          </span>

          {/* Update: storage + condition + apply */}
          <form action={updateAction} className="flex items-center gap-2 px-3 py-2">
            {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <input
              name="storageLocation"
              className="h-8 w-36 rounded-lg border border-white/10 bg-black/40 px-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-400/50"
              placeholder="Storage…"
            />
            <select
              name="condition"
              defaultValue=""
              className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-zinc-300 outline-none focus:border-emerald-400/50"
            >
              <option value="">Condition…</option>
              {ALL_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              disabled={pending}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-sm font-bold text-black hover:bg-emerald-300 disabled:opacity-50 transition-colors"
            >
              <Check size={13} />
              {updatePending ? "Saving…" : "Apply"}
            </button>
          </form>

          {/* Delete */}
          <form
            action={deleteAction}
            className="px-3 py-2"
            onSubmit={(e) => {
              if (!confirm(`Permanently delete ${count} lot${count === 1 ? "" : "s"}? This cannot be undone.`))
                e.preventDefault();
            }}
          >
            {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button
              disabled={pending}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-sm font-medium text-rose-400 hover:bg-rose-500/18 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Trash2 size={13} />
              {deletePending ? "Deleting…" : `Delete ${count}`}
            </button>
          </form>

          {/* Dismiss */}
          <button
            onClick={onDone}
            aria-label="Dismiss"
            className="flex h-full items-center px-3 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {(updateState.error || deleteState.error) && (
          <p className="border-t border-white/6 px-4 py-2 text-xs text-rose-300">
            {updateState.error ?? deleteState.error}
          </p>
        )}
      </div>
    </div>
  );
}
