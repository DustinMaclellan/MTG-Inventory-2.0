import "server-only";

import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getDeckSummaries() {
  const user = await requireEntitlement();
  const decks = await db.deck.findMany({
    where: { userId: user.id },
    include: {
      cards: { select: { quantity: true, cardPrintingId: true, finish: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const printingIds = [
    ...new Set(decks.flatMap((deck) => deck.cards.map((card) => card.cardPrintingId).filter(Boolean))),
  ] as string[];

  const ownedByPrintingFinish = new Map<string, number>();
  const collection = await db.collection.findFirst({ where: { userId: user.id }, select: { id: true } });
  if (collection && printingIds.length > 0) {
    const owned = await db.inventoryItem.groupBy({
      by: ["cardPrintingId", "finish"],
      where: { collectionId: collection.id, cardPrintingId: { in: printingIds } },
      _sum: { quantity: true },
    });
    for (const row of owned) {
      ownedByPrintingFinish.set(`${row.cardPrintingId}:${row.finish}`, row._sum.quantity ?? 0);
    }
  }

  return decks.map((deck) => {
    const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const ownedCards = deck.cards.reduce((sum, card) => {
      if (!card.cardPrintingId) return sum;
      return sum + Math.min(
        ownedByPrintingFinish.get(`${card.cardPrintingId}:${card.finish}`) ?? 0,
        card.quantity,
      );
    }, 0);
    return {
      id: deck.id,
      name: deck.name,
      format: deck.format,
      notes: deck.notes,
      updatedAt: deck.updatedAt,
      lineCount: deck.cards.length,
      totalCards,
      ownedCards,
    };
  });
}
