-- Track which Scryfall bulk file was last imported.

CREATE TABLE "CatalogSync" (
    "id" TEXT NOT NULL,
    "bulkType" TEXT NOT NULL DEFAULT 'default_cards',
    "bulkUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "printingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogSync_pkey" PRIMARY KEY ("id")
);
