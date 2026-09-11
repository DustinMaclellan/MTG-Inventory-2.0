import "server-only";

import { Condition, Finish, Prisma } from "@prisma/client";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { coerceFinish } from "@/lib/finish";
import { calculatePortfolio } from "@/lib/money";
import { displayFx, scryfallPriceWhere, toDisplayMarket } from "@/lib/pricing";

export type InventoryFilters = {
  q?: string;
  storage?: string;
  condition?: string;
  finish?: string;
};

async function healUnsupportedInventoryFinishes(userId: string) {
  const items = await db.inventoryItem.findMany({
    where: { collection: { userId } },
    select: {
      id: true,
      finish: true,
      cardPrinting: { select: { finishes: true } },
    },
  });
  const groups = new Map<Finish, string[]>();
  for (const item of items) {
    const next = coerceFinish(item.finish, item.cardPrinting.finishes);
    if (next === item.finish) continue;
    const ids = groups.get(next) ?? [];
    ids.push(item.id);
    groups.set(next, ids);
  }
  await Promise.all(
    [...groups].map(([finish, ids]) =>
      db.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { finish } }),
    ),
  );
}

function inventoryWhere(userId: string, filters: InventoryFilters = {}): Prisma.InventoryItemWhereInput {
  const query = filters.q?.trim();
  const storage = filters.storage?.trim();
  const condition = Object.values(Condition).includes(filters.condition as Condition)
    ? (filters.condition as Condition)
    : undefined;
  const finish = Object.values(Finish).includes(filters.finish as Finish)
    ? (filters.finish as Finish)
    : undefined;

  return {
    collection: { userId },
    ...(condition ? { condition } : {}),
    ...(finish ? { finish } : {}),
    ...(storage
      ? {
          storageLocation:
            storage.toLowerCase() === "unassigned"
              ? null
              : { equals: storage, mode: "insensitive" },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { cardPrinting: { name: { contains: query, mode: "insensitive" } } },
            { cardPrinting: { collectorNumber: { contains: query, mode: "insensitive" } } },
            { cardPrinting: { set: { code: { contains: query, mode: "insensitive" } } } },
            { cardPrinting: { set: { name: { contains: query, mode: "insensitive" } } } },
            { storageLocation: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function withDisplayFx<T extends { cardPrinting: { currentPrices: Array<{ market: Prisma.Decimal | null }> } }>(
  items: T[],
  fx: number,
): T[] {
  if (fx === 1) return items;
  return items.map((item) => ({
    ...item,
    cardPrinting: {
      ...item.cardPrinting,
      currentPrices: item.cardPrinting.currentPrices.map((price) => ({
        ...price,
        market: price.market ? price.market.times(fx) : null,
      })),
    },
  }));
}

export async function getInventory(page = 1, pageSize = 25, filters: InventoryFilters = {}) {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const where = inventoryWhere(user.id, filters);
  const fx = await displayFx(user.preferredCurrency);
  const [items, total, storageLocations] = await db.$transaction([
    db.inventoryItem.findMany({
      where,
      include: {
        cardPrinting: {
          include: {
            set: true,
            currentPrices: {
              where: scryfallPriceWhere(user.preferredCurrency),
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.inventoryItem.count({ where }),
    db.inventoryItem.findMany({
      where: {
        collection: { userId: user.id },
        storageLocation: { not: null },
      },
      distinct: ["storageLocation"],
      select: { storageLocation: true },
      orderBy: { storageLocation: "asc" },
    }),
  ]);
  return {
    items: withDisplayFx(items, fx),
    total,
    page,
    pageSize,
    storageLocations: storageLocations
      .map((entry) => entry.storageLocation)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getInventoryLot(id: string) {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const fx = await displayFx(user.preferredCurrency);
  const [item, storageLocations] = await Promise.all([
    db.inventoryItem.findFirst({
      where: { id, collection: { userId: user.id } },
      include: {
        cardPrinting: {
          include: {
            set: true,
            currentPrices: {
              where: scryfallPriceWhere(user.preferredCurrency),
            },
          },
        },
      },
    }),
    db.inventoryItem.findMany({
      where: {
        collection: { userId: user.id },
        storageLocation: { not: null },
      },
      distinct: ["storageLocation"],
      select: { storageLocation: true },
      orderBy: { storageLocation: "asc" },
    }),
  ]);
  if (!item) return null;

  return {
    user,
    item: withDisplayFx([item], fx)[0],
    storageLocations: storageLocations
      .map((entry) => entry.storageLocation)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getStorageOverview() {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const fx = await displayFx(user.preferredCurrency);
  const items = await db.inventoryItem.findMany({
    where: { collection: { userId: user.id } },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: {
            where: scryfallPriceWhere(user.preferredCurrency),
          },
        },
      },
    },
    orderBy: [{ storageLocation: "asc" }, { createdAt: "desc" }],
  });

  const groups = new Map<
    string,
    {
      name: string;
      quantity: number;
      lots: number;
      marketValue: number | null;
      pricedQuantity: number;
      topCards: Array<{
        id: string;
        name: string;
        setCode: string;
        collectorNumber: string;
        quantity: number;
        value: number | null;
        imageSmallUrl: string | null;
      }>;
    }
  >();

  for (const item of items) {
    const key = item.storageLocation?.trim() || "Unassigned";
    const market = toDisplayMarket(
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market,
      fx,
    );
    const value = market === null ? null : market * item.quantity;
    const group = groups.get(key) ?? {
      name: key,
      quantity: 0,
      lots: 0,
      marketValue: null,
      pricedQuantity: 0,
      topCards: [],
    };
    group.quantity += item.quantity;
    group.lots += 1;
    if (value !== null) {
      group.marketValue = (group.marketValue ?? 0) + value;
      group.pricedQuantity += item.quantity;
    }
    group.topCards.push({
      id: item.id,
      name: item.cardPrinting.name,
      setCode: item.cardPrinting.set.code.toUpperCase(),
      collectorNumber: item.cardPrinting.collectorNumber,
      quantity: item.quantity,
      value,
      imageSmallUrl: item.cardPrinting.imageSmallUrl,
    });
    groups.set(key, group);
  }

  const locations = [...groups.values()]
    .map((group) => ({
      ...group,
      topCards: group.topCards
        .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
        .slice(0, 4),
    }))
    .sort((a, b) => {
      if (a.name === "Unassigned") return 1;
      if (b.name === "Unassigned") return -1;
      return (b.marketValue ?? -1) - (a.marketValue ?? -1);
    });

  const named = locations.filter((loc) => loc.name !== "Unassigned");
  const unassigned = locations.find((loc) => loc.name === "Unassigned");

  return {
    user,
    locations,
    summary: {
      locationCount: named.length,
      totalCards: locations.reduce((sum, loc) => sum + loc.quantity, 0),
      totalValue: locations.reduce((sum, loc) => sum + (loc.marketValue ?? 0), 0),
      hasPricedCards: locations.some((loc) => loc.marketValue !== null),
      unassignedCards: unassigned?.quantity ?? 0,
    },
  };
}

export async function getDashboard() {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const fx = await displayFx(user.preferredCurrency);
  const items = await db.inventoryItem.findMany({
    where: { collection: { userId: user.id } },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: {
            where: scryfallPriceWhere(user.preferredCurrency),
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines = items.map((item) => ({
    quantity: item.quantity,
    purchasePrice: item.purchasePrice?.toNumber() ?? null,
    marketPrice: toDisplayMarket(
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market,
      fx,
    ),
  }));
  const totals = calculatePortfolio(lines);
  const uniqueCards = new Set(items.map((item) => item.cardPrinting.cardId)).size;
  const mostValuable = [...items]
    .map((item) => {
      const price = toDisplayMarket(
        item.cardPrinting.currentPrices.find((entry) => entry.finish === item.finish)?.market,
        fx,
      );
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
