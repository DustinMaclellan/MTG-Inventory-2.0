"use client";

import { useActionState, useEffect, useMemo, useState, type DragEvent } from "react";
import type { Finish } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import {
  commitImportAction,
  previewImportAction,
  type ImportPreviewState,
} from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { availableFinishes, pickFinish } from "@/lib/finish";

const template = `Deck
4 Mana Crypt (2XM) 11
1 Sol Ring (CMM) 410 foil
1 Rhystic Study`;

const IMPORT_DRAFT_KEY = "mystic-ledger.import-draft";
const IMPORT_DRAFT_MAX = 2_000_000;

type ImportDraft = { list: string; fileName: string | null };

function readImportDraft(): ImportDraft | null {
  try {
    const raw = sessionStorage.getItem(IMPORT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportDraft;
    if (typeof parsed.list !== "string") return null;
    return {
      list: parsed.list,
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : null,
    };
  } catch {
    return null;
  }
}

function writeImportDraft(draft: ImportDraft) {
  try {
    if (draft.list.length > IMPORT_DRAFT_MAX) return;
    sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota or private-mode failures.
  }
}

function dropTargetProps(onActive: (active: boolean) => void, onFile: (file: File) => void) {
  return {
    onDragEnter(event: DragEvent) {
      event.preventDefault();
      event.stopPropagation();
      onActive(true);
    },
    onDragOver(event: DragEvent) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      onActive(true);
    },
    onDragLeave(event: DragEvent) {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) onActive(false);
    },
    onDrop(event: DragEvent) {
      event.preventDefault();
      event.stopPropagation();
      onActive(false);
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
}

type ImportCandidate = NonNullable<ImportPreviewState["choices"]>[number]["candidates"][number];

function finishOptionsFor(
  candidate: ImportCandidate | undefined,
  lineFinish: Finish,
  specified: boolean,
) {
  return availableFinishes(candidate?.finishes ?? [], lineFinish, specified);
}

function finishLabels(finishes: Finish[], labels: Record<Finish, string>) {
  if (!finishes.length) return "";
  return finishes.map((finish) => labels[finish]).join(" · ");
}

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
  finishNames,
}: {
  candidates: ImportCandidate[];
  selectedId: string;
  onSelect: (printingId: string) => void;
  selectLabel: string;
  finishNames: Record<Finish, string>;
}) {
  return (
    <div className="max-h-[min(28rem,50vh)] space-y-3 overflow-y-auto pr-0.5" role="listbox" aria-label={selectLabel}>
      {candidates.map((candidate) => {
        const selected = selectedId === candidate.printingId;
        const finishes = finishLabels(candidate.finishes, finishNames);
        const label = `${candidate.name} · ${candidate.setCode.toUpperCase()} #${candidate.collectorNumber}${
          finishes ? ` · ${finishes}` : ""
        }`;
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
                ? "border-accent bg-accent/10"
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
                {finishes ? ` · ${finishes}` : ""}
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
  const [finishPicks, setFinishPicks] = useState<Record<number, Finish>>({});
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [list, setList] = useState(template);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<"file" | "paste" | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  async function applyImportFile(file: File | undefined) {
    if (!file) return;
    setList(await file.text());
    setFileName(file.name);
  }

  useEffect(() => {
    const draft = readImportDraft();
    if (draft) {
      setList(draft.list);
      setFileName(draft.fileName);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    writeImportDraft({ list, fileName });
  }, [draftReady, fileName, list]);

  useEffect(() => {
    setPicks({});
    setFinishPicks({});
    setOpenRow(null);
  }, [state.choices]);

  const selectedRows = useMemo(
    () =>
      choices.flatMap((choice) => {
        const printingId = picks[choice.row];
        const printing = choice.candidates.find((candidate) => candidate.printingId === printingId);
        if (!printing) return [];
        const finish = pickFinish(
          finishOptionsFor(printing, choice.finish, Boolean(choice.finishSpecified)),
          finishPicks[choice.row] ?? choice.finish,
        );
        return [
          {
            printingId: printing.printingId,
            quantity: choice.quantity,
            condition: choice.condition,
            finish,
            language: choice.language,
            purchasePrice: choice.purchasePrice,
            storageLocation: choice.storageLocation,
          },
        ];
      }),
    [choices, picks, finishPicks],
  );

  const readyCount = recognized.length + selectedRows.length;
  const canImport = readyCount > 0;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <form action={action} className="panel p-5 lg:sticky lg:top-4">
        <label className="text-sm font-medium">{m.imports.listData}</label>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{m.imports.listHint}</p>
        <label
          className={`mt-3 flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs transition-colors ${
            dropOn === "file"
              ? "border-accent/50 bg-accent/8 text-zinc-300"
              : "border-white/12 bg-black/20 text-zinc-400 hover:border-white/20"
          }`}
          {...dropTargetProps((active) => setDropOn(active ? "file" : null), applyImportFile)}
        >
          <span className="shrink-0 font-medium text-zinc-300">{m.imports.chooseFile}</span>
          <span className="min-w-0 truncate">
            {fileName ? interpolate(m.imports.loadedFile, { name: fileName }) : m.imports.chooseFileHint}
          </span>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              await applyImportFile(file);
            }}
          />
        </label>
        <textarea
          name="csv"
          className={`field mt-3 min-h-72 resize-y font-mono text-xs leading-6 ${
            dropOn === "paste" ? "border-accent/50" : ""
          }`}
          placeholder={m.imports.listPlaceholder}
          value={list}
          onChange={(event) => setList(event.target.value)}
          {...dropTargetProps((active) => setDropOn(active ? "paste" : null), applyImportFile)}
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
        {!!state.invalid?.length && (
          <IssueList
            title={m.imports.invalid}
            hint={m.imports.invalidHint}
            tone="rose"
            items={state.invalid.map((row) => ({
              key: `invalid-${row.row}`,
              line: row.line,
              detail: row.message,
            }))}
          />
        )}
        {!!state.unresolved?.length && (
          <IssueList
            title={m.imports.unresolved}
            hint={m.imports.unresolvedHint}
            tone="amber"
            items={state.unresolved.map((row) => {
              const hasSetHint = row.printing && row.printing !== row.cardName;
              return {
                key: `unresolved-${row.row}`,
                line: row.line ?? row.cardName,
                detail: hasSetHint ? m.imports.noMatchingPrinting : m.imports.notInCatalog,
              };
            })}
          />
        )}
        {choices.length > 0 && (
          <ul className="mt-5 space-y-3">
            <li className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {m.imports.chooseVersion}
            </li>
            {choices.map((choice) => {
              const selectedId = picks[choice.row] ?? "";
              const selected = choice.candidates.find((candidate) => candidate.printingId === selectedId);
              const preview = selected ?? choice.candidates[0];
              const finishOptions = selected
                ? finishOptionsFor(selected, choice.finish, Boolean(choice.finishSpecified))
                : [];
              const finish = pickFinish(finishOptions, finishPicks[choice.row] ?? choice.finish);
              const open = openRow === choice.row;
              const showFinishSelect = Boolean(selected) && finishOptions.length > 1;
              return (
                <li key={choice.row} className="rounded-xl border border-white/8 bg-black/20">
                  <div className="flex items-center gap-2 pr-3">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenRow(open ? null : choice.row)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
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
                          <p className="truncate text-xs text-accent">{selected.setName}</p>
                          <p className="text-[11px] text-zinc-600">
                            {selected.setCode.toUpperCase()} · #{selected.collectorNumber}
                            {selected.finishes.length
                              ? ` · ${finishLabels(selected.finishes, m.finish)}`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-zinc-500">{m.imports.selectPrinting}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showFinishSelect && (
                    <>
                      <label className="sr-only" htmlFor={`import-finish-${choice.row}`}>
                        {m.add.finish}
                      </label>
                      <select
                        id={`import-finish-${choice.row}`}
                        value={finish}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setFinishPicks((current) => ({
                            ...current,
                            [choice.row]: event.target.value as Finish,
                          }))
                        }
                        className="h-10 w-[7.5rem] shrink-0 rounded-xl border border-white/10 bg-black/40 py-0 pr-8 pl-3 text-xs text-zinc-200 outline-none focus:border-accent/50"
                      >
                        {finishOptions.map((option) => (
                          <option key={option} value={option}>
                            {m.finish[option]}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {selected && finishOptions.length === 1 && (
                    <span className="shrink-0 pr-1 text-[11px] text-zinc-500">{m.finish[finish]}</span>
                  )}
                  </div>
                  {open && (
                    <div className="border-t border-white/8 px-3 py-4">
                      <p className="mb-3 text-[11px] text-zinc-500">
                        {interpolate(m.imports.pickPrinting, { hint: choice.hint })}
                      </p>
                      <PrintingPicker
                        candidates={choice.candidates}
                        selectedId={selectedId}
                        selectLabel={m.imports.pickPrintingSr}
                        finishNames={m.finish}
                        onSelect={(printingId) => {
                          const printing = choice.candidates.find(
                            (candidate) => candidate.printingId === printingId,
                          );
                          setPicks((current) => ({ ...current, [choice.row]: printingId }));
                          setFinishPicks((current) => ({
                            ...current,
                            [choice.row]: pickFinish(
                              finishOptionsFor(printing, choice.finish, Boolean(choice.finishSpecified)),
                              current[choice.row] ?? choice.finish,
                            ),
                          }));
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
        {!state.recognized && !state.choices && !state.unresolved && !state.invalid && (
          <p className="mt-5 text-sm leading-6 text-zinc-500">{m.imports.previewHint}</p>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-white/[.03] p-4">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{label}</p>
    </div>
  );
}

function IssueList({
  title,
  hint,
  tone,
  items,
}: {
  title: string;
  hint: string;
  tone: "amber" | "rose";
  items: Array<{ key: string; detail: string; line?: string }>;
}) {
  const box =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-400/5 text-amber-200"
      : "border-rose-400/20 bg-rose-500/5 text-rose-200";
  return (
    <div className={`mt-5 rounded-xl border px-4 py-3 ${box}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-zinc-400">{hint}</p>
      <ul className="mt-3 space-y-2.5 text-xs">
        {items.map((item) => (
          <li key={item.key}>
            {item.line ? <p className="font-mono text-xs">{item.line}</p> : null}
            <p className={item.line ? "mt-0.5 text-[11px] text-zinc-400" : undefined}>{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
