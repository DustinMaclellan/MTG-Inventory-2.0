"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { addDeckCardAction } from "@/app/decks/actions";
import type { DeckFormState } from "@/app/decks/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

export type SearchResult = {
  cardId: string;       // oracle card — used for dedup
  printingId: string;   // specific printing being added
  name: string;
  typeLine: string | null;
  imageSmallUrl: string | null;
  setCode: string;
  setName: string;
  collectorNumber: string;
  ownedQuantity: number; // how many of THIS printing the user owns
};

export function DeckCardSearch({
  deckId,
  existingPrintingIds,
}: {
  deckId: string;
  existingPrintingIds: string[];
}) {
  const { m } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/deck-search?q=${encodeURIComponent(q.trim())}`);
      setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          className="field field-with-icon text-sm"
          placeholder={m.decks.cardName}
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        />
      </div>

      {/* Spinner */}
      {searching && (
        <p className="py-1 text-center text-xs text-zinc-600">{m.decks.searching}</p>
      )}

      {/* Results — all printings of matching cards */}
      {results.length > 0 && (
        <div className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
          {results.map((card) => (
            <SearchResultRow
              key={card.printingId}
              card={card}
              deckId={deckId}
              alreadyAdded={existingPrintingIds.includes(card.printingId)}
              onAdded={() => { setQuery(""); setResults([]); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({
  card,
  deckId,
  alreadyAdded,
  onAdded,
}: {
  card: SearchResult;
  deckId: string;
  alreadyAdded: boolean;
  onAdded: () => void;
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState<DeckFormState, FormData>(
    addDeckCardAction,
    {},
  );

  return (
    <div className="bg-zinc-950/60 p-3">
      {/* Card identity */}
      <div className="flex gap-3">
        {/* Image */}
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow">
          {card.imageSmallUrl && (
            <Image src={card.imageSmallUrl} alt="" fill sizes="44px" className="object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-semibold leading-snug">{card.name}</p>
          {/* Full set name + code + collector number */}
          <p className="mt-0.5 text-xs text-zinc-400">
            {card.setName}
          </p>
          <p className="text-[11px] text-zinc-600">
            {card.setCode.toUpperCase()} · #{card.collectorNumber}
          </p>
          {card.ownedQuantity > 0 ? (
            <p className="mt-1 text-[11px] font-semibold text-emerald-500">
              {interpolate(m.decks.youOwn, { count: card.ownedQuantity })}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-700">{m.decks.notOwned}</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <form
        action={async (fd) => { await formAction(fd); onAdded(); }}
        className="mt-3 flex items-center gap-2"
      >
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="cardId" value={card.cardId} />
        <input type="hidden" name="printingId" value={card.printingId} />
        <input type="hidden" name="isCommanderZone" value="false" />

        <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{m.decks.qty}</label>
        <input
          name="quantity"
          type="number"
          min="1"
          max="99"
          defaultValue="1"
          className="w-16 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-center text-sm outline-none focus:border-emerald-400/50"
          aria-label={m.decks.qty}
        />

        <button
          disabled={pending || alreadyAdded}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            alreadyAdded
              ? "border border-emerald-400/30 text-emerald-500 cursor-default"
              : "bg-emerald-400 text-black hover:bg-emerald-300 disabled:opacity-50"
          }`}
        >
          {alreadyAdded ? (
            <><Check size={13} /> {m.decks.inDeck}</>
          ) : pending ? (
            m.decks.adding
          ) : (
            <><Plus size={13} /> {m.decks.add}</>
          )}
        </button>

        {state.error && (
          <p className="text-xs text-rose-400">{state.error}</p>
        )}
      </form>
    </div>
  );
}
