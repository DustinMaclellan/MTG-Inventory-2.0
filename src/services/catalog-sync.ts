import { scryfall, type ScryfallCard } from "./scryfall";

type Page = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
};

export async function syncCatalog(maxPages = Number(process.env.SCRYFALL_SYNC_PAGES ?? "10")) {
  let url =
    "https://api.scryfall.com/cards/search?q=game%3Apaper&unique=prints&order=released&dir=desc";
  let page = 0;
  let synchronized = 0;

  while (url && page < maxPages) {
    const response = await fetch(url, {
      headers: { "User-Agent": "MysticLedger/1.0 (catalog sync)" },
    });
    if (!response.ok) throw new Error(`Scryfall sync failed (${response.status})`);
    const result = (await response.json()) as Page;
    synchronized += await scryfall.synchronizePrintings(result.data);
    page += 1;
    url = result.has_more && result.next_page ? result.next_page : "";
    if (url) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { pages: page, synchronized };
}
