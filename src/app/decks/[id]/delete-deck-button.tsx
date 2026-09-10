"use client";

import { deleteDeckAction } from "@/app/decks/actions";

export function DeleteDeckButton({ deckId, deckName }: { deckId: string; deckName: string }) {
  return (
    <form action={deleteDeckAction}>
      <input type="hidden" name="deckId" value={deckId} />
      <button
        type="submit"
        className="w-full rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        onClick={(e) => {
          if (!confirm(`Delete "${deckName}"? This cannot be undone.`)) e.preventDefault();
        }}
      >
        Delete deck
      </button>
    </form>
  );
}
