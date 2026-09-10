"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

type NamedOption = { name: string; cardCount: number };
type DeckOption = { id: string; name: string; cardCount: number };

export function ExportPicker({
  collectionCount,
  binders,
  decks,
}: {
  collectionCount: number;
  binders: NamedOption[];
  decks: DeckOption[];
}) {
  const { m } = useI18n();

  const options = useMemo(() => {
    const cardsWord = (count: number) => (count === 1 ? m.imports.card : m.imports.cards);
    const items: Array<{ value: string; href: string; label: string; group: string }> = [
      {
        value: "collection",
        href: "/api/export",
        label: interpolate(m.imports.entireCollection, {
          count: collectionCount,
          cards: cardsWord(collectionCount),
        }),
        group: m.imports.groupCollection,
      },
      ...binders.map((binder) => ({
        value: `storage:${binder.name}`,
        href: `/api/export?storage=${encodeURIComponent(binder.name === "Unassigned" ? "unassigned" : binder.name)}`,
        label: interpolate(m.imports.binderLabel, {
          name: binder.name === "Unassigned" ? m.common.unassigned : binder.name,
          count: binder.cardCount,
          cards: cardsWord(binder.cardCount),
        }),
        group: m.imports.groupBinders,
      })),
      ...decks.map((deck) => ({
        value: `deck:${deck.id}`,
        href: `/api/export?deck=${deck.id}`,
        label: interpolate(m.imports.deckLabel, {
          name: deck.name,
          count: deck.cardCount,
          cards: cardsWord(deck.cardCount),
        }),
        group: m.imports.groupDecks,
      })),
    ];
    return items;
  }, [collectionCount, binders, decks, m]);

  const groups = [...new Set(options.map((item) => item.group))];
  const [selected, setSelected] = useState(options[0]?.value ?? "collection");
  const href = options.find((item) => item.value === selected)?.href ?? "/api/export";

  return (
    <section className="panel p-5">
      <div className="mt-0 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="field h-11 w-full max-w-md py-0 pl-3 pr-8 text-sm"
        >
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((item) => item.group === group)
                .map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <a href={href} className="button-primary h-11 text-sm">
          <Download size={16} />
          {m.common.download}
        </a>
      </div>
    </section>
  );
}
