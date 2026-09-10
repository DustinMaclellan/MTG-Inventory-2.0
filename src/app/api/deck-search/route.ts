import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const q = z.string().min(2).max(100).safeParse(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  if (!q.success) return NextResponse.json([]);

  // Search oracle cards by name (case-insensitive, first 10 matches)
  const cards = await db.card.findMany({
    where: {
      OR: [
        { normalizedName: { contains: q.data.toLowerCase() } },
        { name: { contains: q.data, mode: "insensitive" } },
      ],
    },
    take: 10,
    include: {
      printings: {
        take: 1,
        orderBy: { releasedAt: "desc" },
        select: {
          imageSmallUrl: true,
          set: { select: { code: true, name: true } },
          collectorNumber: true,
        },
      },
    },
  });

  // For each card, check how many the user owns (across any printing)
  const cardIds = cards.map((c) => c.id);
  const collection = await db.collection.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  const owned =
    collection && cardIds.length > 0
      ? await db.inventoryItem.groupBy({
          by: ["cardPrintingId"],
          where: {
            collectionId: collection.id,
            cardPrinting: { cardId: { in: cardIds } },
          },
          _sum: { quantity: true },
        })
      : [];

  // Map printing cardId → owned quantity
  const printingIds = owned.map((o) => o.cardPrintingId);
  const printingToCard =
    printingIds.length > 0
      ? await db.cardPrinting.findMany({
          where: { id: { in: printingIds } },
          select: { id: true, cardId: true },
        })
      : [];

  const ownedByCardId = new Map<string, number>();
  for (const pt of printingToCard) {
    const match = owned.find((o) => o.cardPrintingId === pt.id);
    const qty = match?._sum.quantity ?? 0;
    ownedByCardId.set(pt.cardId, (ownedByCardId.get(pt.cardId) ?? 0) + qty);
  }

  const results = cards.map((card) => {
    const printing = card.printings[0];
    return {
      cardId: card.id,
      name: card.name,
      typeLine: card.typeLine,
      imageSmallUrl: printing?.imageSmallUrl ?? null,
      setCode: printing?.set.code ?? "",
      setName: printing?.set.name ?? "",
      collectorNumber: printing?.collectorNumber ?? "",
      ownedQuantity: ownedByCardId.get(card.id) ?? 0,
    };
  });

  return NextResponse.json(results);
}
