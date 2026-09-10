import { Currency, Finish, PriceProvider as ProviderName } from "@prisma/client";
import { db } from "@/lib/db";
import type { CardDataProvider, CardPrice, PriceProvider } from "./providers";

const SCRYFALL_API = "https://api.scryfall.com";

export type ScryfallCard = {
  id: string;
  oracle_id?: string;
  name: string;
  set_id: string;
  set: string;
  set_name: string;
  set_type?: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  lang: string;
  released_at?: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  color_identity?: string[];
  digital: boolean;
  promo: boolean;
  finishes: string[];
  image_uris?: { small?: string; normal?: string };
  card_faces?: Array<{ image_uris?: { small?: string; normal?: string } }>;
  prices: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    eur_foil?: string | null;
  };
  tcgplayer_id?: number;
  cardmarket_id?: number;
};

type ScryfallList = { data: ScryfallCard[]; has_more: boolean; next_page?: string };

function image(card: ScryfallCard, size: "small" | "normal") {
  return card.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size] ?? null;
}

function finishes(values: string[]): Finish[] {
  return values.flatMap((value) => {
    if (value === "nonfoil") return [Finish.NONFOIL];
    if (value === "foil") return [Finish.FOIL];
    if (value === "etched") return [Finish.ETCHED];
    return [];
  });
}

function decimal(value: string | null | undefined) {
  return value ? Number(value) : null;
}

const SCRYFALL_HEADERS = {
  "User-Agent": "MysticLedger/1.0 (collection manager)",
  Accept: "application/json",
};

async function scryfallFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: SCRYFALL_HEADERS,
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Scryfall request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ScryfallProvider
  implements CardDataProvider<ScryfallCard>, PriceProvider
{
  async getPrinting(setCode: string, collectorNumber: string, language = "en") {
    return scryfallFetch<ScryfallCard>(
      `${SCRYFALL_API}/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(collectorNumber)}/${encodeURIComponent(language)}`,
    );
  }

  async searchPrintings(query: string) {
    const cards: ScryfallCard[] = [];
    let nextUrl: string | undefined =
      `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`;
    while (nextUrl) {
      const page: ScryfallList = await scryfallFetch<ScryfallList>(nextUrl);
      cards.push(...page.data);
      nextUrl = page.has_more && page.next_page ? page.next_page : undefined;
      if (nextUrl) await pause(100);
    }
    return cards.filter((card) => card.oracle_id && !card.digital);
  }

  async getPrintingsByIds(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    const cards: ScryfallCard[] = [];

    for (let index = 0; index < unique.length; index += 75) {
      const chunk = unique.slice(index, index + 75);
      const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
        method: "POST",
        headers: { ...SCRYFALL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk.map((id) => ({ id })) }),
      });
      if (!response.ok) {
        throw new Error(`Scryfall collection request failed (${response.status})`);
      }
      const result = (await response.json()) as { data: ScryfallCard[] };
      cards.push(...result.data.filter((card) => card.oracle_id && !card.digital));
      if (index + 75 < unique.length) await pause(100);
    }

    return cards;
  }

  async synchronizePrintings(cards: ScryfallCard[]) {
    let count = 0;
    for (const card of cards) {
      if (!card.oracle_id || card.digital) continue;

      const set = await db.mtgSet.upsert({
        where: { scryfallId: card.set_id },
        update: { code: card.set, name: card.set_name, setType: card.set_type },
        create: {
          scryfallId: card.set_id,
          code: card.set,
          name: card.set_name,
          setType: card.set_type,
        },
      });
      const concept = await db.card.upsert({
        where: { oracleId: card.oracle_id },
        update: {
          name: card.name,
          normalizedName: card.name.toLocaleLowerCase(),
          typeLine: card.type_line,
          oracleText: card.oracle_text,
          manaCost: card.mana_cost,
          colorIdentity: card.color_identity ?? [],
        },
        create: {
          oracleId: card.oracle_id,
          name: card.name,
          normalizedName: card.name.toLocaleLowerCase(),
          typeLine: card.type_line,
          oracleText: card.oracle_text,
          manaCost: card.mana_cost,
          colorIdentity: card.color_identity ?? [],
        },
      });
      const printing = await db.cardPrinting.upsert({
        where: { scryfallId: card.id },
        update: {
          name: card.name,
          rarity: card.rarity,
          artist: card.artist,
          imageSmallUrl: image(card, "small"),
          imageNormalUrl: image(card, "normal"),
          finishes: finishes(card.finishes),
          rawPrices: card.prices,
          pricesUpdatedAt: new Date(),
        },
        create: {
          scryfallId: card.id,
          cardId: concept.id,
          setId: set.id,
          collectorNumber: card.collector_number,
          name: card.name,
          rarity: card.rarity,
          artist: card.artist,
          language: card.lang,
          releasedAt: card.released_at ? new Date(card.released_at) : null,
          imageSmallUrl: image(card, "small"),
          imageNormalUrl: image(card, "normal"),
          finishes: finishes(card.finishes),
          promo: card.promo,
          digital: card.digital,
          tcgplayerId: card.tcgplayer_id,
          cardmarketId: card.cardmarket_id,
          rawPrices: card.prices,
          pricesUpdatedAt: new Date(),
        },
      });
      await this.persistPrices(printing.id, card);
      count += 1;
    }
    return count;
  }

  async getPrices(printingIds: string[]): Promise<CardPrice[]> {
    const prices = await db.currentPrice.findMany({
      where: { cardPrintingId: { in: printingIds }, provider: ProviderName.SCRYFALL },
    });
    return prices.map((price) => ({
      ...price,
      market: price.market?.toNumber() ?? null,
      low: price.low?.toNumber() ?? null,
      mid: price.mid?.toNumber() ?? null,
      high: price.high?.toNumber() ?? null,
    }));
  }

  private async persistPrices(cardPrintingId: string, card: ScryfallCard) {
    const candidates = [
      [Finish.NONFOIL, Currency.USD, decimal(card.prices.usd)],
      [Finish.FOIL, Currency.USD, decimal(card.prices.usd_foil)],
      [Finish.ETCHED, Currency.USD, decimal(card.prices.usd_etched)],
      [Finish.NONFOIL, Currency.EUR, decimal(card.prices.eur)],
      [Finish.FOIL, Currency.EUR, decimal(card.prices.eur_foil)],
    ] as const;
    const retrievedAt = new Date();
    const snapshotDate = new Date(
      Date.UTC(retrievedAt.getUTCFullYear(), retrievedAt.getUTCMonth(), retrievedAt.getUTCDate()),
    );

    for (const [finish, currency, market] of candidates) {
      if (market === null) continue;
      const key = { cardPrintingId, provider: ProviderName.SCRYFALL, finish, currency };
      await db.currentPrice.upsert({
        where: { cardPrintingId_provider_finish_currency: key },
        update: { market, retrievedAt },
        create: { ...key, market, retrievedAt },
      });
      await db.priceHistory.upsert({
        where: {
          cardPrintingId_provider_finish_currency_snapshotDate: { ...key, snapshotDate },
        },
        update: { market, retrievedAt },
        create: { ...key, market, retrievedAt, snapshotDate },
      });
    }
  }
}

export const scryfall = new ScryfallProvider();
