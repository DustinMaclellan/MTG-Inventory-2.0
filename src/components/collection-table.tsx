"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Trash2, X } from "lucide-react";
import {
  bulkDeleteInventoryAction,
  bulkUpdateInventoryAction,
  deleteInventoryAction,
} from "@/app/actions";
import type { BulkUpdateState } from "@/app/actions";
import type { Condition, Currency, Finish } from "@prisma/client";
import { formatMoney } from "@/lib/money";

// ─── Serialized row type (no Prisma Decimal) ───────────────
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

// ─── Constants ────────────────────────────────────────────
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

const ALL_FINISHES: Finish[] = ["NONFOIL", "FOIL", "ETCHED"];

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

// ─── Main component ────────────────────────────────────────
export function CollectionTable({
  items,
  currency,
  filtersActive,
  currentQ,
  currentCondition,
  currentFinish,
}: {
  items: CollectionRow[];
  currency: Currency;
  filtersActive: boolean;
  currentQ: string;
  currentCondition: string;
  currentFinish: string;
}) {
  const router = useRouter();
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
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function updateFilter(param: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(param, value);
    else url.searchParams.delete(param);
    url.searchParams.delete("page"); // reset to page 1
    router.push(url.pathname + url.search);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      switch (sortKey) {
        case "name":      av = a.cardPrinting.name; bv = b.cardPrinting.name; break;
        case "qty":       av = a.quantity; bv = b.quantity; break;
        case "condition": av = a.condition; bv = b.condition; break;
        case "finish":    av = a.finish; bv = b.finish; break;
        case "paid":      av = a.purchasePrice ?? -1; bv = b.purchasePrice ?? -1; break;
        case "market":    av = itemMarket(a) ?? -1; bv = itemMarket(b) ?? -1; break;
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

  return (
    <div className="relative">
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            {/* ── Sort row ─────────────────────────── */}
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-zinc-600">
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
              <SortTh label="Card"    col="name"      current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 font-medium">Printing</th>
              <SortTh label="Qty"     col="qty"       current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Cond."   col="condition" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Finish"  col="finish"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Paid"    col="paid"      current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Market"  col="market"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Value"   col="value"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 font-medium">Storage</th>
              <th />
            </tr>

            {/* ── Filter row ───────────────────────── */}
            <tr className="border-b border-white/6 bg-white/[.015]">
              <td colSpan={3} />
              <td className="px-3 py-2" />
              {/* Condition filter */}
              <td className="px-3 py-2">
                <select
                  value={currentCondition}
                  onChange={(e) => updateFilter("condition", e.target.value)}
                  className="w-full rounded-lg border border-white/8 bg-black/30 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-emerald-400/40"
                  aria-label="Filter by condition"
                >
                  <option value="">All</option>
                  {ALL_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                  ))}
                </select>
              </td>
              {/* Finish filter */}
              <td className="px-3 py-2">
                <select
                  value={currentFinish}
                  onChange={(e) => updateFilter("finish", e.target.value)}
                  className="w-full rounded-lg border border-white/8 bg-black/30 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-emerald-400/40"
                  aria-label="Filter by finish"
                >
                  <option value="">All</option>
                  {ALL_FINISHES.map((f) => (
                    <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </td>
              <td colSpan={5} />
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
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(item.id)}
                      className="accent-emerald-400 cursor-pointer"
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
                  <td className="px-4 py-3 text-sm">{formatMoney(item.purchasePrice, item.purchaseCurrency)}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(market, currency)}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatMoney(market === null ? null : market * item.quantity, currency)}
                  </td>
                  <td className="max-w-36 truncate px-4 py-3 text-xs text-zinc-500">
                    {item.storageLocation ? (
                      <Link href={buildStorageHref(item.storageLocation, currentQ)} className="hover:text-emerald-400 transition-colors">
                        {item.storageLocation}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteInventoryAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button title="Delete lot" className="rounded-lg p-2 text-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
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

// ─── Sortable column header ────────────────────────────────
function SortTh({
  label, col, current, dir, onSort,
}: {
  label: string;
  col: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  const active = current === col;
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 font-medium uppercase tracking-wider text-[11px] transition-colors hover:text-zinc-300 ${active ? "text-emerald-400" : "text-zinc-600"}`}
      >
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

// ─── Floating bulk action bar ──────────────────────────────
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
    <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 px-4 lg:bottom-6">
      <div className="panel-raised shadow-2xl ring-1 ring-emerald-400/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-300">
            {count} lot{count === 1 ? "" : "s"} selected
          </p>
          <button onClick={onDone} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {(updateState.error || deleteState.error) && (
          <p className="border-b border-white/6 px-4 py-2 text-xs text-rose-300">
            {updateState.error ?? deleteState.error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-end gap-3 p-4">
          {/* Update fields */}
          <form action={updateAction} className="flex flex-1 flex-wrap items-end gap-2.5">
            {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}

            <div className="flex flex-1 min-w-[130px] flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Storage location</label>
              <input name="storageLocation" className="field py-2 px-3 text-sm" placeholder="Binder A, Box 2…" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Condition</label>
              <select name="condition" defaultValue="" className="field py-2 px-3 text-sm">
                <option value="">— unchanged —</option>
                {ALL_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <button disabled={pending} className="button-primary flex items-center gap-2 py-2 text-sm disabled:opacity-50">
              <Check size={15} /> {updatePending ? "Updating…" : "Apply"}
            </button>
          </form>

          {/* Divider */}
          <div className="h-8 w-px bg-white/8 hidden sm:block" />

          {/* Bulk delete */}
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`Permanently delete ${count} lot${count === 1 ? "" : "s"}? This cannot be undone.`))
                e.preventDefault();
            }}
          >
            {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button
              disabled={pending}
              className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/14 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deletePending ? "Deleting…" : `Delete ${count}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
