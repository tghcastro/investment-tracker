# Architecture

**Analyzed:** 2026-06-05  
**Status:** Implemented — modular monorepo (domain / API / web); v2 (M5–M7) shipped in code, v2.0.0 tag pending.

## High-level diagram

```
┌──────────────────┐     HTTP (JSON)      ┌──────────────────┐     Drizzle      ┌─────────────┐
│  @investment-    │ ◄──────────────────► │  @investment-    │ ◄──────────────► │   SQLite    │
│  tracker/web     │                      │  tracker/api     │                  │  (file)     │
│  React + Vite    │                      │  Fastify + Repo  │                  └─────────────┘
└────────┬─────────┘                      └────────┬─────────┘
         │ imports types/schemas                 │ imports
         └──────────────────┬────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │  bonds-domain   │
                   │  Zod + types +  │
                   │  coupon math    │
                   └─────────────────┘
```

## Layer responsibilities

### `bonds-domain`

- **Owns:** Domain types, validation rules (Zod), coupon schedule helpers, BRFI validators (`brFi.ts`), FX conversion (`currency.ts`: native → USD → display).
- **Must not:** Import Fastify, React, Drizzle, or filesystem APIs.
- **Consumers:** API (`repo`, routes) applies all business rules. Web must **not** import domain runtime functions — see [API-FIRST.md](./API-FIRST.md).

### `packages/api`

| Layer | Files | Responsibility |
| --- | --- | --- |
| Transport | `server.ts`, `routes/**` | HTTP mapping, status codes, JSON shapes |
| Validation | Route modules + `bonds-domain` Zod | Parse/validate at boundary |
| Application | `repo.ts` | Queries, transactions, **computed response fields**, business errors as `RepoError` |
| Persistence | `schema.ts`, `db.ts`, `migrations/` | Drizzle models, SQLite connection |
| Cross-cutting | `middleware/errors.ts`, `appState.ts` | Unified errors; DB swap on restore |
| System | `routes/system/*`, `system/backup.ts` | Backup download, restore upload |

**Pattern:** Each route file exports `registerX(app, getRepo)` — keeps `server.ts` as a route table only.

### `packages/web`

| Layer | Responsibility |
| --- | --- |
| Pages | Route-level composition (`pages/*`) |
| Components | Reusable UI + forms |
| Hooks | `useApi` / `useApiMutation` — fetch to API |
| Styles | `tokens.css` + per-component CSS (no Tailwind) |

**No direct DB access.** All data via REST. **No business-rule duplication** — render API-derived fields; UI rules only ([API-FIRST.md](./API-FIRST.md)).

## API surface

| Area | Examples |
| --- | --- |
| Health | `GET /health` |
| Accounts | CRUD + `PATCH` archive, `GET :id/holdings` |
| Holding types | `GET /api/holding-types` (read-only catalog) |
| Currencies | `GET /api/currencies`, `GET /api/currencies/available` |
| Currency quotes | CRUD `/api/currency-quotes` (manual USD-base rates) |
| Bond holdings | CRUD `/api/holdings`; `currencyCode`; `expectedCouponAmountCents` on responses; list/detail include `converted*` (M6.1); `?displayCurrency=` (default USD) |
| BRFI holdings | CRUD `/api/br-fi-holdings`; product/indexing enums; `investedAmountCents`; same FX validation as bonds |
| FX preview | `GET /api/fx/convert` (M6.1) — form preview |
| Coupon payments | CRUD linked to bond holdings |
| Portfolio | `summary` (bonds + BRFI totals), `income-summary`, `upcoming-coupons` — **all forecasts/aggregates server-side** |
| System | `GET /api/system/info`, backup download, restore multipart upload |

Exact paths live in `packages/api/src/server.ts` and route modules.

## Data model

Tables (Drizzle in `schema.ts`):

- `accounts` — name, description, `archived_at`
- `account_currencies` — junction: allowed currencies per account
- `currencies` — ISO catalog (seeded); read-only via API
- `currency_quotes` — manual USD-base rates by date
- `holding_types` — slug, display name, sort order (seed: Bond, Brazilian Fixed Income)
- `bond_holdings` — FK → account + holding type; `currency_code`; issuer, identifiers, face value, coupon rate (decimal in DB), frequency, dates
- `br_fi_holdings` — FK → account + holding type; `currency_code`; product type, indexing type, indexing params, invested amount (cents), purchase/maturity dates
- `coupon_payments` — FK → bond holding; payment date, amount

**API convention:** `couponRate` in JSON is **percent** (0–100); stored as decimal fraction in SQLite (see route serializers).

## Key flows

### Create holding

```
Browser form → POST /api/holdings (Zod) → Repo.insert → SQLite
         ↑ bonds-domain validators
```

### Backup / restore

```
Settings UI → GET backup (file) / POST restore (multipart)
           → appState replaces DB connection + repo
```

### Income view

```
GET portfolio/income-summary + coupon list routes
     → Repo aggregates + bonds-domain schedule helpers for estimates
```

## Invariants (enforced by structure, not a custom linter)

1. **API-first:** Business rules (calculations, forecasts, conversions, schedules) run in `bonds-domain` + API; web displays results ([API-FIRST.md](./API-FIRST.md)).
2. API returns structured errors via error middleware (consistent JSON).
3. SQLite file path is configurable; tests use isolated temp DBs.
4. CORS allowlist is explicit (dev localhost + env override).

## Extension points (future)

- New asset class → new domain package + API route namespace + web module
- Broker adapter → new package behind repo interface (not in v1)
- Auth → middleware layer in Fastify + web session (not in v1)

See [PROJECT.md](../project/PROJECT.md) out-of-scope list.
