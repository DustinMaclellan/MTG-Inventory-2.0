"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Search, Plus } from "lucide-react";
import { addDeckCardAction } from "@/app/decks/actions";
import type { DeckFormState } from "@/app/decks/actions";

export type SearchResult = {
  cardId: string;
  name: string;
  typeLine: string | null;
  imageSmallUrl: string | null;
  setCode: string;
  setName: string;
  collectorNumber: string;
  ownedQuantity: number;
};

export function DeckCardSearch({
  deckId,
  existingCardIds,
}: {
  deckId: string;
  existingCardIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/deck-search?q=${encodeURIComponent(q.trim())}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
        />
        <input
          className="field field-with-icon"
          placeholder="Search cards to add…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="panel divide-y divide-white/6 overflow-hidden">
          {results.slice(0, 8).map((card) => (
            <SearchResultRow
              key={card.cardId}
              card={card}
              deckId={deckId}
              alreadyAdded={existingCardIds.includes(card.cardId)}
              onAdded={() => setQuery("")}
            />
          ))}
        </div>
      )}

      {searching && (
        <p className="text-center text-xs text-zinc-600 py-2">Searching…</p>
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
  const [state, formAction, pending] = useActionState<DeckFormState, FormData>(
    addDeckCardAction,
    {},
  );

  if (state.error) {
    // Reset on next interaction
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Card image */}
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-zinc-900">
        {card.imageSmallUrl && (
          <Image src={card.imageSmallUrl} alt="" fill sizes="32px" className="object-cover" />
        )}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{card.name}</p>
        <p className="truncate text-xs text-zinc-600">
          {card.setCode.toUpperCase()} · #{card.collectorNumber}
          {card.ownedQuantity > 0 && (
            <span className="ml-2 text-emerald-500">✓ Own {card.ownedQuantity}</span>
          )}
        </p>
      </div>

      {/* Add form */}
      <form
        action={async (fd) => {
          await formAction(fd);
          onAdded();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="cardId" value={card.cardId} />
        <input type="hidden" name="isCommanderZone" value="false" />
        <input
          name="quantity"
          type="number"
          min="1"
          max="99"
          defaultValue="1"
          className="w-14 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center text-sm outline-none focus:border-emerald-400/40"
          aria-label="Quantity"
        />
        <button
          disabled={pending || alreadyAdded}
          title={alreadyAdded ? "Already in deck" : "Add to deck"}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            alreadyAdded
              ? "border border-emerald-400/30 text-emerald-500 cursor-default"
              : "button-primary !rounded-lg !p-0"
          }`}
        >
          <Plus size={15} />
        </button>
      </form>
    </div>
  );
}
