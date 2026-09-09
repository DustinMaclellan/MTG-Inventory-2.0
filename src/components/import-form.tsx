"use client";

import { useActionState } from "react";
import {
  commitImportAction,
  previewImportAction,
  type ImportPreviewState,
} from "@/app/actions";

const template = `card_name,set_code,collector_number,quantity,condition,finish,language,purchase_price,storage_location
Sol Ring,cmm,410,2,near mint,nonfoil,en,3.50,Commander Binder`;

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportPreviewState, FormData>(
    previewImportAction,
    {},
  );
  const recognized = state.recognized ?? [];
  const canImport = recognized.length > 0 && !state.invalid?.length && !state.unresolved?.length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <form action={action} className="panel p-5">
        <label className="text-sm font-medium">CSV data</label>
        <textarea name="csv" className="field mt-3 min-h-72 resize-y font-mono text-xs leading-6" defaultValue={template} />
        <button disabled={pending} className="button-primary mt-4 text-sm">
          {pending ? "Checking exact printings…" : "Preview import"}
        </button>
        {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}
      </form>
      <section className="panel p-5">
        <h2 className="font-medium">Import review</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <Stat label="Recognized" value={recognized.length} tone="text-emerald-400" />
          <Stat label="Unresolved" value={state.unresolved?.length ?? 0} tone="text-amber-400" />
          <Stat label="Invalid" value={state.invalid?.length ?? 0} tone="text-rose-400" />
          <Stat label="Duplicates" value={state.duplicates ?? 0} tone="text-zinc-300" />
        </div>
        {!!state.unresolved?.length && (
          <ul className="mt-5 space-y-2 text-xs text-amber-300">
            {state.unresolved.map((row) => <li key={row.row}>Row {row.row}: {row.cardName} ({row.printing})</li>)}
          </ul>
        )}
        {!!state.invalid?.length && (
          <ul className="mt-5 space-y-2 text-xs text-rose-300">
            {state.invalid.map((row) => <li key={row.row}>Row {row.row}: {row.message}</li>)}
          </ul>
        )}
        {canImport && (
          <form action={commitImportAction} className="mt-5">
            <input type="hidden" name="rows" value={JSON.stringify(recognized)} />
            <button className="button-primary w-full text-sm">Import {recognized.length} rows</button>
          </form>
        )}
        {!state.recognized && <p className="mt-5 text-sm leading-6 text-zinc-500">Previewing never changes your collection. Import is enabled only when every row resolves to an exact catalog printing.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-xl bg-white/[.03] p-4"><p className={`text-2xl font-semibold ${tone}`}>{value}</p><p className="mt-1 text-xs text-zinc-600">{label}</p></div>;
}
