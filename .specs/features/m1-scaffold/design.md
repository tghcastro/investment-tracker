# M1 Design

**Spec**: `.specs/features/m1-scaffold/spec.md`
**Status**: Draft

---

## Architecture Overview

Modular monorepo. 3 packages:
- `bonds-domain`: domain entities + validators (no HTTP, no DB)
- `api`: Fastify server + repo layer → DB
- `web`: React SPA

Flow: UI → API → domain validators → repo → SQLite. Domain isolated. Testable at each layer.

```
┌────────────────────────────────────────────────────────────┐
│                      React SPA (web)                       │
│          (fetch API, display holdings/accounts)           │
└───────────────────────┬────────────────────────────────────┘
                        │ HTTP
                        ▼
┌────────────────────────────────────────────────────────────┐
│                  Fastify API (api)                         │
│    POST /holdings, GET /holdings/:id, etc.                 │
│    ↓ validators (from bonds-domain)                        │
│    ↓ repo layer (query/insert)                             │
└───────────────────────┬────────────────────────────────────┘
                        │ SQL
                        ▼
┌────────────────────────────────────────────────────────────┐
│                    SQLite DB                               │
│    accounts, bond_holdings, coupon_payments tables        │
└────────────────────────────────────────────────────────────┘

Domain (bonds-domain):
  - No imports from api or web
  - Entities + Zod schemas for validation
  - Exported: types, validators only
```

---

## Code Reuse Analysis

### Existing Components
None yet. Greenfield project. Docs exist (PROJECT.md, ROADMAP.md, STATE.md).

### Integration Points
- API ← domain (import validators)
- Repo ← domain (return typed entities)
- Web ← API (fetch + consume JSON)

---

## Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Monorepo tool | npm workspaces (built-in) | No extra CLI. Root `package.json` links all. Simple. |
| API framework | Fastify | Fast, TypeScript-native, schema validation built-in. Zod integrates well. |
| Validation | Zod | Runtime + TS types. Excellent error messages. Light weight. |
| ORM / Query | Drizzle | SQLite-first, type-safe queries, migrations idiomatic, no magic. |
| Web framework | React 18 + Vite | Fast dev, SPA pattern, ecosystem. |
| UI design system | DESIGN.md → CSS tokens | Institutional calm; Coinbase Blue accent; maps to web-design.md. |
| Web styling | CSS variables (no Tailwind M1) | Tokens trace to DESIGN.md; keeps bundle small. |
| Testing | Vitest | Vite native, fast, ESM first. Jest alternative. |
| Linting | ESLint + Prettier | Standard. TypeScript strict. |
| DB | SQLite + Drizzle migrations | Single file. Schema migrations version-controlled. Fixture seed in migration. |

---

## Packages

### `packages/bonds-domain`

- **Purpose**: Domain logic + types. No HTTP or DB.
- **Location**: `packages/bonds-domain/src`
- **Exports**:
  - `types.ts`: Account, BondHolding, CouponPayment interfaces
  - `validators.ts`: Zod schemas for each entity (runtime validation)
  - `errors.ts`: DomainError, ValidationError classes
- **Dependencies**: zod only
- **No imports from**: api, web

### `packages/api`

- **Purpose**: Fastify REST API + repo layer
- **Location**: `packages/api/src`
- **Key modules**:
  - `server.ts`: Fastify app bootstrap, route registration
  - `routes/holdings.ts`: POST /holdings, GET /holdings/:id, GET /holdings, GET /holdings?maturityAfter=...
  - `routes/accounts.ts`: GET /accounts, GET /accounts/:id/holdings
  - `repo.ts`: Query + insert fns (uses Drizzle client). Returns typed entities.
  - `middleware/errors.ts`: Validation error → 400, not found → 404, DB error → 500
  - `middleware/cors.ts`: CORS for web SPA (localhost:3001)
- **Dependencies**: fastify, @fastify/cors, drizzle-orm, sqlite, bonds-domain
- **Endpoints**:
  - POST /health → `{ status: "ok" }`
  - POST /api/accounts → create account
  - GET /api/accounts → list all
  - GET /api/accounts/:id/holdings → holdings for account
  - POST /api/holdings → create holding (validates via Zod schema)
  - GET /api/holdings/:id → single holding
  - GET /api/holdings → list all (optional maturityAfter filter)

### `packages/web`

- **Purpose**: React SPA consuming API
- **UI design**: [web-design.md](./web-design.md) — applies [`DESIGN.md`](../../../DESIGN.md) (Coinbase-inspired institutional system)
- **Location**: `packages/web/src`
- **Styling**: CSS custom properties (`styles/tokens.css`, `styles/global.css`); no CSS-in-JS framework in M1
- **Fonts**: Inter (display + body), JetBrains Mono (numbers) per DESIGN.md substitutes
- **Key modules**:
  - `styles/tokens.css`, `styles/global.css` — design tokens from DESIGN.md
  - `components/ui/` — Button, TopNav, PageHeader, EmptyState, ErrorBanner
  - `components/HoldingsTable.tsx` — asset-row pattern
  - `App.tsx`: Router + AppShell (TopNav + main)
  - `pages/Home.tsx`, `pages/Holdings.tsx`, `pages/Accounts.tsx`
  - `hooks/useApi.ts`: Fetch wrapper + error handling
