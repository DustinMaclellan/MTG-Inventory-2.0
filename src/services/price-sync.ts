import { db } from "@/lib/db";
import { scryfall } from "@/services/scryfall";

export async function refreshOwnedPrices() {
  const printings = await db.cardPrinting.findMany({
    where: { inventoryItems: { some: {} } },
    select: { scryfallId: true },
  });
  const ids = [...new Set(printings.map((printing) => printing.scryfallId))];
  if (ids.length === 0) return { printings: 0, synchronized: 0 };

  const cards = await scryfall.getPrintingsByIds(ids);
  const synchronized = await scryfall.synchronizePrintings(cards);
  return { printings: ids.length, synchronized };
}
