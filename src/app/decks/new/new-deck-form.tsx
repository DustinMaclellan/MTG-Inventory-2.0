"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDeckAction } from "@/app/decks/actions";
import type { DeckFormState } from "@/app/decks/actions";
import { useI18n } from "@/i18n/provider";
import { DECK_FORMATS } from "@/lib/deck-formats";

export function NewDeckForm() {
  const { m } = useI18n();
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
          {m.decks.deckName} <span className="text-rose-400">*</span>
        </label>
        <input name="name" required className="field" placeholder={m.decks.namePlaceholder} maxLength={80} autoFocus />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">{m.decks.format}</label>
        <select name="format" defaultValue="" className="field">
          <option value="">{m.decks.selectFormat}</option>
          {DECK_FORMATS.map((value) => (
            <option key={value} value={value}>{m.format[value]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">{m.decks.notes}</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={500}
          className="field resize-none"
          placeholder={m.decks.notesPlaceholder}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button disabled={pending} className="button-primary disabled:opacity-50">
          {pending ? m.decks.creating : m.decks.create}
        </button>
        <Link href="/decks" className="button-secondary">{m.common.cancel}</Link>
      </div>
    </form>
  );
}
