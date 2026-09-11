import "server-only";

import { Condition, Currency, Finish, Prisma } from "@prisma/client";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { coerceFinish } from "@/lib/finish";
import { usdFx } from "@/lib/fx";
import { calculatePortfolio, toDisplayPaid } from "@/lib/money";
import { displayFx, marketForFinish, scryfallPriceWhere, storedMarketCurrency } from "@/lib/pricing";

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

function numericMarket(market: Prisma.Decimal | number | null | undefined) {
  if (market == null) return null;
  return typeof market === "number" ? market : market.toNumber();
}

function withLotMarkets<
  T extends {
    finish: Finish;
    cardPrinting: {
      rawPrices: Prisma.JsonValue;
      currentPrices: Array<{
        finish: Finish;
        currency: Currency;
        market: Prisma.Decimal | number | null;
      }>;
    };
  },
>(items: T[], storedCurrency: Currency, fx: number): T[] {
  return items.map((item) => {
    const market = marketForFinish(
      item.finish,
      item.cardPrinting.currentPrices,
      item.cardPrinting.rawPrices,
      storedCurrency,
      fx,
    );
    return {
      ...item,
      cardPrinting: {
        ...item.cardPrinting,
        currentPrices: [{ finish: item.finish, currency: storedCurrency, market }],
      },
    };
  });
}

export async function getInventory(page = 1, pageSize = 25, filters: InventoryFilters = {}) {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const where = inventoryWhere(user.id, filters);
  const fx = await displayFx(user.preferredCurrency);
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    items: withLotMarkets(items, storedCurrency, fx),
    total,
    page,
    pageSize,
    storageLocations: storageLocations
      .map((entry) => entry.storageLocation)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getInventoryLotPage(lotId: string, pageSize = 25, filters: InventoryFilters = {}) {
  const user = await requireEntitlement();
  const lot = await db.inventoryItem.findFirst({
    where: { id: lotId, collection: { userId: user.id } },
    select: { id: true, createdAt: true },
  });
  if (!lot) return null;

  const where = inventoryWhere(user.id, filters);
  const inView = await db.inventoryItem.count({ where: { ...where, id: lotId } });
  if (!inView) return null;

  const ahead = await db.inventoryItem.count({
    where: {
      ...where,
      OR: [
        { createdAt: { gt: lot.createdAt } },
        { createdAt: lot.createdAt, id: { gt: lot.id } },
      ],
    },
  });
  return Math.floor(ahead / pageSize) + 1;
}

export async function getInventoryLot(id: string) {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const fx = await displayFx(user.preferredCurrency);
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);
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
    item: withLotMarkets([item], storedCurrency, fx)[0],
    storageLocations: storageLocations
      .map((entry) => entry.storageLocation)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getStorageOverview() {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const fx = await displayFx(user.preferredCurrency);
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);
  const storedItems = await db.inventoryItem.findMany({
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
  const items = withLotMarkets(storedItems, storedCurrency, fx);

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
    const market = numericMarket(
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market,
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
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);
  const pricedItems = await db.inventoryItem.findMany({
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
  const lastPriceUpdate = pricedItems
    .flatMap((item) => item.cardPrinting.currentPrices)
    .sort((a, b) => b.retrievedAt.getTime() - a.retrievedAt.getTime())[0]?.retrievedAt;
  const items = withLotMarkets(pricedItems, storedCurrency, fx);
  const rates = await usdFx();

  const lines = items.map((item) => ({
    quantity: item.quantity,
    purchasePrice: toDisplayPaid(
      item.purchasePrice?.toNumber() ?? null,
      item.purchaseCurrency,
      user.preferredCurrency,
      rates,
    ),
    marketPrice: numericMarket(
      item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market,
    ),
  }));
  const totals = calculatePortfolio(lines);
  const uniqueCards = new Set(items.map((item) => item.cardPrinting.cardId)).size;
  const largestPositions = [...items]
    .map((item) => {
      const price = numericMarket(
        item.cardPrinting.currentPrices.find((entry) => entry.finish === item.finish)?.market,
      );
      return { item, price, value: price === null ? null : price * item.quantity };
    })
    .filter((entry): entry is typeof entry & { value: number } => entry.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return {
    user,
    items,
    totals,
    uniqueCards,
    largestPositions,
    lastPriceUpdate,
  };
}
