"use client";

import { Minus, Plus } from "lucide-react";
import { updateDeckCardAction } from "@/app/decks/actions";
import { useI18n } from "@/i18n/provider";

export function DeckCardControls({
  deckId,
  deckCardId,
  quantity,
}: {
  deckId: string;
  deckCardId: string;
  quantity: number;
}) {
  const { m } = useI18n();

  return (
    <div className="flex items-center gap-0.5">
      <form action={updateDeckCardAction}>
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="deckCardId" value={deckCardId} />
        <input type="hidden" name="quantity" value={Math.max(1, quantity - 1)} />
        <button
          type="submit"
          disabled={quantity <= 1}
          title={m.decks.decreaseQty}
          className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-white/6 hover:text-zinc-200 disabled:opacity-30 transition-colors"
        >
          <Minus size={12} />
        </button>
      </form>
      <span className="min-w-6 text-center text-sm font-semibold text-zinc-300">{quantity}</span>
      <form action={updateDeckCardAction}>
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="deckCardId" value={deckCardId} />
        <input type="hidden" name="quantity" value={Math.min(99, quantity + 1)} />
        <button
          type="submit"
          disabled={quantity >= 99}
          title={m.decks.increaseQty}
          className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-white/6 hover:text-zinc-200 disabled:opacity-30 transition-colors"
        >
          <Plus size={12} />
        </button>
      </form>
    </div>
  );
}
