import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getMessages, interpolate, isLocale, type Messages } from "@/i18n";
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

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireEntitlement();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);

  const deck = await db.deck.findFirst({
    where: { id, userId: user.id },
    include: {
      cards: {
        include: {
          card: { select: { id: true, name: true } },
          // The specific printing the user chose when adding this card
          printing: {
            select: {
              id: true,
              imageSmallUrl: true,
              collectorNumber: true,
              set: { select: { code: true, name: true } },
            },
          },
        },
        orderBy: [{ isCommanderZone: "desc" }, { card: { name: "asc" } }],
      },
    },
  });

  if (!deck) notFound();

  // Ownership check — per specific printing chosen for each deck entry
  const deckPrintingIds = deck.cards.map((dc) => dc.cardPrintingId).filter(Boolean) as string[];
  const collection = await db.collection.findFirst({ where: { userId: user.id }, select: { id: true } });
  const ownedByPrintingId = new Map<string, number>();

  if (collection && deckPrintingIds.length > 0) {
    const owned = await db.inventoryItem.groupBy({
      by: ["cardPrintingId"],
      where: { collectionId: collection.id, cardPrintingId: { in: deckPrintingIds } },
      _sum: { quantity: true },
    });
    for (const o of owned) {
      ownedByPrintingId.set(o.cardPrintingId, o._sum.quantity ?? 0);
    }
  }

  const totalCards = deck.cards.reduce((s, dc) => s + dc.quantity, 0);
  const ownedCards = deck.cards.reduce((s, dc) => {
    const key = dc.cardPrintingId ?? "";
    return s + Math.min(ownedByPrintingId.get(key) ?? 0, dc.quantity);
  }, 0);
  const missingCards = totalCards - ownedCards;
  const completionPct = totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0;

  // Pass the printing IDs already in this deck — search will dedup by printing
  const existingPrintingIds = deckPrintingIds;

  // Split into owned/partial/missing groups for display
  const withOwnership = deck.cards.map((dc) => {
    const owned = ownedByPrintingId.get(dc.cardPrintingId ?? "") ?? 0;
    return {
      ...dc,
      ownedQty: owned,
      fullyOwned: owned >= dc.quantity,
      partial: owned > 0 && owned < dc.quantity,
      missing: owned === 0,
    };
  });

  const commanders = withOwnership.filter((dc) => dc.isCommanderZone);
  const mainboard = withOwnership.filter((dc) => !dc.isCommanderZone);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            href="/decks"
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ← {m.decks.allDecks}
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight">{deck.name}</h1>
                {deck.format && (
                  <span className="badge">{m.format[deck.format as keyof typeof m.format] ?? deck.format}</span>
                )}
              </div>
              {deck.notes && (
                <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">{deck.notes}</p>
              )}
            </div>

            {/* Completion summary */}
            {totalCards > 0 && (
              <div className="panel flex items-center gap-6 px-6 py-4">
                <Stat label={m.decks.total} value={totalCards} />
                <Divider />
                <Stat label={m.decks.owned} value={ownedCards} color="text-emerald-400" />
                <Divider />
                <Stat label={m.decks.missing} value={missingCards} color={missingCards > 0 ? "text-rose-400" : "text-zinc-500"} />
                <Divider />
                <Stat label={m.decks.complete} value={`${completionPct}%`} color={completionPct === 100 ? "text-emerald-400" : "text-zinc-300"} />
              </div>
            )}
          </div>

        </div>

        {/* ── Main grid ───────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── Card list ──────────────────────────────────── */}
          <section className="space-y-4">
            {deck.cards.length === 0 ? (
              <div className="panel px-5 py-16 text-center">
                <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-zinc-700/40 bg-zinc-800/40 text-zinc-500">
                  <Boxes size={22} />
                </div>
                <p className="font-semibold">{m.decks.noCards}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  {m.decks.noCardsBody}
                </p>
              </div>
            ) : (
              <>
                {/* Commander zone */}
                {commanders.length > 0 && (
                  <CardGroup
                    label={m.decks.commander}
                    rows={commanders}
                    deckId={deck.id}
                    m={m}
                  />
                )}
                <CardGroup
                  label={commanders.length > 0 ? interpolate(m.decks.mainboard, { count: mainboard.length }) : undefined}
                  rows={mainboard}
                  deckId={deck.id}
                  m={m}
                />
              </>
            )}
          </section>

          {/* ── Sidebar ───────────────────────────────────── */}
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            {/* Search */}
            <div className="panel flex flex-col p-5">
              <p className="mb-1 text-sm font-semibold">{m.decks.addCards}</p>
              <p className="mb-4 text-xs text-zinc-600">
                {m.decks.addHint}
              </p>
              {/* Results scroll inside the panel — never pushes Delete down */}
              <div className="max-h-[60vh] overflow-y-auto">
                <DeckCardSearch deckId={deck.id} existingPrintingIds={existingPrintingIds} />
              </div>
            </div>

            {/* Delete */}
            <div className="panel p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-700">
                {m.decks.danger}
              </p>
              <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Card group section ────────────────────────────────────
