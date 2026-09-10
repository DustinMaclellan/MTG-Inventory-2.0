"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowUpRight, Download, Inbox, MapPin, Pencil } from "lucide-react";
import {
  renameStorageLocationAction,
  type RenameStorageState,
} from "@/app/actions";

export type StorageCardLocation = {
  name: string;
  quantity: number;
  lots: number;
  marketValue: string;
  topCards: Array<{ id: string; imageSmallUrl: string | null }>;
};

function collectionHref(name: string) {
  return `/collection?storage=${encodeURIComponent(name === "Unassigned" ? "unassigned" : name)}`;
}

function exportHref(name: string) {
  return `/api/export?storage=${encodeURIComponent(name === "Unassigned" ? "unassigned" : name)}`;
}

export function StorageLocationCard({ location }: { location: StorageCardLocation }) {
  const unassigned = location.name === "Unassigned";
  const extraLots = Math.max(0, location.lots - location.topCards.length);
  const [renaming, setRenaming] = useState(false);

  return (
    <article className="panel group flex flex-col p-5 transition-all hover:border-emerald-400/15 hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
              unassigned
                ? "border-amber-400/20 bg-amber-400/8 text-amber-400"
                : "border-emerald-400/20 bg-emerald-400/8 text-emerald-400"
            }`}
          >
            {unassigned ? <Inbox size={16} /> : <MapPin size={16} />}
          </div>
          <div className="min-w-0">
            {renaming && !unassigned ? (
              <RenameForm
                currentName={location.name}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate font-semibold leading-snug">{location.name}</h2>
                  {!unassigned && (
                    <button
                      type="button"
                      title="Rename location"
                      onClick={() => setRenaming(true)}
                      className="rounded-md p-1 text-zinc-600 hover:bg-white/6 hover:text-zinc-300 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {location.quantity.toLocaleString()} card{location.quantity === 1 ? "" : "s"} ·{" "}
                  {location.lots.toLocaleString()} lot{location.lots === 1 ? "" : "s"}
                </p>
              </>
            )}
          </div>
        </div>
        <p className="shrink-0 text-lg font-semibold tracking-tight">{location.marketValue}</p>
      </div>

      <Link href={collectionHref(location.name)} className="mt-4 flex flex-1 flex-col">
        <div className="flex h-16 items-end">
          <div className="flex items-end">
            {location.topCards.map((card, index) => (
              <div
                key={card.id}
                className="relative h-16 w-11 overflow-hidden rounded-md border-2 border-[#0f1318] bg-zinc-900 shadow-lg"
                style={{ marginLeft: index === 0 ? 0 : -12, zIndex: 8 - index }}
              >
                {card.imageSmallUrl ? (
                  <Image
                    src={card.imageSmallUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[10px] text-zinc-700">?</div>
                )}
              </div>
            ))}
          </div>
          {extraLots > 0 && (
            <p className="mb-1 ml-3 text-xs text-zinc-600">
              +{extraLots.toLocaleString()} more
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            View lots <ArrowUpRight size={12} />
          </p>
        </div>
      </Link>
      <a
        href={exportHref(location.name)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Download size={12} />
        Export CSV
      </a>
    </article>
  );
}

function RenameForm({
  currentName,
  onCancel,
}: {
  currentName: string;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<RenameStorageState, FormData>(
    renameStorageLocationAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="from" value={currentName} />
      <input
        name="to"
        defaultValue={currentName}
        autoFocus
        maxLength={120}
        className="field py-1.5 text-sm"
        aria-label="New location name"
      />
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-emerald-400 px-2.5 py-1 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
    </form>
  );
}
