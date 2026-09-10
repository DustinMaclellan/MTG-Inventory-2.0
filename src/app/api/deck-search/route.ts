import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasEntitlement } from "@/lib/entitlements";
import { searchCatalog } from "@/services/catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });
  if (!hasEntitlement(user)) return NextResponse.json([], { status: 402 });

  const q = z.string().min(2).max(100).safeParse(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  if (!q.success) return NextResponse.json([]);

  const printings = await searchCatalog(q.data);
  if (printings.length === 0) return NextResponse.json([]);

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
    cardId: p.cardId,
    printingId: p.id,
    name: p.name,
    typeLine: p.card.typeLine,
    imageSmallUrl: p.imageSmallUrl,
    setCode: p.set.code,
    setName: p.set.name,
    collectorNumber: p.collectorNumber,
    ownedQuantity: ownedByPrintingId.get(p.id) ?? 0,
  }));

  return NextResponse.json(results);
}
