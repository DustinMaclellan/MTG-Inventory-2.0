-- Track foil / non-foil / etched on each deck card, and match ownership by finish.

ALTER TABLE "DeckCard" ADD COLUMN "finish" "Finish" NOT NULL DEFAULT 'NONFOIL';

-- Prefer a finish the printing actually comes in (foil-only cards should not stay NONFOIL).
UPDATE "DeckCard" dc
SET "finish" = COALESCE(
  (
    SELECT CASE
      WHEN 'NONFOIL'::"Finish" = ANY (cp.finishes) THEN 'NONFOIL'::"Finish"
      WHEN 'FOIL'::"Finish" = ANY (cp.finishes) THEN 'FOIL'::"Finish"
      WHEN 'ETCHED'::"Finish" = ANY (cp.finishes) THEN 'ETCHED'::"Finish"
      ELSE 'NONFOIL'::"Finish"
    END
    FROM "CardPrinting" cp
    WHERE cp.id = dc."cardPrintingId"
  ),
  'NONFOIL'::"Finish"
);

DROP INDEX IF EXISTS "DeckCard_deckId_cardPrintingId_key";

CREATE UNIQUE INDEX "DeckCard_deckId_cardPrintingId_finish_key"
  ON "DeckCard"("deckId", "cardPrintingId", "finish");
