import { Currency, Finish } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasEntitlement } from "@/lib/entitlements";

function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "export"
  );
}

function csvResponse(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map(cell).join(",")),
  ].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const today = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasEntitlement(user)) return new Response("Payment required", { status: 402 });

  const url = new URL(request.url);
  const storage = url.searchParams.get("storage")?.trim() ?? "";
  const deckId = url.searchParams.get("deck")?.trim() ?? "";
  if (storage && deckId) {
    return new Response("Export a binder or a deck, not both.", { status: 400 });
  }

  if (deckId) return exportDeck(user.id, user.preferredCurrency, deckId);
  return exportInventory(user.id, user.preferredCurrency, storage);
}

async function exportInventory(userId: string, currency: Currency, storage: string) {
  if (storage.length > 120) return new Response("Invalid storage location.", { status: 400 });

  const items = await db.inventoryItem.findMany({
    where: {
      collection: { userId },
      ...(storage
        ? {
            storageLocation:
              storage.toLowerCase() === "unassigned"
                ? null
                : { equals: storage, mode: "insensitive" as const },
          }
        : {}),
    },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: {
            where: { provider: "SCRYFALL", currency },
          },
        },
      },
    },
    orderBy: [{ cardPrinting: { name: "asc" } }, { createdAt: "asc" }],
  });

  const headers = [
    "card_name", "set_name", "set_code", "collector_number", "quantity",
    "condition", "finish", "language", "purchase_price", "market_price",
    "current_value", "storage_location", "purchase_date",
  ];
  const rows = items.map((item) => {
    const market = item.cardPrinting.currentPrices.find((price) => price.finish === item.finish)?.market?.toString();
    return [
      item.cardPrinting.name, item.cardPrinting.set.name, item.cardPrinting.set.code,
      item.cardPrinting.collectorNumber, item.quantity, item.condition, item.finish,
      item.language, item.purchasePrice?.toString(), market,
      market ? Number(market) * item.quantity : undefined, item.storageLocation,
      item.purchaseDate?.toISOString().slice(0, 10),
    ];
  });

  const filename = storage
    ? `mystic-ledger-${slug(storage)}-${today()}.csv`
    : `mystic-ledger-${today()}.csv`;
  return csvResponse(filename, headers, rows);
}

async function exportDeck(userId: string, currency: Currency, deckId: string) {
  if (!z.string().cuid().safeParse(deckId).success) {
    return new Response("Invalid deck.", { status: 400 });
  }

  const deck = await db.deck.findFirst({
    where: { id: deckId, userId },
    include: {
      cards: {
        include: {
          card: { select: { name: true } },
          printing: {
            select: {
              collectorNumber: true,
              set: { select: { code: true, name: true } },
              currentPrices: {
                where: { provider: "SCRYFALL", currency },
                select: { finish: true, market: true },
              },
            },
          },
        },
        orderBy: [{ isCommanderZone: "desc" }, { card: { name: "asc" } }],
      },
    },
  });

  if (!deck) return new Response("Deck not found.", { status: 404 });

  const headers = [
    "card_name", "set_name", "set_code", "collector_number", "quantity",
    "commander", "market_price",
  ];
  const rows = deck.cards.map((entry) => {
    const prices = entry.printing?.currentPrices ?? [];
    const market = (prices.find((p) => p.finish === Finish.NONFOIL) ?? prices[0])?.market?.toString();
    return [
      entry.card.name,
      entry.printing?.set.name,
      entry.printing?.set.code,
      entry.printing?.collectorNumber,
      entry.quantity,
      entry.isCommanderZone ? "true" : "false",
      market,
    ];
  });

  return csvResponse(`mystic-ledger-deck-${slug(deck.name)}-${today()}.csv`, headers, rows);
}
