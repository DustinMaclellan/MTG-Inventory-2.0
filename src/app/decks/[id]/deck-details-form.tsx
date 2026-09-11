"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateDeckAction, type DeckFormState } from "@/app/decks/actions";
import { DECK_FORMATS } from "@/lib/deck-formats";
import { useI18n } from "@/i18n/provider";

export function DeckDetailsForm({
  deckId,
  name,
  format,
  notes,
}: {
  deckId: string;
  name: string;
  format: string | null;
  notes: string | null;
}) {
  const { m } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState<DeckFormState, FormData>(updateDeckAction, {});

  useEffect(() => {
    if (!pending && state.notice) dialogRef.current?.close();
  }, [pending, state.notice]);

  function open() {
    setFormKey((key) => key + 1);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        title={m.decks.editDeck}
        onClick={open}
        className="rounded-md p-1.5 text-zinc-600 hover:bg-white/6 hover:text-zinc-300 transition-colors"
      >
        <Pencil size={16} />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(calc(100%-2rem),28rem)] rounded-2xl border border-white/10 bg-[#0f1318] p-0 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-black/65"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <form key={formKey} action={formAction} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{m.decks.editDeck}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md p-1 text-zinc-500 hover:bg-white/6 hover:text-zinc-200 transition-colors"
              aria-label={m.common.cancel}
            >
              <X size={16} />
            </button>
          </div>

          <input type="hidden" name="deckId" value={deckId} />

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {m.decks.deckName}
            </span>
            <input
              name="name"
              defaultValue={name}
              required
              maxLength={80}
              className="field min-w-0 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {m.decks.format}
            </span>
            <select
              name="format"
              defaultValue={format ?? ""}
              className="field min-w-0 px-3 py-2 pr-8 text-sm"
            >
              <option value="">{m.decks.selectFormat}</option>
              {DECK_FORMATS.map((value) => (
                <option key={value} value={value}>
                  {m.format[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {m.decks.notes}
            </span>
            <textarea
              name="notes"
              defaultValue={notes ?? ""}
              maxLength={500}
              rows={4}
              className="field min-w-0 resize-y px-3 py-2 text-sm"
              placeholder={m.decks.notesPlaceholder}
            />
          </label>

          {state.error && <p className="text-sm text-rose-400">{state.error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
              {pending ? m.common.saving : m.decks.saveDeck}
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              {m.common.cancel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
