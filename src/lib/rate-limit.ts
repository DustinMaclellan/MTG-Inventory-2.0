/**
 * Persistent, database-backed sliding-window rate limiter.
 *
 * Each bucket is keyed on an opaque string (e.g. "auth:ip:1.2.3.4") and stored
 * in Postgres. Using the database means the limit survives serverless cold-starts
 * and is shared across all function instances — unlike an in-memory Map which
 * resets on every Vercel invocation.
 *
 * The upsert uses a single round-trip and Postgres-level atomicity so two
 * concurrent requests for the same key cannot both pass under the limit.
 */

import { db } from "@/lib/db";

export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 15 * 60 * 1000,
): Promise<{ ok: boolean; remaining: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // Atomic upsert: insert a new bucket or increment the existing one.
  // If the window has expired, restart the count from 1.
  const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count   = CASE
                  WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
                  ELSE "RateLimitBucket".count + 1
                END,
      "resetAt" = CASE
                    WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
                    ELSE "RateLimitBucket"."resetAt"
                  END
    RETURNING count, "resetAt"
  `;

  const bucket = rows[0];
  if (!bucket) {
    // Unexpected — fail open so a DB hiccup does not lock users out.
    return { ok: true, remaining: limit - 1 };
  }

  const count = Number(bucket.count);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export function clientIpFrom(headersList: Headers) {
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headersList.get("x-real-ip") || "unknown";
}
