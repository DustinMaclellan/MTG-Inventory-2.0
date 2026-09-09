# Mystic Ledger

Private Magic: The Gathering collection manager. Track exact printings, market value, storage locations, and CSV import/export.

**Stack:** Next.js · PostgreSQL · Prisma · Scryfall prices

---

## Quick start

You need **Node.js 22+**. No separate Postgres install is required for local development.

```bash
git clone <your-repo-url> mtg-collection-manager
cd mtg-collection-manager
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start adding cards.

`npm run dev` will:

1. Start a project-local PostgreSQL on port `54321` (data under `.local/`)
2. Apply database migrations
3. Start the Next.js app

The first run can take a minute while Postgres binaries download and initialize.

---

## What you can do (Phase 1)

- Register / sign in (private inventory per account)
- Search exact Scryfall printings and add lots (qty, finish, condition, paid price, storage)
- Browse and search your collection; filter by storage
- See storage grouped by location
- Dashboard with total market value and cost basis
- CSV import (with review) and export

Prices come from Scryfall and are stored locally. The UI never calls Scryfall directly.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local Postgres + app (recommended) |
| `npm run dev:web` | App only (use your own `DATABASE_URL`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run catalog:sync` | Warm more catalog/price data from Scryfall |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run build` | Production build |

---

## Using your own PostgreSQL

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env`, then:

```bash
npm run db:deploy
npm run dev:web
```

---

## Environment variables

See `.env.example`. Common values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `APP_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `SESSION_COOKIE_SECURE` | `true` in production HTTPS |
| `CRON_SECRET` | Optional secret for scheduled sync endpoints |

Copy `.env.example` → `.env` only when you are not using the embedded Postgres from `npm run dev`. Never commit `.env`.

---

## Deploy

1. Host the Next.js app (Vercel, Railway, etc.)
2. Attach managed Postgres (Neon, Supabase, Railway, …)
3. Set `DATABASE_URL`, `APP_URL`, and `SESSION_COOKIE_SECURE=true`
4. Run `npm run db:deploy` on release

More detail on architecture and identity rules: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
