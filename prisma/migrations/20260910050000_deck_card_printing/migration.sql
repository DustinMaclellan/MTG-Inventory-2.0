-- Add cardPrintingId to DeckCard so each deck entry tracks a specific printing.
-- Existing rows are populated with the card's most recent printing.

-- 1. Add nullable column
ALTER TABLE "DeckCard" ADD COLUMN "cardPrintingId" TEXT;

-- 2. Backfill: assign most-recently-released printing for each existing row
UPDATE "DeckCard" dc
SET "cardPrintingId" = (
  SELECT cp.id
  FROM "CardPrinting" cp
  WHERE cp."cardId" = dc."cardId"
  ORDER BY cp."releasedAt" DESC NULLS LAST
  LIMIT 1
);

-- 3. Add FK
ALTER TABLE "DeckCard"
  ADD CONSTRAINT "DeckCard_cardPrintingId_fkey"
  FOREIGN KEY ("cardPrintingId") REFERENCES "CardPrinting"(id) ON DELETE SET NULL;

-- 4. Drop old oracle-card unique constraint
DROP INDEX IF EXISTS "DeckCard_deckId_cardId_key";

-- 5. New unique constraint: one entry per (deck, printing)
--    NULL values are not considered equal in Postgres, so old unresolvable
--    rows won't conflict with each other.
CREATE UNIQUE INDEX "DeckCard_deckId_cardPrintingId_key"
  ON "DeckCard"("deckId", "cardPrintingId");

-- 6. Index on cardPrintingId for FK lookups
CREATE INDEX "DeckCard_cardPrintingId_idx" ON "DeckCard"("cardPrintingId");
