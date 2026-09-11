import Link from "next/link";
import { PlusCircle, Boxes } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { dateLocale, getMessages, interpolate, isLocale, pickPlural, type Messages } from "@/i18n";
import { requireEntitlement } from "@/lib/auth";
import { getDeckSummaries } from "@/services/decks";
import { DeleteDeckButton } from "./[id]/delete-deck-button";

export const metadata = { title: "Decks" };

function formatLabel(format: string, m: Messages) {
  return m.format[format as keyof typeof m.format] ?? format;
}

export default async function DecksPage() {
  const user = await requireEntitlement();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const decks = await getDeckSummaries();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              {pickPlural(decks.length, m.decks.count, m.decks.countPlural)}
            </p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{m.decks.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">{m.decks.intro}</p>
          </div>
          <Link href="/decks/new" className="button-primary text-sm">
            <PlusCircle size={16} /> {m.decks.newDeck}
          </Link>
        </header>

        {decks.length === 0 ? (
          <div className="panel px-5 py-20 text-center">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/8 text-accent">
              <Boxes size={22} />
            </div>
            <p className="font-semibold">{m.decks.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
              {m.decks.emptyBody}
            </p>
            <Link href="/decks/new" className="button-primary mt-6 text-sm">
              <PlusCircle size={16} /> {m.decks.emptyCta}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {decks.map((deck) => (
              <article
                key={deck.id}
                className="panel relative flex flex-col gap-3 p-5 transition-all hover:border-accent/15 hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"
              >
                <Link
                  href={`/decks/${deck.id}`}
                  aria-label={deck.name}
                  className="absolute inset-0 z-0 rounded-[inherit] peer"
                />
                <div className="pointer-events-none min-w-0 peer-hover:[&_.deck-name]:text-accent">
                  <p className="deck-name truncate font-semibold leading-snug transition-colors">
                    {deck.name}
                  </p>
                  {deck.format && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatLabel(deck.format, m)}
                    </p>
                  )}
                  {deck.notes && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                      {deck.notes}
                    </p>
                  )}
                </div>
                <div className="pointer-events-none mt-auto flex items-center justify-between gap-3">
                  <p className="text-[11px] text-zinc-700">
                    {interpolate(m.decks.updated, {
                      date: deck.updatedAt.toLocaleDateString(dateLocale(locale)),
                    })}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs tabular-nums text-zinc-500">
                      {deck.totalCards > 0
                        ? interpolate(m.decks.ownedOf, { owned: deck.ownedCards, total: deck.totalCards })
                        : interpolate(m.decks.cardsCount, { count: 0 })}
                    </span>
                    <div className="pointer-events-auto relative z-10">
                      <DeleteDeckButton deckId={deck.id} deckName={deck.name} compact />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
