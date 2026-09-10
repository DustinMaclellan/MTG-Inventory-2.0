"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDeckAction } from "@/app/decks/actions";
import type { DeckFormState } from "@/app/decks/actions";

const FORMATS = [
  { value: "commander", label: "Commander / EDH" },
  { value: "standard", label: "Standard" },
  { value: "modern", label: "Modern" },
  { value: "legacy", label: "Legacy" },
  { value: "vintage", label: "Vintage" },
  { value: "pioneer", label: "Pioneer" },
  { value: "pauper", label: "Pauper" },
  { value: "draft", label: "Draft / Limited" },
];

export function NewDeckForm() {
  const [state, formAction, pending] = useActionState<DeckFormState, FormData>(
    createDeckAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Deck name <span className="text-rose-400">*</span>
        </label>
        <input name="name" required className="field" placeholder="My Commander Deck" maxLength={80} autoFocus />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Format</label>
        <select name="format" defaultValue="" className="field">
          <option value="">— select format —</option>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Notes</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={500}
          className="field resize-none"
          placeholder="Deck strategy, themes, or build notes…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button disabled={pending} className="button-primary disabled:opacity-50">
          {pending ? "Creating…" : "Create deck"}
        </button>
        <Link href="/decks" className="button-secondary">Cancel</Link>
      </div>
    </form>
  );
}
