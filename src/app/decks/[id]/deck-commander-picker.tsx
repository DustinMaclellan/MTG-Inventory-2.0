"use client";

import type { Finish } from "@prisma/client";
import { setDeckCommanderAction } from "@/app/decks/actions";
import { useI18n } from "@/i18n/provider";

export function DeckCommanderPicker({
  deckId,
  commanderId,
  cards,
}: {
  deckId: string;
  commanderId: string | null;
  cards: Array<{
    id: string;
    cardId: string;
    cardPrintingId: string | null;
    name: string;
    finish: Finish;
  }>;
}) {
  const { m } = useI18n();

  return (
    <form action={setDeckCommanderAction} className="mb-3" key={commanderId ?? "none"}>
      <input type="hidden" name="deckId" value={deckId} />
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {m.decks.commander}
        </span>
        <select
          name="deckCardId"
          defaultValue={commanderId ?? ""}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="field min-w-0 px-3 py-2 pr-8 text-sm"
        >
          <option value="">{m.decks.chooseCommander}</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} · {m.finish[card.finish]}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