- **Dependencies**: react, react-router-dom, vite, @fontsource/inter, @fontsource/jetbrains-mono
- **Env**: `VITE_API_URL=http://localhost:3000` (dev)

### Root (`packages/package.json`)

```json
{
  "workspaces": [
    "packages/bonds-domain",
    "packages/api",
    "packages/web"
  ],
  "scripts": {
    "install": "npm install",
    "dev": "npm run dev -r",
    "dev:api": "npm run dev -w api",
    "dev:web": "npm run dev -w web",
    "build": "npm run build -r",
    "lint": "npm run lint -r",
    "test": "npm run test -r"
  }
}
```

---

## Data Models

### Account

```typescript
interface Account {
  id: string // uuid
  name: string // "Interactive Brokers", "Vanguard", etc.
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

Relationships: 1 Account → many BondHoldings

### BondHolding

```typescript
interface BondHolding {
  id: string // uuid
  accountId: string // FK
  issuer: string // "US Treasury", "Apple Inc."
  isin?: string // optional int'l identifier
  cusip?: string // optional US identifier
  faceValue: number // principal (cents or full? → store as cents, display as dollars)
  couponRate: number // % annual (e.g., 3.5)
  couponFrequency: "semi-annual" | "quarterly" | "monthly" | "annual"
  maturityDate: Date
  purchaseDate: Date
  purchasePrice?: number // optional
  updatedAt: Date
}
```

Relationships: BondHolding → Account (FK), BondHolding ← CouponPayments

### CouponPayment

```typescript
interface CouponPayment {
  id: string // uuid
  bondHoldingId: string // FK
  paymentDate: Date
  amount: number // in cents
  recordedAt: Date
}
```

Relationships: CouponPayment → BondHolding (FK)

---

## Validation Strategy (Zod)

```typescript
// bonds-domain/src/validators.ts

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const createBondHoldingSchema = z.object({
  accountId: z.string().uuid(),
  issuer: z.string().min(1),
  isin: z.string().optional(),
  cusip: z.string().optional(),
  faceValue: z.number().int().positive(),
  couponRate: z.number().min(0).max(100),
  couponFrequency: z.enum(["semi-annual", "quarterly", "monthly", "annual"]),
  maturityDate: z.coerce.date(),
  purchaseDate: z.coerce.date(),
  purchasePrice: z.number().optional(),
}).refine(
  (data) => data.maturityDate > data.purchaseDate,
  { message: "Maturity must be after purchase", path: ["maturityDate"] }
);

export const createCouponPaymentSchema = z.object({
  bondHoldingId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number().int().positive(),
});
```

API middleware uses schema.parse(req.body) → 400 if fails, includes field errors.

---

## Error Handling

| Scenario | Handling | Response |
|----------|----------|----------|
| Invalid JSON body | Fastify catches | 400 + "Invalid JSON" |
| Validation fail (Zod) | Middleware catches | 400 + `{ code: "VALIDATION_ERROR", fields: {...} }` |
| Missing required field | Zod schema | 400 + field name |
| maturityDate ≤ purchaseDate | Zod refine | 400 + "Maturity must be after purchase" |
| account ID not found | Repo checks FK | 400 + "Account not found" OR constraint error handled |
| holding not found | GET /holdings/:id | 404 + `{ code: "NOT_FOUND" }` |
| DB connection error | Fastify error handler | 500 + "Database error" (no internal details) |
| Unhandled exception | Fastify error handler | 500 + "Internal server error" |

---

## Dev Workflow

1. `npm install` at root → workspaces linked
2. `npm run lint` → ESLint across all packages
3. `npm run test` → Vitest across all
4. `npm run dev` → Both API (port 3000) + web (port 3001)
5. `npm run dev:api` OR `npm run dev:web` → Individual servers

Seed data: On first migration, create 2 fixture accounts + 3 bonds in DB. Fixture runs if count = 0.

---

## Stack Summary

- **Monorepo**: npm workspaces
- **Lang**: TypeScript 5 strict
- **API**: Fastify + Zod
- **DB**: SQLite + Drizzle (migrations + queries)
- **Web**: React 18 + Vite + DESIGN.md token layer (see web-design.md)
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

---

## Web UI (summary)

Full specification: [web-design.md](./web-design.md).

| Screen | Primary DESIGN.md patterns |
| --- | --- |
| App shell | `top-nav-light`, max-width 1200px canvas |
| Home | `hero-band-light` (compressed), `feature-card` summary |
| Holdings | `asset-row`, `asset-icon-circular`, `number-display` |
| Accounts | `feature-card` grid, `badge-pill` |
| States | `surface-soft` bands; errors use `semantic-down` text only |
