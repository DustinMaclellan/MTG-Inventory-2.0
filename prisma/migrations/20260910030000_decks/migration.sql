-- Deck builder: deck lists and per-deck card slots.

CREATE TABLE "Deck" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "format"    TEXT,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeckCard" (
    "id"              TEXT         NOT NULL,
    "deckId"          TEXT         NOT NULL,
    "cardId"          TEXT         NOT NULL,
    "quantity"        INTEGER      NOT NULL DEFAULT 1,
    "isCommanderZone" BOOLEAN      NOT NULL DEFAULT false,
    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deck_userId_idx"     ON "Deck"("userId");
CREATE INDEX "DeckCard_deckId_idx" ON "DeckCard"("deckId");
CREATE INDEX "DeckCard_cardId_idx" ON "DeckCard"("cardId");
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_key" ON "DeckCard"("deckId", "cardId");

ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey"
    FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
