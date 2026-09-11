-- Allow the same printing + finish as commander (1) and mainboard (remaining copies).

DROP INDEX IF EXISTS "DeckCard_deckId_cardPrintingId_finish_key";

CREATE UNIQUE INDEX "DeckCard_deckId_cardPrintingId_finish_isCommanderZone_key"
  ON "DeckCard"("deckId", "cardPrintingId", "finish", "isCommanderZone");
