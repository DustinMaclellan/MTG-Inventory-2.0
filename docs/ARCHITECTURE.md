# Architecture

## Runtime

- Next.js App Router renders authenticated portfolio and inventory pages on the server.
- Server actions own authentication and inventory mutations. Every private query constrains records by the authenticated user ID.
- PostgreSQL is the source of truth; Prisma provides transactions, migrations, and typed access.
- Scryfall is accessed only through the `CardDataProvider`/`PriceProvider` service boundary.
- UI copy is English or French (`User.preferredLocale` plus the `mystic_locale` cookie). Brand name **Mystic Ledger** stays untranslated.

## Data identity

`Card` represents an Oracle card concept. `CardPrinting` represents one physical printing and is uniquely anchored by Scryfall ID. `InventoryItem` always points to `CardPrinting`, then separately records finish, condition, language, quantity, and acquisition data. `DeckCard` points at a specific printing so owned vs missing is exact.

## Pricing

Scryfall USD and EUR are persisted in `CurrentPrice` and deduplicated into one `PriceHistory` row per printing/provider/finish/currency/day. Missing prices remain `null`; the application never substitutes zero or a synthetic condition adjustment.

Owned printings are refreshed daily via Scryfall `/cards/collection` (`/api/cron/price-sync`). Newest paper printings are synced separately (`/api/cron/catalog-sync`). Dashboard and collection pages read stored prices only.

CAD is not published by Scryfall. When a user prefers CAD, the app reads USD and converts with the ECB USD/CAD rate.

## Catalog synchronization

Interactive search queries the local indexed catalog first. When the catalog is cold or sparse, the server fetches Scryfall, persists exact printings and current/daily prices, then serves database results. `npm run catalog:sync` refreshes owned prices and newest catalog pages without coupling UI code to Scryfall.

## Billing

New accounts receive a 14-day application trial (`User.trialEndsAt`). After the trial, access requires an active Stripe subscription synced through `/api/stripe/webhook`. Marketing pages are public; product routes sit behind `src/proxy.ts` (session cookie) and `requireEntitlement()`.

## Scale and security

Inventory reads use server-side pagination and indexed ownership paths. Session tokens are random, stored only as SHA-256 hashes, and sent in secure HTTP-only cookies. Passwords use Argon2id. Login and registration are rate-limited. Expensive provider calls remain server-side. Cron routes accept `CRON_SECRET` only from request headers.
