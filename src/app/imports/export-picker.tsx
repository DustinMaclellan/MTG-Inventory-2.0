"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export-formats";

type NamedOption = { name: string; cardCount: number };
type DeckOption = { id: string; name: string; cardCount: number };

function withFormat(href: string, format: ExportFormat) {
  const url = new URL(href, "https://mystic-ledger.local");
  url.searchParams.set("format", format);
  return `${url.pathname}${url.search}`;
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
  const [format, setFormat] = useState<ExportFormat>("moxfield");
  const sourceHref = options.find((item) => item.value === selected)?.href ?? "/api/export";
  const href = withFormat(sourceHref, format);
  const formatLabels: Record<ExportFormat, string> = {
    moxfield: m.imports.formatMoxfield,
    archidekt: m.imports.formatArchidekt,
    manabox: m.imports.formatManabox,
    deckbox: m.imports.formatDeckbox,
    tcgplayer: m.imports.formatTcgplayer,
    mtggoldfish: m.imports.formatMtggoldfish,
    arena: m.imports.formatArena,
    "mystic-ledger": m.imports.formatLedger,
  };
  const formatHints: Record<ExportFormat, string> = {
    moxfield: m.imports.hintMoxfield,
    archidekt: m.imports.hintArchidekt,
    manabox: m.imports.hintManabox,
    deckbox: m.imports.hintDeckbox,
    tcgplayer: m.imports.hintTcgplayer,
    mtggoldfish: m.imports.hintMtggoldfish,
    arena: m.imports.hintArena,
    "mystic-ledger": m.imports.hintLedger,
  };

  return (
    <section className="panel space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">{m.imports.exportWhat}</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="field h-11 w-full py-0 pl-3 pr-8 text-sm"
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
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">{m.imports.exportFormat}</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="field h-11 w-full py-0 pl-3 pr-8 text-sm"
          >
            {EXPORT_FORMATS.map((id) => (
              <option key={id} value={id}>
                {formatLabels[id]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm leading-6 text-zinc-500">{formatHints[format]}</p>
      <a href={href} className="button-primary h-11 text-sm">
        <Download size={16} />
        {m.common.download}
      </a>
    </section>
  );
}
