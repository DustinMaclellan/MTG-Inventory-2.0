import type { Currency, Finish, PriceProvider as ProviderName } from "@prisma/client";

export type CardPrice = {
  cardPrintingId: string;
  provider: ProviderName;
  currency: Currency;
  finish: Finish;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  retrievedAt: Date;
};

export interface PriceProvider {
  getPrices(printingIds: string[]): Promise<CardPrice[]>;
}

export interface CardDataProvider<TCard> {
  searchPrintings(query: string): Promise<TCard[]>;
  synchronizePrintings(cards: TCard[]): Promise<number>;
}
