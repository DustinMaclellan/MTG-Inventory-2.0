"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowUpRight, GitMerge, Inbox, MapPin, Pencil } from "lucide-react";
import {
  mergeStorageLocationsAction,
  renameStorageLocationAction,
  type RenameStorageState,
  type StorageFormState,
} from "@/app/actions";
import { interpolate, pickPlural } from "@/i18n";
import { useI18n } from "@/i18n/provider";

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

export function StorageLocationCard({
  location,
  otherNames,
}: {
  location: StorageCardLocation;
  otherNames: string[];
}) {
  const { m } = useI18n();
  const unassigned = location.name === "Unassigned";
  const extraLots = Math.max(0, location.lots - location.topCards.length);
  const [panel, setPanel] = useState<"none" | "rename" | "merge">("none");
  const displayName = unassigned ? m.common.unassigned : location.name;
  const canMerge = !unassigned && otherNames.length > 0;

  return (
    <article className="panel group flex flex-col p-5 transition-all hover:border-accent/15 hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
              unassigned
                ? "border-amber-400/20 bg-amber-400/8 text-amber-400"
                : "border-accent/20 bg-accent/8 text-accent"
            }`}
          >
            {unassigned ? <Inbox size={16} /> : <MapPin size={16} />}
          </div>
          <div className="min-w-0">
            {panel === "rename" && !unassigned ? (
              <RenameForm currentName={location.name} onCancel={() => setPanel("none")} />
            ) : (
              <>
                <div className="flex items-center gap-0.5">
                  <h2 className="truncate font-semibold leading-snug">{displayName}</h2>
                  {!unassigned && (
                    <button
                      type="button"
                      title={m.storage.rename}
                      onClick={() => setPanel("rename")}
                      className="rounded-md p-1 text-zinc-600 hover:bg-white/6 hover:text-zinc-300 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {canMerge && (
                    <button
                      type="button"
                      title={m.storage.merge}
                      onClick={() => setPanel(panel === "merge" ? "none" : "merge")}
                      className="rounded-md p-1 text-zinc-600 hover:bg-white/6 hover:text-zinc-300 transition-colors"
                    >
                      <GitMerge size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {pickPlural(location.lots, m.storage.cardsLots, m.storage.cardsLotsPlural, {
                    cards: location.quantity,
                    lots: location.lots,
                  })}
                </p>
              </>
            )}
          </div>
        </div>
        <p className="shrink-0 text-lg font-semibold tracking-tight">{location.marketValue}</p>
      </div>

      {panel === "merge" && canMerge && (
        <div className="mt-4">
          <MergeForm
            currentName={location.name}
            otherNames={otherNames}
            onCancel={() => setPanel("none")}
          />
        </div>
      )}

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
              {interpolate(m.storage.more, { count: extraLots.toLocaleString() })}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1 text-xs font-medium text-accent">
            {m.common.viewLots} <ArrowUpRight size={12} />
          </p>
        </div>
      </Link>
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
  const { m } = useI18n();
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
        aria-label={m.storage.newName}
      />
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? m.common.saving : m.common.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {m.common.cancel}
        </button>
      </div>
      {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
    </form>
  );
}

function MergeForm({
  currentName,
  otherNames,
  onCancel,
}: {
  currentName: string;
  otherNames: string[];
  onCancel: () => void;
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState<StorageFormState, FormData>(
    mergeStorageLocationsAction,
    {},
  );

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const to = String(data.get("to") ?? "");
        if (!window.confirm(interpolate(m.storage.mergeConfirm, { from: currentName, to }))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="from" value={currentName} />
      <label className="block text-xs text-zinc-500">{m.storage.merge}</label>
      <select
        name="to"
        required
        defaultValue=""
        className="field min-w-0 px-3 py-2 pr-8 text-sm"
        aria-label={m.storage.mergePick}
      >
        <option value="" disabled>
          {m.storage.mergePick}
        </option>
        {otherNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? m.common.saving : m.storage.mergeCta}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {m.common.cancel}
        </button>
      </div>
      {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
      {state.notice && <p className="text-xs text-accent">{state.notice}</p>}
    </form>
  );
}
