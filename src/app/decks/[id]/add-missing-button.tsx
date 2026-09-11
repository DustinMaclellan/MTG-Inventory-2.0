"use client";

import { useActionState } from "react";
import { addAllMissingToCollectionAction, type DeckFormState } from "@/app/decks/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

export function AddMissingButton({ deckId, count }: { deckId: string; count: number }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<DeckFormState, FormData>(
    addAllMissingToCollectionAction,
    {},
  );

  if (count <= 0 && !state.notice && !state.error) return null;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="deckId" value={deckId} />
      {count > 0 && (
        <button
          disabled={pending}
          className="text-xs text-zinc-500 hover:text-accent disabled:opacity-50 transition-colors"
        >
          {pending ? m.common.saving : interpolate(m.decks.addAllMissing, { count })}
        </button>
      )}
      {state.notice && <p className="text-xs text-accent">{state.notice}</p>}
      {state.error && <p className="text-xs text-rose-400">{state.error}</p>}
    </form>
  );
}
