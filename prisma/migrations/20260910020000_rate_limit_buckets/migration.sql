-- Add persistent rate-limit buckets so the in-flight limit survives serverless
-- cold-starts and works correctly across multiple function instances.

CREATE TABLE "RateLimitBucket" (
    "key"     TEXT         NOT NULL,
    "count"   INTEGER      NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
