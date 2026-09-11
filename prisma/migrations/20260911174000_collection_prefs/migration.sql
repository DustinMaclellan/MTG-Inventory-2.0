-- Default collection list size and add-card condition.

ALTER TABLE "User" ADD COLUMN "lotsPerPage" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "User" ADD COLUMN "defaultCondition" "Condition" NOT NULL DEFAULT 'NEAR_MINT';
