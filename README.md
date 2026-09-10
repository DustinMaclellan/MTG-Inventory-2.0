# Mystic Ledger

Private Magic: The Gathering collection manager. Track exact printings, market value, storage locations, and CSV import/export. New accounts get a 14-day free trial, then one paid plan.

**Stack:** Next.js · PostgreSQL · Prisma · Scryfall prices · Stripe billing

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

Stripe and Resend are optional for local inventory work. Checkout and password-reset email stay disabled until you add those keys.

---

## What you can do

- Public landing, pricing, terms, and privacy pages
- Register / sign in (private inventory per account) with a 14-day trial
- Search exact Scryfall printings and add lots (qty, finish, condition, paid price, storage)
- Browse and search your collection; filter by storage
- See storage grouped by location
- Dashboard with total market value and cost basis
- CSV import (with review) and export
- Subscribe through Stripe Checkout; manage billing in the Stripe Customer Portal
- Reset a forgotten password; delete your account from Settings

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
| `CRON_SECRET` | Required secret for `/api/cron/catalog-sync` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_MONTHLY` | Stripe Price id for $8/month |
| `STRIPE_PRICE_YEARLY` | Stripe Price id for $72/year |
| `RESEND_API_KEY` | Sends password-reset email |
| `EMAIL_FROM` | From address for Resend |

Copy `.env.example` → `.env` only when you are not using the embedded Postgres from `npm run dev`. Never commit `.env`.

---

## Deploy

1. Host the Next.js app (Vercel, Railway, etc.)
2. Attach managed Postgres (Neon, Supabase, Railway, …)
3. Set `DATABASE_URL`, `APP_URL`, and `SESSION_COOKIE_SECURE=true`
4. Create a Stripe product with monthly and yearly prices; set the Stripe env vars
5. Point a Stripe webhook at `/api/stripe/webhook`
6. Set `RESEND_API_KEY` (and a verified `EMAIL_FROM`) for password reset
7. Run `npm run db:deploy` on release
8. Schedule `/api/cron/catalog-sync` daily (Vercel Cron is configured in `vercel.json`)

Recommended list price: **$8/month** or **$72/year**. Change the amounts in the Stripe Dashboard; the marketing copy lives in `src/lib/constants.ts`.

More detail on architecture and identity rules: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
