import "server-only";

import { Condition, Currency, Finish, Prisma } from "@prisma/client";
import { requireEntitlement } from "@/lib/auth";
import {
  type InventorySort,
  type InventorySortDir,
} from "@/lib/collection-sort";
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

function inventoryOrderBy(
  sort: InventorySort,
  dir: InventorySortDir,
): Prisma.InventoryItemOrderByWithRelationInput[] {
  if (sort === "name") {
    return [
      { cardPrinting: { name: dir } },
      { cardPrinting: { set: { name: "asc" } } },
      { id: "asc" },
    ];
  }
  if (sort === "set") {
    return [
      { cardPrinting: { set: { name: dir } } },
      { cardPrinting: { collectorNumber: "asc" } },
      { cardPrinting: { name: "asc" } },
      { id: "asc" },
    ];
  }
  return [{ createdAt: dir }, { id: dir }];
}

function lotValue(item: {
  quantity: number;
  cardPrinting: { currentPrices: Array<{ market: Prisma.Decimal | number | null }> };
}) {
  const market = numericMarket(item.cardPrinting.currentPrices[0]?.market);
  return market == null ? null : market * item.quantity;
}

function compareLotValue(
  a: { id: string; quantity: number; cardPrinting: { currentPrices: Array<{ market: Prisma.Decimal | number | null }> } },
  b: { id: string; quantity: number; cardPrinting: { currentPrices: Array<{ market: Prisma.Decimal | number | null }> } },
  dir: InventorySortDir,
) {
  const av = lotValue(a);
  const bv = lotValue(b);
  if (av == null && bv == null) return a.id.localeCompare(b.id);
  if (av == null) return 1;
  if (bv == null) return -1;
  if (av !== bv) return dir === "asc" ? av - bv : bv - av;
  return a.id.localeCompare(b.id);
}

async function storageLocationNames(userId: string) {
  const storageLocations = await db.inventoryItem.findMany({
    where: {
      collection: { userId },
      storageLocation: { not: null },
    },
    distinct: ["storageLocation"],
    select: { storageLocation: true },
    orderBy: { storageLocation: "asc" },
  });
  return storageLocations
    .map((entry) => entry.storageLocation)
    .filter((value): value is string => Boolean(value));
}

async function inventoryIdsByValue(
  userId: string,
  where: Prisma.InventoryItemWhereInput,
  preferredCurrency: Currency,
  dir: InventorySortDir,
) {
  const fx = await displayFx(preferredCurrency);
  const storedCurrency = storedMarketCurrency(preferredCurrency);
  const slim = await db.inventoryItem.findMany({
    where,
    select: {
      id: true,
      quantity: true,
      finish: true,
      cardPrinting: {
        select: {
          rawPrices: true,
          currentPrices: { where: scryfallPriceWhere(preferredCurrency) },
        },
      },
    },
  });
  return withLotMarkets(slim, storedCurrency, fx)
    .sort((a, b) => compareLotValue(a, b, dir))
    .map((row) => row.id);
}

async function fetchInventoryPage(ids: string[], preferredCurrency: Currency) {
  if (ids.length === 0) return [];
  const items = await db.inventoryItem.findMany({
    where: { id: { in: ids } },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: { where: scryfallPriceWhere(preferredCurrency) },
        },
      },
    },
  });
  const order = new Map(ids.map((id, index) => [id, index]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getInventory(
  page = 1,
  pageSize = 25,
  filters: InventoryFilters = {},
  sort: InventorySort = "added",
  dir: InventorySortDir = "desc",
) {
  const user = await requireEntitlement();
  await healUnsupportedInventoryFinishes(user.id);
  const where = inventoryWhere(user.id, filters);
  const fx = await displayFx(user.preferredCurrency);
  const storedCurrency = storedMarketCurrency(user.preferredCurrency);

  if (sort === "value") {
    const [ids, storageLocations] = await Promise.all([
      inventoryIdsByValue(user.id, where, user.preferredCurrency, dir),
      storageLocationNames(user.id),
    ]);
    const pageIds = ids.slice((page - 1) * pageSize, page * pageSize);
    const items = await fetchInventoryPage(pageIds, user.preferredCurrency);
    return {
      items: withLotMarkets(items, storedCurrency, fx),
      total: ids.length,
      page,
      pageSize,
      storageLocations,
    };
  }

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
      orderBy: inventoryOrderBy(sort, dir),
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

export async function getInventoryLotPage(
  lotId: string,
  pageSize = 25,
  filters: InventoryFilters = {},
  sort: InventorySort = "added",
  dir: InventorySortDir = "desc",
) {
  const user = await requireEntitlement();
  const lot = await db.inventoryItem.findFirst({
    where: { id: lotId, collection: { userId: user.id } },
    select: { id: true },
  });
  if (!lot) return null;

  const where = inventoryWhere(user.id, filters);
  const inView = await db.inventoryItem.count({ where: { ...where, id: lotId } });
  if (!inView) return null;

  if (sort === "value") {
    const ids = await inventoryIdsByValue(user.id, where, user.preferredCurrency, dir);
    const index = ids.indexOf(lotId);
    if (index < 0) return null;
    return Math.floor(index / pageSize) + 1;
  }

  if (sort === "added") {
    const created = await db.inventoryItem.findFirst({
      where: { id: lotId },
      select: { createdAt: true },
    });
    if (!created) return null;
    const ahead = await db.inventoryItem.count({
      where: {
        ...where,
        OR:
          dir === "desc"
            ? [
                { createdAt: { gt: created.createdAt } },
                { createdAt: created.createdAt, id: { gt: lotId } },
              ]
            : [
                { createdAt: { lt: created.createdAt } },
                { createdAt: created.createdAt, id: { lt: lotId } },
              ],
      },
    });
    return Math.floor(ahead / pageSize) + 1;
  }

  const rows = await db.inventoryItem.findMany({
    where,
    select: { id: true },
    orderBy: inventoryOrderBy(sort, dir),
  });
  const index = rows.findIndex((row) => row.id === lotId);
  if (index < 0) return null;
  return Math.floor(index / pageSize) + 1;
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
