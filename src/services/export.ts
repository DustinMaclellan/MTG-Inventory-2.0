import "server-only";

import { Currency } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  isExportFormat,
  serializeExport,
  type ExportFormat,
  type ExportRow,
} from "@/lib/export-formats";
import { usdFx } from "@/lib/fx";
import { toDisplayPaid } from "@/lib/money";
import { displayFx, marketForFinish, scryfallPriceWhere, storedMarketCurrency } from "@/lib/pricing";

export function parseExportFormat(raw: string | null): ExportFormat {
  const value = raw?.trim() || "moxfield";
  if (!isExportFormat(value)) return "moxfield";
  return value;
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

function money(value: number | null) {
  return value == null ? null : String(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function exportInventoryCsv(
  userId: string,
  currency: Currency,
  storage: string,
  format: ExportFormat,
) {
  if (storage.length > 120) return new Response("Invalid storage location.", { status: 400 });
  const fx = await displayFx(currency);
  const storedCurrency = storedMarketCurrency(currency);
  const rates = await usdFx();

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
            where: scryfallPriceWhere(currency),
          },
        },
      },
    },
    orderBy: [{ cardPrinting: { name: "asc" } }, { createdAt: "asc" }],
  });

  const rows: ExportRow[] = items.map((item) => {
    const market = marketForFinish(
      item.finish,
      item.cardPrinting.currentPrices,
      item.cardPrinting.rawPrices,
      storedCurrency,
      fx,
    );
    return {
      name: item.cardPrinting.name,
      setName: item.cardPrinting.set.name,
      setCode: item.cardPrinting.set.code,
      collectorNumber: item.cardPrinting.collectorNumber,
      quantity: item.quantity,
      condition: item.condition,
      finish: item.finish,
      language: item.language,
      purchasePrice: money(
        toDisplayPaid(
          item.purchasePrice?.toNumber() ?? null,
          item.purchaseCurrency,
          currency,
          rates,
        ),
      ),
      marketPrice: money(market),
      currentValue: money(market == null ? null : market * item.quantity),
      storageLocation: item.storageLocation,
      purchaseDate: item.purchaseDate?.toISOString().slice(0, 10) ?? null,
      notes: item.notes,
      scryfallId: item.cardPrinting.scryfallId,
      tcgplayerId: item.cardPrinting.tcgplayerId,
      rarity: item.cardPrinting.rarity,
      commander: false,
      updatedAt: item.updatedAt.toISOString().slice(0, 10),
    };
  });

  const file = serializeExport(format, rows);
  const base = storage ? `mystic-ledger-${slug(storage)}` : "mystic-ledger";
  return fileResponse(`${base}-${format}-${today()}.${file.extension}`, file.body, file.contentType);
}

export async function exportDeckCsv(
  userId: string,
  currency: Currency,
  deckId: string,
  format: ExportFormat,
) {
  if (!z.string().cuid().safeParse(deckId).success) {
    return new Response("Invalid deck.", { status: 400 });
  }
  const fx = await displayFx(currency);
  const storedCurrency = storedMarketCurrency(currency);

  const deck = await db.deck.findFirst({
    where: { id: deckId, userId },
    include: {
      cards: {
        include: {
          card: { select: { name: true } },
          printing: {
            select: {
              collectorNumber: true,
              rarity: true,
              scryfallId: true,
              tcgplayerId: true,
              set: { select: { code: true, name: true } },
              rawPrices: true,
              currentPrices: {
                where: scryfallPriceWhere(currency),
                select: { finish: true, currency: true, market: true },
              },
            },
          },
        },
        orderBy: [{ isCommanderZone: "desc" }, { card: { name: "asc" } }],
      },
    },
  });

  if (!deck) return new Response("Deck not found.", { status: 404 });

  const rows: ExportRow[] = deck.cards.map((entry) => {
    const market = entry.printing
      ? marketForFinish(
          entry.finish,
          entry.printing.currentPrices,
          entry.printing.rawPrices,
          storedCurrency,
          fx,
        )
      : null;
    return {
      name: entry.card.name,
      setName: entry.printing?.set.name ?? "",
      setCode: entry.printing?.set.code ?? "",
      collectorNumber: entry.printing?.collectorNumber ?? "",
      quantity: entry.quantity,
      condition: null,
      finish: entry.finish,
      language: "en",
      purchasePrice: null,
      marketPrice: money(market),
      currentValue: money(market == null ? null : market * entry.quantity),
      storageLocation: null,
      purchaseDate: null,
      notes: null,
      scryfallId: entry.printing?.scryfallId ?? null,
      tcgplayerId: entry.printing?.tcgplayerId ?? null,
      rarity: entry.printing?.rarity ?? null,
      commander: entry.isCommanderZone,
      updatedAt: null,
    };
  });

  const file = serializeExport(format, rows);
  return fileResponse(
    `mystic-ledger-deck-${slug(deck.name)}-${format}-${today()}.${file.extension}`,
    file.body,
    file.contentType,
  );
}

function fileResponse(filename: string, body: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
