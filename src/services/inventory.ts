import "server-only";

import { Condition, Finish, PriceProvider, type Prisma } from "@prisma/client";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculatePortfolio } from "@/lib/money";

export type InventoryFilters = {
  q?: string;
  storage?: string;
  condition?: string;
  finish?: string;
};

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

export async function getInventory(page = 1, pageSize = 25, filters: InventoryFilters = {}) {
  const user = await requireEntitlement();
  const where = inventoryWhere(user.id, filters);
  const [items, total, storageLocations] = await db.$transaction([
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
    items,
    total,
    page,
    pageSize,
    storageLocations: storageLocations
      .map((entry) => entry.storageLocation)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getStorageOverview() {
  const user = await requireEntitlement();
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
      }>;
    }
  >();

  for (const item of items) {
    const key = item.storageLocation?.trim() || "Unassigned";
    const market =
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market?.toNumber() ??
      null;
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
    });
    groups.set(key, group);
  }

  return {
    user,
    locations: [...groups.values()]
      .map((group) => ({
        ...group,
        topCards: group.topCards
          .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
          .slice(0, 4),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getDashboard() {
  const user = await requireEntitlement();
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