type DeckCardRow = {
  id: string;
  cardId: string;
  cardPrintingId: string | null;
  quantity: number;
  isCommanderZone: boolean;
  ownedQty: number;
  fullyOwned: boolean;
  partial: boolean;
  missing: boolean;
  card: { name: string };
  printing: {
    id: string;
    imageSmallUrl: string | null;
    collectorNumber: string;
    set: { code: string; name: string };
  } | null;
};

function CardGroup({
  label,
  rows,
  deckId,
  m,
}: {
  label?: string;
  rows: DeckCardRow[];
  deckId: string;
  m: Messages;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
      )}
      <div className="panel overflow-hidden divide-y divide-white/5">
        {rows.map((dc) => {
          const printing = dc.printing;

          // Left border colour based on ownership
          const accentClass = dc.fullyOwned
            ? "border-l-emerald-400/60"
            : dc.partial
            ? "border-l-amber-400/60"
            : "border-l-rose-500/40";

          // Status badge
          const statusText = dc.fullyOwned
            ? m.decks.ownedBadge
            : dc.partial
            ? `${dc.ownedQty} / ${dc.quantity}`
            : m.decks.missingBadge;
          const statusColor = dc.fullyOwned
            ? "text-emerald-400 bg-emerald-400/8 border-emerald-400/20"
            : dc.partial
            ? "text-amber-400 bg-amber-400/8 border-amber-400/20"
            : "text-rose-400 bg-rose-500/8 border-rose-500/20";

          return (
            <div
              key={dc.id}
              className={`flex items-center gap-4 border-l-2 pl-4 pr-4 py-3 transition-colors hover:bg-white/[.018] ${accentClass}`}
            >
              {/* Card image */}
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow">
                {printing?.imageSmallUrl ? (
                  <Image
                    src={printing.imageSmallUrl}
                    alt={dc.card.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-700 text-[10px]">?</div>
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-snug">{dc.card.name}</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {printing
                    ? `${printing.set.name} · ${printing.set.code.toUpperCase()} #${printing.collectorNumber}`
                    : "—"}
                </p>
                {dc.isCommanderZone && (
                  <span className="mt-1 inline-block rounded border border-emerald-400/25 bg-emerald-400/8 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    {m.decks.commander}
                  </span>
                )}
              </div>

              {/* Quantity + status */}
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className="text-sm font-semibold text-zinc-300">× {dc.quantity}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                  {statusText}
                </span>
              </div>

              {/* Remove */}
              <form action={removeDeckCardAction} className="shrink-0">
                <input type="hidden" name="deckCardId" value={dc.id} />
                <input type="hidden" name="deckId" value={deckId} />
                <button
                  title={m.decks.remove}
                  className="rounded-lg p-2 text-zinc-700 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────
function Stat({ label, value, color = "text-zinc-200" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-white/8" />;
}
