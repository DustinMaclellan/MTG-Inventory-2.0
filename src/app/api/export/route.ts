import { getCurrentUser } from "@/lib/auth";
import { hasEntitlement } from "@/lib/entitlements";
import { exportDeckCsv, exportInventoryCsv, parseExportFormat } from "@/services/export";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasEntitlement(user)) return new Response("Payment required", { status: 402 });

  const url = new URL(request.url);
  const storage = url.searchParams.get("storage")?.trim() ?? "";
  const deckId = url.searchParams.get("deck")?.trim() ?? "";
  const format = parseExportFormat(url.searchParams.get("format"));
  if (storage && deckId) {
    return new Response("Export a binder or a deck, not both.", { status: 400 });
  }

  if (deckId) return exportDeckCsv(user.id, user.preferredCurrency, deckId, format);
  return exportInventoryCsv(user.id, user.preferredCurrency, storage, format);
}
