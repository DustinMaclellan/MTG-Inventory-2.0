# Mystic Ledger

Private Magic: The Gathering collection manager. Track exact Scryfall printings, market value, storage locations, and decks. New accounts get a 14-day free trial, then one paid plan.

Live: [https://mystic-ledger.vercel.app](https://mystic-ledger.vercel.app)

**Stack:** Next.js 16 · PostgreSQL · Prisma · Scryfall prices · Stripe billing · English / French

The brand name **Mystic Ledger** is not translated.

---

## Quick start

You need **Node.js 22+**. No separate Postgres install is required for local development.

```bash
git clone https://github.com/DustinMaclellan/MTG-Inventory-2.0.git
cd MTG-Inventory-2.0
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

- Public landing, pricing, terms, and privacy (English or French). Landing and sign-in stay on the default green brand color.
- Register / sign in (private inventory per account) with a 14-day trial. New passwords need 14 characters, a letter, and a number.
- Search exact Scryfall printings and add lots (qty, finish, condition, paid price, storage)
- Browse the collection with search, filters, sort, pagination, and bulk edit / delete
- Track storage by binder, box, or shelf
- Dashboard with market value, cost basis, unrealized gain, recently added, and the three largest positions (opens that lot in the collection list)
- Deck builder with owned vs missing per printing and finish
- CSV import (with review) and export for the full collection, one binder, or one deck (Moxfield, Archidekt, ManaBox, and others)
- Settings in four sections:
  - **Profile** — display name
  - **Preferences** — language, accent color, display currency, lots per page, default condition when adding cards
  - **Billing** — trial / plan and Stripe portal
  - **Security** — password and account deletion
- Subscribe through Stripe Checkout; manage billing in the Stripe Customer Portal
- Reset a forgotten password

Analytics and Transactions are listed in the app as coming later. They are not live.

Prices come from Scryfall and are stored locally. The browser never calls Scryfall.

Accent color changes buttons, navigation, and highlights inside the app. Unrealized gains stay green and losses stay red. The public homepage and sign-in pages always use the default emerald brand.

---

## Prices

Scryfall publishes **USD** and **EUR**. Those values are saved when a printing is first fetched, and refreshed daily for every printing someone owns.

- **Daily job** (`/api/cron/price-sync` at 06:00 UTC) re-fetches owned printings through Scryfall’s collection API
- **Catalog job** (`/api/cron/catalog-sync` at 06:30 UTC) adds the newest paper printings. A full catalog comes from Scryfall’s **default_cards** bulk file via `npm run catalog:sync`
- Add Cards searches the local catalog (no live Scryfall call once the bulk file is imported)
- Opening the dashboard does **not** call Scryfall; it reads stored prices
- **CAD market** uses Scryfall USD converted at the ECB USD/CAD rate (Frankfurter). If that rate is unavailable, CAD falls back to the USD amount
- **Paid amounts** convert to the collector’s display currency using the current USD exchange rate (USD, CAD, or EUR)

Scryfall itself updates TCGPlayer / Cardmarket prices about once a day, so collection value tracks Scryfall, not a live exchange.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local Postgres + app (recommended) |
| `npm run dev:web` | App only (use your own `DATABASE_URL`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run catalog:sync` | Import Scryfall’s bulk card file, then refresh owned prices |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run build` | Production build (`prisma generate` + Next.js) |

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

See `.env.example`. Never commit `.env`.

`npm run dev` with the embedded Postgres does not need a `.env` file. Create one for production, or when using `dev:web` against your own database.

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `APP_URL` | Yes | Public origin, no trailing slash (Stripe redirects and password-reset links) |
| `SESSION_COOKIE_SECURE` | Yes (`true`) | Secure session cookie. Also implied when `NODE_ENV=production` |
| `CRON_SECRET` | Yes | Shared secret for `/api/cron/*`. Vercel sends `Authorization: Bearer <CRON_SECRET>` |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key (start with test mode) |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRICE_MONTHLY` | For billing | Stripe Price id for $8/month |
| `STRIPE_PRICE_YEARLY` | For billing | Stripe Price id for $72/year |
| `RESEND_API_KEY` | For password reset email | Leave empty locally to print reset links in the console |
| `EMAIL_FROM` | With Resend | Verified Resend from-address |
| `SCRYFALL_SYNC_PAGES` | No | Catalog cron page cap (default `10`) |

On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is used if `APP_URL` is missing. Per-deployment `VERCEL_URL` is intentionally not used.

---

## Deploy

1. Host the Next.js app (Vercel is the path `vercel.json` is written for)
2. Attach managed Postgres (Neon, Supabase, Railway, …)
3. Set `DATABASE_URL`, `APP_URL`, `SESSION_COOKIE_SECURE=true`, and `CRON_SECRET` (`openssl rand -hex 32`)
4. Run `npm run db:deploy` on release (or add `prisma migrate deploy` to the host’s release command)
5. Create a Stripe product with monthly and yearly prices; set the Stripe env vars
6. Point a Stripe webhook at `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`
7. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` so password reset email actually sends
8. Confirm both Vercel crons are enabled: `/api/cron/price-sync` (06:00 UTC) and `/api/cron/catalog-sync` (06:30 UTC)

Hobby Vercel cron jobs are capped at 60 seconds. Owned-price refresh is sized for that. After `npm run catalog:sync` has loaded the bulk file, the daily catalog job only fetches the newest printings.

Recommended list price: **$8/month** or **$72/year**. Change the amounts in the Stripe Dashboard; the marketing copy lives in `src/lib/constants.ts`.

More detail on data identity, preferences, and security: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
