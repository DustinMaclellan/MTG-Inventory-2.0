import "server-only";

import { PriceProvider } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePortfolio } from "@/lib/money";

export async function getInventory(page = 1, pageSize = 25) {
  const user = await requireUser();
  const where = { collection: { userId: user.id } };
  const [items, total] = await db.$transaction([
    db.inventoryItem.findMany({
      where,
      include: {
        cardPrinting: {
          include: {
            set: true,
            currentPrices: {
              where: { provider: PriceProvider.SCRYFALL, currency: user.preferredCurrency },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.inventoryItem.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getDashboard() {
  const user = await requireUser();
  const items = await db.inventoryItem.findMany({
    where: { collection: { userId: user.id } },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: {
            where: { provider: PriceProvider.SCRYFALL, currency: user.preferredCurrency },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines = items.map((item) => ({
    quantity: item.quantity,
    purchasePrice: item.purchasePrice?.toNumber() ?? null,
    marketPrice:
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market?.toNumber() ??
      null,
  }));
  const totals = calculatePortfolio(lines);
  const uniqueCards = new Set(items.map((item) => item.cardPrinting.cardId)).size;
  const mostValuable = [...items]
    .map((item) => {
      const price =
        item.cardPrinting.currentPrices.find((entry) => entry.finish === item.finish)?.market?.toNumber() ??
        null;
      return { item, price, value: price === null ? null : price * item.quantity };
    })
    .filter((entry) => entry.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];

  return {
    user,
    items,
    totals,
    uniqueCards,
    mostValuable,
    lastPriceUpdate: items
      .flatMap((item) => item.cardPrinting.currentPrices)
      .sort((a, b) => b.retrievedAt.getTime() - a.retrievedAt.getTime())[0]?.retrievedAt,
  };
}
