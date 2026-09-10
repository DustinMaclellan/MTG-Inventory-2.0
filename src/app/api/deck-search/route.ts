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

  // Search every printing so the user can pick the exact version they want
  const printings = await db.cardPrinting.findMany({
    where: {
      OR: [
        { card: { normalizedName: { contains: q.data.toLowerCase() } } },
        { card: { name: { contains: q.data, mode: "insensitive" } } },
      ],
    },
    take: 30,
    orderBy: [
      { card: { name: "asc" } },
      { releasedAt: "desc" },
    ],
    select: {
      id: true,
      imageSmallUrl: true,
      collectorNumber: true,
      releasedAt: true,
      card: {
        select: { id: true, name: true, typeLine: true },
      },
      set: { select: { code: true, name: true } },
    },
  });

  if (printings.length === 0) return NextResponse.json([]);

  // Per-printing owned quantity from the user's collection
  const printingIds = printings.map((p) => p.id);
  const collection = await db.collection.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  const ownedByPrintingId = new Map<string, number>();
  if (collection) {
    const owned = await db.inventoryItem.groupBy({
      by: ["cardPrintingId"],
      where: { collectionId: collection.id, cardPrintingId: { in: printingIds } },
      _sum: { quantity: true },
    });
    for (const o of owned) {
      ownedByPrintingId.set(o.cardPrintingId, o._sum.quantity ?? 0);
    }
  }

  const results = printings.map((p) => ({
    cardId: p.card.id,
    printingId: p.id,
    name: p.card.name,
    typeLine: p.card.typeLine,
    imageSmallUrl: p.imageSmallUrl,
    setCode: p.set.code,
    setName: p.set.name,
    collectorNumber: p.collectorNumber,
    ownedQuantity: ownedByPrintingId.get(p.id) ?? 0,
  }));

  return NextResponse.json(results);
}
