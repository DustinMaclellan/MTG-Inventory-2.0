# Architecture

## Runtime

- Next.js App Router renders authenticated portfolio and inventory pages on the server.
- Server actions own authentication and inventory mutations. Every private query constrains records by the authenticated user ID.
- PostgreSQL is the source of truth; Prisma provides transactions, migrations, and typed access.
- Scryfall is accessed only through the `CardDataProvider` / `PriceProvider` service boundary (`src/services/providers.ts`, implemented in `src/services/scryfall.ts`). The browser never calls Scryfall.
- UI copy is English or French (`User.preferredLocale` plus the `mystic_locale` cookie). Brand name **Mystic Ledger** stays untranslated.
- `src/proxy.ts` (Next.js 16 request proxy) gates product routes on the session cookie, redirects anonymous users to `/login` without an open-redirect `?next=` parameter, and forwards `x-pathname` so the root layout can pick an accent.

## Routes

Public: `/`, `/pricing`, `/terms`, `/privacy`, `/login`, `/register`, `/forgot-password`, `/reset-password`.

App (session + entitlement): `/dashboard`, `/collection`, `/storage`, `/add`, `/imports`, `/decks`, `/subscribe`, `/settings` (redirects to `/settings/profile`). Settings sections: `/settings/profile`, `/settings/preferences`, `/settings/billing`, `/settings/security`.

API: `/api/export`, `/api/deck-search`, `/api/cron/price-sync`, `/api/cron/catalog-sync`, `/api/stripe/webhook`.

Analytics and Transactions appear in navigation as coming later. They have no product routes.

## Data identity

`Card` represents an Oracle card concept. `CardPrinting` represents one physical printing and is uniquely anchored by Scryfall ID. `InventoryItem` always points to `CardPrinting`, then separately records finish, condition, language, quantity, storage, and acquisition data. `DeckCard` points at a specific printing **and finish** so owned vs missing is exact (`@@unique([deckId, cardPrintingId, finish, isCommanderZone])`). The same printing can sit in the commander zone (quantity 1) and the mainboard (remaining copies). Unsetting the commander merges those copies back together.

## Preferences and chrome

Stored on `User`:

| Field | Purpose |
| --- | --- |
| `preferredLocale` | App copy (`en` / `fr`), mirrored to `mystic_locale` |
| `preferredAccent` | App chrome color (`emerald`, `sky`, `violet`, `amber`, `rose`, `cyan`), mirrored to `mystic_accent` |
| `preferredCurrency` | Display currency for market and paid values (`USD`, `CAD`, `EUR`) |
| `lotsPerPage` | Collection list page size (`25`, `50`, or `100`) |
| `defaultCondition` | Pre-selected condition on Add Cards |

Accent CSS variables live on `<html data-accent>`. Gains stay emerald and losses stay rose regardless of theme. The homepage and auth pages (`/`, `/login`, `/register`, `/forgot-password`, `/reset-password`) always render the default emerald brand, even if the collector has another accent saved.

## Pricing

Scryfall USD and EUR are persisted in `CurrentPrice` and deduplicated into one `PriceHistory` row per printing/provider/finish/currency/day. Missing prices remain `null`; the application never substitutes zero or a synthetic condition adjustment.

Owned printings are refreshed daily via Scryfall `/cards/collection` (`/api/cron/price-sync`). Newest paper printings are synced separately (`/api/cron/catalog-sync`). Dashboard and collection pages read stored prices only.

CAD is not published by Scryfall. When a user prefers CAD, market value reads USD and converts with the ECB USD/CAD rate (Frankfurter). Paid amounts convert to the display currency with the current USD exchange rate (USD ↔ CAD ↔ EUR). If a rate is unavailable, CAD market falls back to the USD amount.

## Catalog synchronization

`npm run catalog:sync` loads Scryfall’s `default_cards` bulk file into PostgreSQL (paper printings only, with `rawPrices`). After that, Add Cards and deck search query the local catalog only. The daily `/api/cron/catalog-sync` job imports bulk only if the catalog is still small; otherwise it fetches a few newest-prints pages. Live Scryfall search is a cold-start fallback when fewer than 1,000 printings are stored.

## Billing

New accounts receive a 14-day application trial (`User.trialEndsAt`). The in-app trial banner only appears in the last three days (`TRIAL_BANNER_DAYS`). After the trial, access requires an active Stripe subscription synced through `/api/stripe/webhook`. Marketing pages are public; product routes sit behind `src/proxy.ts` (session cookie) and `requireEntitlement()`.

## Scale and security

Inventory reads use server-side pagination (`User.lotsPerPage`) and indexed ownership paths. Session tokens are random, stored only as SHA-256 hashes, and sent in the HTTP-only `mystic_session` cookie. Passwords use Argon2id. New passwords must be 14–128 characters with at least one letter and one number, and must not be a common string or contain the account email. Login still accepts older hashes. Login and registration are rate-limited. Expensive provider calls remain server-side. Cron routes accept `CRON_SECRET` only from request headers.
