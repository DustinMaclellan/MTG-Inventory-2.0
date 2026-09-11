"use client";

import { duplicateDeckAction } from "@/app/decks/actions";
import { useI18n } from "@/i18n/provider";

export function DuplicateDeckButton({ deckId }: { deckId: string }) {
  const { m } = useI18n();
  return (
    <form action={duplicateDeckAction}>
      <input type="hidden" name="deckId" value={deckId} />
      <button
        type="submit"
        className="rounded-xl border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-white/16 hover:text-zinc-200 transition-colors"
      >
        {m.decks.duplicate}
      </button>
    </form>
  );
}
