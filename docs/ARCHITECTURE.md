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

`npm run catalog:sync` loads Scryfall’s `default_cards` bulk file into PostgreSQL (paper printings only, with `rawPrices`). After that, Add Cards and deck search query the local catalog only. The daily `/api/cron/catalog-sync` job imports bulk only if the catalog is still small; otherwise it fetches a few newest-prints pages. Live Scryfall search is a cold-start fallback when fewer than 1,000 printings are stored.

## Billing

New accounts receive a 14-day application trial (`User.trialEndsAt`). After the trial, access requires an active Stripe subscription synced through `/api/stripe/webhook`. Marketing pages are public; product routes sit behind `src/proxy.ts` (session cookie) and `requireEntitlement()`.

## Scale and security

Inventory reads use server-side pagination and indexed ownership paths. Session tokens are random, stored only as SHA-256 hashes, and sent in secure HTTP-only cookies. Passwords use Argon2id. Login and registration are rate-limited. Expensive provider calls remain server-side. Cron routes accept `CRON_SECRET` only from request headers.
