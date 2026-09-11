"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Finish } from "@prisma/client";
import { Check, Plus, Search } from "lucide-react";
import { addDeckCardAction } from "@/app/decks/actions";
import type { DeckFormState } from "@/app/decks/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

export type SearchResult = {
  cardId: string;
  printingId: string;
  name: string;
  typeLine: string | null;
  imageSmallUrl: string | null;
  setCode: string;
  setName: string;
  collectorNumber: string;
  finishes: Finish[];
  ownedByFinish: Partial<Record<Finish, number>>;
};

export type DeckPrintingFinish = {
  printingId: string;
  finish: Finish;
};

export function DeckCardSearch({
  deckId,
  existingEntries,
  autoFocus = false,
}: {
  deckId: string;
  existingEntries: DeckPrintingFinish[];
  autoFocus?: boolean;
}) {
  const { m } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function search(q: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/deck-search?q=${encodeURIComponent(q.trim())}`);
        setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 280);
  }

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={19}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          ref={inputRef}
          className="field field-with-icon h-12 text-base"
          placeholder={m.decks.cardName}
          value={query}
          aria-label={m.decks.addCards}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        />
      </div>

      {searching && (
        <p className="py-1 text-sm text-zinc-500">{m.decks.searching}</p>
      )}

      {results.length > 0 && (
        <div className="max-h-[min(28rem,55vh)] divide-y divide-white/6 overflow-y-auto rounded-xl border border-white/8">
          {results.map((card) => (
            <SearchResultRow
              key={card.printingId}
              card={card}
              deckId={deckId}
              existingEntries={existingEntries}
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
  existingEntries,
  onAdded,
}: {
  card: SearchResult;
  deckId: string;
  existingEntries: DeckPrintingFinish[];
  onAdded: () => void;
}) {
  const { m } = useI18n();
  const finishOptions = card.finishes.length > 0 ? card.finishes : (["NONFOIL"] as Finish[]);
  const [finish, setFinish] = useState<Finish>(finishOptions[0] ?? "NONFOIL");
  const finishLocked = finishOptions.length <= 1;
  const ownedQuantity = card.ownedByFinish[finish] ?? 0;
  const alreadyAdded = existingEntries.some(
    (entry) => entry.printingId === card.printingId && entry.finish === finish,
  );
  const [state, formAction, pending] = useActionState<DeckFormState, FormData>(
    addDeckCardAction,
    {},
  );

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow">
          {card.imageSmallUrl && (
            <Image src={card.imageSmallUrl} alt="" fill sizes="44px" className="object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-sm font-semibold leading-snug">{card.name}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            {card.setName} · {card.setCode.toUpperCase()} #{card.collectorNumber}
            {finishLocked ? ` · ${m.finish[finish]}` : null}
          </p>
          {ownedQuantity > 0 ? (
            <p className="mt-1 text-[11px] font-semibold text-emerald-500">
              {interpolate(m.decks.youOwn, { count: ownedQuantity })}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-600">{m.decks.notOwned}</p>
          )}
        </div>
      </div>

      <div className="relative shrink-0">
        <form
          action={async (fd) => { await formAction(fd); onAdded(); }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="deckId" value={deckId} />
          <input type="hidden" name="cardId" value={card.cardId} />
          <input type="hidden" name="printingId" value={card.printingId} />
          <input type="hidden" name="isCommanderZone" value="false" />
          {finishLocked ? (
            <input type="hidden" name="finish" value={finish} />
          ) : (
            <select
              className="field w-[8.5rem] px-2.5 py-1.5 pr-7 text-xs"
              name="finish"
              value={finish}
              onChange={(event) => setFinish(event.target.value as Finish)}
              aria-label={m.add.finish}
            >
              {finishOptions.map((option) => (
                <option key={option} value={option}>
                  {m.finish[option]}
                </option>
              ))}
            </select>
          )}

          <input
            name="quantity"
            type="number"
            min="1"
            max="99"
            defaultValue="1"
            className="w-14 rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-center text-sm outline-none focus:border-accent/50"
            aria-label={m.decks.qty}
          />

          <button
            disabled={pending || alreadyAdded}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              alreadyAdded
                ? "border border-emerald-400/30 text-emerald-500 cursor-default"
                : "bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50"
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
        </form>
        {state.error ? (
          <p className="mt-1 text-xs text-rose-400 sm:text-right">{state.error}</p>
        ) : null}
      </div>
    </div>
  );
}
