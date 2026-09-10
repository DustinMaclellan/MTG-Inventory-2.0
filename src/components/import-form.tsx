"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  commitImportAction,
  previewImportAction,
  type ImportPreviewState,
} from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

const template = `Deck
4 Mana Crypt (2XM) 11
1 Sol Ring (CMM) 410 foil
1 Rhystic Study`;

type ImportCandidate = NonNullable<ImportPreviewState["choices"]>[number]["candidates"][number];

function CardArt({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md bg-zinc-900 ${className}`}>
      {src ? (
        // Scryfall CDN — native img so the review always shows art after a server action.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-[10px] text-zinc-600">—</div>
      )}
    </div>
  );
}

function PrintingPicker({
  candidates,
  selectedId,
  onSelect,
  selectLabel,
}: {
  candidates: ImportCandidate[];
  selectedId: string;
  onSelect: (printingId: string) => void;
  selectLabel: string;
}) {
  return (
    <div className="max-h-[min(28rem,50vh)] space-y-3 overflow-y-auto pr-0.5" role="listbox" aria-label={selectLabel}>
      {candidates.map((candidate) => {
        const selected = selectedId === candidate.printingId;
        const label = `${candidate.name} · ${candidate.setCode.toUpperCase()} #${candidate.collectorNumber}`;
        return (
          <button
            key={candidate.printingId}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={label}
            onClick={() => onSelect(candidate.printingId)}
            className={`flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-colors ${
              selected
                ? "border-emerald-400 bg-emerald-400/10"
                : "border-white/10 bg-black/30 hover:border-white/20"
            }`}
          >
            <CardArt
              src={candidate.imageSmallUrl}
              alt={label}
              className="h-[72px] w-[51px] shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{candidate.name}</p>
              <p className="truncate text-xs text-zinc-500">{candidate.setName}</p>
              <p className="text-[11px] text-zinc-600">
                {candidate.setCode.toUpperCase()} · #{candidate.collectorNumber}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ImportForm() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<ImportPreviewState, FormData>(
    previewImportAction,
    {},
  );
  const recognized = state.recognized ?? [];
  const choices = state.choices ?? [];
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [list, setList] = useState(template);

  useEffect(() => {
    setPicks({});
    setOpenRow(null);
  }, [state.choices]);

  const selectedRows = useMemo(
    () =>
      choices.flatMap((choice) => {
        const printingId = picks[choice.row];
        const printing = choice.candidates.find((candidate) => candidate.printingId === printingId);
        if (!printing) return [];
        return [
          {
            printingId: printing.printingId,
            quantity: choice.quantity,
            condition: choice.condition,
            finish: choice.finish,
            language: choice.language,
            purchasePrice: choice.purchasePrice,
            storageLocation: choice.storageLocation,
          },
        ];
      }),
    [choices, picks],
  );

  const readyCount = recognized.length + selectedRows.length;
  const canImport = readyCount > 0;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <form action={action} className="panel p-5 lg:sticky lg:top-4">
        <label className="text-sm font-medium">{m.imports.listData}</label>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{m.imports.listHint}</p>
        <textarea
          name="csv"
          className="field mt-3 min-h-72 resize-y font-mono text-xs leading-6"
          value={list}
          onChange={(event) => setList(event.target.value)}
        />
        <button disabled={pending} className="button-primary mt-4 text-sm">
          {pending ? m.imports.checking : m.imports.preview}
        </button>
        {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}
      </form>
      <section className="panel max-h-[min(70vh,52rem)] overflow-y-auto p-5">
        <h2 className="font-medium">{m.imports.review}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <Stat label={m.imports.recognized} value={recognized.length} tone="text-emerald-400" />
          <Stat label={m.imports.chooseVersion} value={choices.length} tone="text-sky-400" />
          <Stat label={m.imports.unresolved} value={state.unresolved?.length ?? 0} tone="text-amber-400" />
          <Stat label={m.imports.invalid} value={state.invalid?.length ?? 0} tone="text-rose-400" />
        </div>
        {choices.length > 0 && (
          <ul className="mt-5 space-y-3">
            <li className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {m.imports.chooseVersion}
            </li>
            {choices.map((choice) => {
              const selectedId = picks[choice.row] ?? "";
              const selected = choice.candidates.find((candidate) => candidate.printingId === selectedId);
              const preview = selected ?? choice.candidates[0];
              const open = openRow === choice.row;
              return (
                <li key={choice.row} className="rounded-xl border border-white/8 bg-black/20">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenRow(open ? null : choice.row)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <CardArt
                      src={preview?.imageSmallUrl ?? null}
                      alt={choice.cardName}
                      className="h-[72px] w-[51px] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {choice.quantity}× {choice.cardName}
                      </p>
                      {selected ? (
                        <>
                          <p className="truncate text-xs text-emerald-400">{selected.setName}</p>
                          <p className="text-[11px] text-zinc-600">
                            {selected.setCode.toUpperCase()} · #{selected.collectorNumber} ·{" "}
                            {m.finish[choice.finish]}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {m.imports.selectPrinting} · {m.finish[choice.finish]}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-white/8 px-3 py-4">
                      <p className="mb-3 text-[11px] text-zinc-500">
                        {interpolate(m.imports.pickPrinting, { hint: choice.hint })}
                      </p>
                      <PrintingPicker
                        candidates={choice.candidates}
                        selectedId={selectedId}
                        selectLabel={m.imports.pickPrintingSr}
                        onSelect={(printingId) => {
                          setPicks((current) => ({ ...current, [choice.row]: printingId }));
                          setOpenRow(null);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!!state.unresolved?.length && (
          <ul className="space-y-2 text-xs text-amber-300">
            {state.unresolved.map((row) => (
              <li key={row.row}>
                {interpolate(m.imports.rowUnresolved, {
                  row: row.row,
                  card: row.cardName,
                  printing: row.printing,
                })}
              </li>
            ))}
          </ul>
        )}
        {!!state.invalid?.length && (
          <ul className="space-y-2 text-xs text-rose-300">
            {state.invalid.map((row) => (
              <li key={row.row}>
                {interpolate(m.imports.rowInvalid, { row: row.row, message: row.message })}
              </li>
            ))}
          </ul>
        )}
        {canImport && (
          <form action={commitImportAction} className="mt-5">
            <input
              type="hidden"
              name="rows"
              value={JSON.stringify([
                ...recognized.map((row) => ({
                  printingId: row.printingId,
                  quantity: row.quantity,
                  condition: row.condition,
                  finish: row.finish,
                  language: row.language,
                  purchasePrice: row.purchasePrice,
                  storageLocation: row.storageLocation,
                })),
                ...selectedRows,
              ])}
            />
            <button className="button-primary w-full text-sm">
              {interpolate(m.imports.importRows, { count: readyCount })}
            </button>
          </form>
        )}
        {!state.recognized && !state.choices && (
          <p className="mt-5 text-sm leading-6 text-zinc-500">{m.imports.previewHint}</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-white/[.03] p-4">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{label}</p>
    </div>
  );
}
