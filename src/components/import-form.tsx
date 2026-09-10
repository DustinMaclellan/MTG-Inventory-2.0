"use client";

import { useActionState } from "react";
import {
  commitImportAction,
  previewImportAction,
  type ImportPreviewState,
} from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

const template = `card_name,set_code,collector_number,quantity,condition,finish,language,purchase_price,storage_location
Sol Ring,cmm,410,2,near mint,nonfoil,en,3.50,Commander Binder`;

export function ImportForm() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<ImportPreviewState, FormData>(
    previewImportAction,
    {},
  );
  const recognized = state.recognized ?? [];
  const canImport = recognized.length > 0 && !state.invalid?.length && !state.unresolved?.length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <form action={action} className="panel p-5">
        <label className="text-sm font-medium">{m.imports.csvData}</label>
        <textarea name="csv" className="field mt-3 min-h-72 resize-y font-mono text-xs leading-6" defaultValue={template} />
        <button disabled={pending} className="button-primary mt-4 text-sm">
          {pending ? m.imports.checking : m.imports.preview}
        </button>
        {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}
      </form>
      <section className="panel p-5">
        <h2 className="font-medium">{m.imports.review}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <Stat label={m.imports.recognized} value={recognized.length} tone="text-emerald-400" />
          <Stat label={m.imports.unresolved} value={state.unresolved?.length ?? 0} tone="text-amber-400" />
          <Stat label={m.imports.invalid} value={state.invalid?.length ?? 0} tone="text-rose-400" />
          <Stat label={m.imports.duplicates} value={state.duplicates ?? 0} tone="text-zinc-300" />
        </div>
        {!!state.unresolved?.length && (
          <ul className="mt-5 space-y-2 text-xs text-amber-300">
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
          <ul className="mt-5 space-y-2 text-xs text-rose-300">
            {state.invalid.map((row) => (
              <li key={row.row}>
                {interpolate(m.imports.rowInvalid, { row: row.row, message: row.message })}
              </li>
            ))}
          </ul>
        )}
        {canImport && (
          <form action={commitImportAction} className="mt-5">
            <input type="hidden" name="rows" value={JSON.stringify(recognized)} />
            <button className="button-primary w-full text-sm">
              {interpolate(m.imports.importRows, { count: recognized.length })}
            </button>
          </form>
        )}
        {!state.recognized && (
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
