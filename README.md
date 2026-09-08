# Mystic Ledger

A production-oriented Magic: The Gathering collection and portfolio manager. The Phase 1 MVP uses exact Scryfall printings, real persisted market prices, private user inventories, daily price snapshots, and quantity-weighted valuation.

## Requirements

- Node.js 22+
- PostgreSQL 15+

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies with `npm install`.
3. Apply the database migration with `npm run db:deploy`.
4. Generate the Prisma client with `npm run db:generate`.
5. Start the app with `npm run dev`, then open `http://localhost:3000`.

Create an account in the UI. Registration creates a private default collection. Passwords are hashed with Argon2id and sessions use hashed, HTTP-only cookie tokens.

## Card catalog and pricing

The Add Cards page searches the local PostgreSQL catalog first. On a cold catalog, the server fetches real exact-printing data and prices from Scryfall and saves it locally. UI components never call Scryfall directly.

For scheduled catalog warming:

```bash
npm run catalog:sync
```

`SCRYFALL_SYNC_PAGES` controls how many search pages are processed per run (default `10`). Schedule multiple bounded runs for a full catalog. Search-driven synchronization keeps a development database useful immediately, while current and daily historical price rows are updated whenever printings synchronize.

Scryfall does not publish condition-specific prices. Mystic Ledger therefore displays the unadjusted printing/finish price and never invents a condition multiplier. Missing prices are shown as unavailable, not `$0`.

## CSV

Use Import / Export in the sidebar. Imports require `card_name`, `set_code`, `collector_number`, `quantity`, `condition`, `finish`, and `language`. A review step reports recognized, unresolved, duplicate, and invalid rows; import stays disabled until every row resolves exactly.

## Quality commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deployment

Deploy the Next.js app to Vercel, Railway, or a compatible Node host and connect a managed PostgreSQL service such as Neon, Supabase, or Railway. Set `DATABASE_URL`, `APP_URL`, `SESSION_COOKIE_SECURE=true`, and an optional `CRON_SECRET`. Run `npm run db:deploy` during release.

See `docs/ARCHITECTURE.md` for service boundaries, identity rules, synchronization, and scaling decisions.
