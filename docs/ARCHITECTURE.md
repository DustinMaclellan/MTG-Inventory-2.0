# Architecture

## Runtime

- Next.js App Router renders authenticated portfolio and inventory pages on the server.
- Server actions own authentication and inventory mutations. Every private query constrains records by the authenticated user ID.
- PostgreSQL is the source of truth; Prisma provides transactions, migrations, and typed access.
- Scryfall is accessed only through the `CardDataProvider`/`PriceProvider` service boundary.

## Data identity

`Card` represents an Oracle card concept. `CardPrinting` represents one physical printing and is uniquely anchored by Scryfall ID. `InventoryItem` always points to `CardPrinting`, then separately records finish, condition, language, quantity, and acquisition data.

## Pricing

Scryfall prices are persisted in `CurrentPrice` and deduplicated into one `PriceHistory` row per printing/provider/finish/currency/day. Missing prices remain `null`; the application never substitutes zero or a synthetic condition adjustment.

## Catalog synchronization

Interactive search queries the local indexed catalog first. When the catalog is cold or sparse, the server fetches Scryfall, persists exact printings and current/daily prices, then serves database results. A bulk synchronization script supports scheduled catalog refreshes without coupling UI code to Scryfall.

## Scale and security

Inventory reads use server-side pagination and indexed ownership paths. Session tokens are random, stored only as SHA-256 hashes, and sent in secure HTTP-only cookies. Passwords use Argon2id. Expensive provider calls remain server-side and can be moved behind a queue without changing UI contracts.
