CREATE TYPE "Condition" AS ENUM ('NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED');
CREATE TYPE "Finish" AS ENUM ('NONFOIL', 'FOIL', 'ETCHED');
CREATE TYPE "PriceProvider" AS ENUM ('SCRYFALL', 'TCGPLAYER', 'CARDMARKET');
CREATE TYPE "Currency" AS ENUM ('USD', 'CAD', 'EUR');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "preferredCurrency" "Currency" NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Card" (
  "id" TEXT NOT NULL, "oracleId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL, "typeLine" TEXT, "oracleText" TEXT, "manaCost" TEXT,
  "colorIdentity" TEXT[], "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MtgSet" (
  "id" TEXT NOT NULL, "scryfallId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "setType" TEXT, "releasedAt" TIMESTAMP(3), "iconSvgUri" TEXT,
  CONSTRAINT "MtgSet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CardPrinting" (
  "id" TEXT NOT NULL, "scryfallId" TEXT NOT NULL, "cardId" TEXT NOT NULL, "setId" TEXT NOT NULL,
  "collectorNumber" TEXT NOT NULL, "name" TEXT NOT NULL, "rarity" TEXT NOT NULL, "artist" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en', "releasedAt" TIMESTAMP(3), "imageSmallUrl" TEXT,
  "imageNormalUrl" TEXT, "finishes" "Finish"[], "promo" BOOLEAN NOT NULL DEFAULT false,
  "digital" BOOLEAN NOT NULL DEFAULT false, "tcgplayerId" INTEGER, "cardmarketId" INTEGER,
  "rawPrices" JSONB, "pricesUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardPrinting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Collection" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL DEFAULT 'My Collection',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL, "collectionId" TEXT NOT NULL, "cardPrintingId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "condition" "Condition" NOT NULL DEFAULT 'NEAR_MINT',
  "finish" "Finish" NOT NULL DEFAULT 'NONFOIL', "language" TEXT NOT NULL DEFAULT 'en',
  "purchasePrice" DECIMAL(12,2), "purchaseCurrency" "Currency" NOT NULL DEFAULT 'USD',
  "purchaseDate" TIMESTAMP(3), "purchaseSource" TEXT, "storageLocation" TEXT, "notes" TEXT,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CurrentPrice" (
  "id" TEXT NOT NULL, "cardPrintingId" TEXT NOT NULL, "provider" "PriceProvider" NOT NULL,
  "finish" "Finish" NOT NULL, "currency" "Currency" NOT NULL, "market" DECIMAL(12,2),
  "low" DECIMAL(12,2), "mid" DECIMAL(12,2), "high" DECIMAL(12,2),
  "retrievedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CurrentPrice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PriceHistory" (
  "id" TEXT NOT NULL, "cardPrintingId" TEXT NOT NULL, "provider" "PriceProvider" NOT NULL,
  "finish" "Finish" NOT NULL, "currency" "Currency" NOT NULL, "market" DECIMAL(12,2),
  "snapshotDate" DATE NOT NULL, "retrievedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "Card_oracleId_key" ON "Card"("oracleId");
CREATE INDEX "Card_normalizedName_idx" ON "Card"("normalizedName");
CREATE INDEX "Card_name_idx" ON "Card"("name");
CREATE UNIQUE INDEX "MtgSet_scryfallId_key" ON "MtgSet"("scryfallId");
CREATE UNIQUE INDEX "MtgSet_code_key" ON "MtgSet"("code");
CREATE INDEX "MtgSet_name_idx" ON "MtgSet"("name");
CREATE UNIQUE INDEX "CardPrinting_scryfallId_key" ON "CardPrinting"("scryfallId");
CREATE INDEX "CardPrinting_cardId_idx" ON "CardPrinting"("cardId");
CREATE INDEX "CardPrinting_setId_collectorNumber_idx" ON "CardPrinting"("setId", "collectorNumber");
CREATE INDEX "CardPrinting_name_idx" ON "CardPrinting"("name");
CREATE UNIQUE INDEX "CardPrinting_setId_collectorNumber_language_key" ON "CardPrinting"("setId", "collectorNumber", "language");
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "Collection"("userId", "name");
CREATE INDEX "InventoryItem_collectionId_createdAt_idx" ON "InventoryItem"("collectionId", "createdAt");
CREATE INDEX "InventoryItem_collectionId_cardPrintingId_idx" ON "InventoryItem"("collectionId", "cardPrintingId");
CREATE INDEX "InventoryItem_cardPrintingId_idx" ON "InventoryItem"("cardPrintingId");
CREATE INDEX "CurrentPrice_cardPrintingId_retrievedAt_idx" ON "CurrentPrice"("cardPrintingId", "retrievedAt");
CREATE UNIQUE INDEX "CurrentPrice_cardPrintingId_provider_finish_currency_key" ON "CurrentPrice"("cardPrintingId", "provider", "finish", "currency");
CREATE INDEX "PriceHistory_cardPrintingId_snapshotDate_idx" ON "PriceHistory"("cardPrintingId", "snapshotDate");
CREATE UNIQUE INDEX "PriceHistory_cardPrintingId_provider_finish_currency_snapsh_key" ON "PriceHistory"("cardPrintingId", "provider", "finish", "currency", "snapshotDate");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardPrinting" ADD CONSTRAINT "CardPrinting_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardPrinting" ADD CONSTRAINT "CardPrinting_setId_fkey" FOREIGN KEY ("setId") REFERENCES "MtgSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cardPrintingId_fkey" FOREIGN KEY ("cardPrintingId") REFERENCES "CardPrinting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurrentPrice" ADD CONSTRAINT "CurrentPrice_cardPrintingId_fkey" FOREIGN KEY ("cardPrintingId") REFERENCES "CardPrinting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_cardPrintingId_fkey" FOREIGN KEY ("cardPrintingId") REFERENCES "CardPrinting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
