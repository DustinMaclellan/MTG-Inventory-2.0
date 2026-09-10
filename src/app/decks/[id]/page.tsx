import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeDeckCardAction } from "@/app/decks/actions";
import { DeleteDeckButton } from "./delete-deck-button";
import { DeckCardSearch } from "./deck-card-search";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = await db.deck.findUnique({ where: { id }, select: { name: true } });
  return { title: deck?.name ?? "Deck" };
}

const FORMAT_LABELS: Record<string, string> = {
  commander: "Commander / EDH",
  standard: "Standard",
  modern: "Modern",
  legacy: "Legacy",
  vintage: "Vintage",
  pioneer: "Pioneer",
  pauper: "Pauper",
  draft: "Draft / Limited",
};

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEntitlement();

  const deck = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: {
      cards: {
        include: {
          card: {
            include: {
              printings: {
                take: 1,
                orderBy: { releasedAt: "desc" },
                select: {
                  id: true,
                  imageSmallUrl: true,
                  set: { select: { code: true } },
                  collectorNumber: true,
                },
              },
            },
          },
        },
        orderBy: [{ isCommanderZone: "desc" }, { card: { name: "asc" } }],
      },
    },
  });

  if (!deck) notFound();

  // Check ownership for all cards in the deck
  const cardIds = deck.cards.map((dc) => dc.cardId);
  const collection = await db.collection.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  const ownedByCardId = new Map<string, number>();
  if (collection && cardIds.length > 0) {
    const printings = await db.cardPrinting.findMany({
      where: { cardId: { in: cardIds } },
      select: { id: true, cardId: true },
    });
    const printingIds = printings.map((p) => p.id);
    if (printingIds.length > 0) {
      const owned = await db.inventoryItem.groupBy({
        by: ["cardPrintingId"],
        where: { collectionId: collection.id, cardPrintingId: { in: printingIds } },
        _sum: { quantity: true },
      });
      for (const o of owned) {
        const p = printings.find((pr) => pr.id === o.cardPrintingId);
        if (p) {
          ownedByCardId.set(p.cardId, (ownedByCardId.get(p.cardId) ?? 0) + (o._sum.quantity ?? 0));
        }
      }
    }
  }

  const totalCards = deck.cards.reduce((s, dc) => s + dc.quantity, 0);
  const ownedCards = deck.cards.reduce((s, dc) => {
    const owned = ownedByCardId.get(dc.cardId) ?? 0;
    return s + Math.min(owned, dc.quantity);
  }, 0);
  const missingCards = totalCards - ownedCards;

  const existingCardIds = deck.cards.map((dc) => dc.cardId);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/decks" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← All decks
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{deck.name}</h1>
            {deck.format && (
              <p className="mt-1 text-sm text-zinc-500">{FORMAT_LABELS[deck.format] ?? deck.format}</p>
            )}
            {deck.notes && (
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600">{deck.notes}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="panel px-4 py-3 text-center min-w-[80px]">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Cards</p>
              <p className="mt-1 text-xl font-semibold">{totalCards}</p>
            </div>
            <div className="panel px-4 py-3 text-center min-w-[80px]">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Owned</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">{ownedCards}</p>
            </div>
            <div className="panel px-4 py-3 text-center min-w-[80px]">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Missing</p>
              <p className={`mt-1 text-xl font-semibold ${missingCards > 0 ? "text-rose-400" : "text-zinc-400"}`}>
                {missingCards}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* ── Card list ────────────────────────────────── */}
          <section>
            <div className="panel overflow-hidden">
              {deck.cards.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                  No cards yet. Search and add cards using the panel on the right.
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {deck.cards.map((dc) => {
                    const printing = dc.card.printings[0];
                    const owned = ownedByCardId.get(dc.cardId) ?? 0;
                    const fullyOwned = owned >= dc.quantity;
                    const partiallyOwned = owned > 0 && !fullyOwned;
                    const missing = !fullyOwned && owned === 0;

                    return (
                      <div
                        key={dc.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[.02] transition-colors"
                      >
                        {/* Ownership indicator */}
                        {fullyOwned ? (
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle size={16} className={`shrink-0 ${missing ? "text-rose-500/60" : "text-amber-400/60"}`} />
                        )}

                        {/* Card image */}
                        <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-zinc-900">
                          {printing?.imageSmallUrl && (
                            <Image
                              src={printing.imageSmallUrl}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          )}
                        </div>

                        {/* Identity */}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{dc.card.name}</p>
                          <p className="text-xs text-zinc-600">
                            {printing ? `${printing.set.code.toUpperCase()} · #${printing.collectorNumber}` : ""}
                            {dc.isCommanderZone && (
                              <span className="ml-2 rounded-sm border border-emerald-400/30 px-1 text-[10px] text-emerald-400">
                                Commander
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Qty needed vs owned */}
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">× {dc.quantity}</p>
                          <p className={`text-[11px] ${fullyOwned ? "text-emerald-500" : partiallyOwned ? "text-amber-400" : "text-rose-400"}`}>
                            {fullyOwned ? "✓ owned" : partiallyOwned ? `own ${owned}` : "missing"}
                          </p>
                        </div>

                        {/* Remove */}
                        <form action={removeDeckCardAction} className="shrink-0">
                          <input type="hidden" name="deckCardId" value={dc.id} />
                          <input type="hidden" name="deckId" value={deck.id} />
                          <button
                            title="Remove from deck"
                            className="rounded-lg p-2 text-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Sidebar: search + delete ──────────────────── */}
          <aside className="space-y-4">
            <div className="panel p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Add cards
              </p>
              <DeckCardSearch deckId={deck.id} existingCardIds={existingCardIds} />
            </div>

            <div className="panel p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Danger zone
              </p>
              <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
