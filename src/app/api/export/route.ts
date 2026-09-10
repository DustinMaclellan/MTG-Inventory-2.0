import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasEntitlement } from "@/lib/entitlements";

function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasEntitlement(user)) return new Response("Payment required", { status: 402 });
  const items = await db.inventoryItem.findMany({
    where: { collection: { userId: user.id } },
    include: {
      cardPrinting: {
        include: {
          set: true,
          currentPrices: {
            where: { provider: "SCRYFALL", currency: user.preferredCurrency },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
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
    ].map(cell).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mystic-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
