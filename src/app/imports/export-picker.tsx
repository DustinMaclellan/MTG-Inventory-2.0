"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

type NamedOption = { name: string; cardCount: number };
type DeckOption = { id: string; name: string; cardCount: number };

function cardsLabel(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`;
}

export function ExportPicker({
  collectionCount,
  binders,
  decks,
}: {
  collectionCount: number;
  binders: NamedOption[];
  decks: DeckOption[];
}) {
  const options = useMemo(() => {
    const items: Array<{ value: string; href: string; label: string; group: string }> = [
      {
        value: "collection",
        href: "/api/export",
        label: `Entire collection · ${cardsLabel(collectionCount)}`,
        group: "Collection",
      },
      ...binders.map((binder) => ({
        value: `storage:${binder.name}`,
        href: `/api/export?storage=${encodeURIComponent(binder.name === "Unassigned" ? "unassigned" : binder.name)}`,
        label: `${binder.name} · ${cardsLabel(binder.cardCount)}`,
        group: "Binders",
      })),
      ...decks.map((deck) => ({
        value: `deck:${deck.id}`,
        href: `/api/export?deck=${deck.id}`,
        label: `${deck.name} · ${cardsLabel(deck.cardCount)}`,
        group: "Decks",
      })),
    ];
    return items;
  }, [collectionCount, binders, decks]);

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
          Download
        </a>
      </div>
    </section>
  );
}
