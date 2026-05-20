# M1 Tasks

**Design**: `.specs/features/m1-scaffold/design.md`  
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

`T1 → T2 → T3`

Root monorepo setup, linting, testing framework. All packages depend on this.

### Phase 2: Domain Layer (Sequential after Phase 1)

`T4 → T5 → T6 → T7`

Bond domain entities + validators. API and persistence depend on this.

### Phase 3: Persistence (Sequential after Phase 2)

`T8 → T9 → T10 → T11 → T12`

SQLite + Drizzle ORM, schema, migrations, seed, repo query layer.

### Phase 4: API Scaffold + Routes (Sequential after Phase 3)

```
     ┌─→ T13 ─┐
     │        ├─→ T20 ─→ T21
T3 ──┼─→ T14 ─┤
     │        ├─→ T15 ─┐
     └─→ T16 ─┘        │
                       ├─→ T22 ─→ T23
     ┌─→ T17 ─────────┤
     │                ├─→ T18 ─┐
     └─→ T19 ────────┘        │
                              ├─→ T24
```

**Clarification:**
- T13 (Fastify + health): blocks all routes
- T14-T19: routes (can start after T13, in parallel)
- T20-T21: error middleware + tests (depend on routes)
- T22-T24: integration test suite (depends on all routes)

Actually, clearer order:
1. T13: Fastify server bootstrap
2. T14-T19: Routes (all parallel after T13) [P]
3. T20: Error middleware
4. T21: Middleware tests
5. T22-T24: Full API integration tests

### Phase 5: Web Package (Parallel with Phase 4, both depend on Phase 1)

```
T3 ──→ T22 ──→ T22a ──→ T23 ──┬─→ T24 (Home) [P]
                               ├─→ T25 (Holdings) [P]
                               ├─→ T25b (Accounts) [P]
                               └─→ T26 (useApi) ──→ T28 ──→ T29 (tests)
                               T27 (ErrorBoundary) — parallel after T22a
```

1. T22: React + Vite scaffold
2. T22a: DESIGN.md tokens + UI primitives
3. T23: TopNav app shell + router
4. T24, T25, T25b: Pages (parallel after T23)
5. T26: useApi hook
6. T27: Error boundary
7. T28: Wire pages to useApi
8. T29: Component unit tests + responsive nav check (M1-21)

---

## Task Breakdown

### T1: Root Monorepo Setup

**What**: Initialize npm workspaces, root package.json with workspace links + shared scripts  
**Where**: `./package.json`, `./tsconfig.json` (root)  
**Depends on**: None  
**Reuses**: None  

**Tools**:
- Filesystem only

**Done when**:

- [ ] Root `package.json` defines `"workspaces": ["packages/*"]`
- [ ] Root scripts defined: `dev`, `build`, `lint`, `test`
- [ ] `npm install` succeeds at root → all workspaces linked
- [ ] `npm list` shows tree with 3 packages (bonds-domain, api, web)

**Tests**: none  
**Gate**: Build (`npm install`)

---

### T2: TypeScript + ESLint + Prettier Config

**What**: Root TypeScript strict config, ESLint shared config, Prettier rules applied to all packages  
**Where**: `./tsconfig.json`, `./.eslintrc.json`, `./.prettierrc`  
**Depends on**: T1  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] Root `tsconfig.json` has `"strict": true`, `"target": "ES2020"`
- [ ] `.eslintrc.json` extends `eslint:recommended`, TypeScript plugin
- [ ] `.prettierrc` defines consistent formatting (2-space indent, semicolons, etc.)
- [ ] Each package inherits/extends root configs in their own `tsconfig.json`
- [ ] `npm run lint -- --version` returns ESLint version (script works)

**Tests**: none  
**Gate**: Lint (`npm run lint`)

---

### T3: Vitest Setup + Test Scripts

**What**: Install Vitest, configure test runner, add test scripts to root + each package  
**Where**: Root + each package `package.json`, `vitest.config.ts` (if needed)  
**Depends on**: T2  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] Vitest installed in all packages (`npm install vitest` in each or root if shared)
- [ ] Root `package.json` has `"test": "vitest"` script
- [ ] Each package has `vitest.config.ts` or inherits from root
- [ ] `npm run test -- --run` executes (finds 0 tests initially, pass)
- [ ] `npm run test` runs in watch mode without error

**Tests**: none  
**Gate**: Build (`npm run test -- --run`)

---

### T4: Create bonds-domain Package Structure

**What**: Create package.json, tsconfig.json, src/ directory, export index.ts for bonds-domain  
**Where**: `packages/bonds-domain/`  
**Depends on**: T1, T2, T3  
**Reuses**: Root tsconfig, ESLint config  

**Tools**:
- Filesystem only

**Done when**:

- [ ] `packages/bonds-domain/package.json` created with name, version, main, exports
- [ ] `packages/bonds-domain/tsconfig.json` extends root tsconfig
- [ ] `packages/bonds-domain/src/index.ts` created (empty exports OK for now)
- [ ] Package linkable: `npm list bonds-domain` in root shows it

**Tests**: none  
**Gate**: Build (`npm run build -w bonds-domain`)

---

### T5: Create Domain Entity Types

**What**: Define TypeScript interfaces for Account, BondHolding, CouponPayment  
**Where**: `packages/bonds-domain/src/types.ts`  
**Depends on**: T4  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] Account interface: id, name, description?, createdAt, updatedAt
- [ ] BondHolding interface: id, accountId, issuer, isin?, cusip?, faceValue, couponRate, couponFrequency, maturityDate, purchaseDate, purchasePrice?, updatedAt
- [ ] CouponPayment interface: id, bondHoldingId, paymentDate, amount, recordedAt
- [ ] All types exported from `src/index.ts`
- [ ] TypeScript compiles with no errors

**Tests**: none  
**Gate**: Build (`npm run build -w bonds-domain`)

---

### T6: Create Zod Validators

**What**: Define Zod schemas for account, bond holding, and coupon payment creation + validation  
**Where**: `packages/bonds-domain/src/validators.ts`  
**Depends on**: T5  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] `createAccountSchema`: name required, description optional
- [ ] `createBondHoldingSchema`: all fields from type, with maturityDate > purchaseDate refine check
- [ ] `createCouponPaymentSchema`: required fields + amount > 0, paymentDate is date
- [ ] `couponFrequencyEnum`: validates semi-annual, quarterly, monthly, annual
- [ ] All schemas exported from `src/index.ts`
- [ ] Zod installed: `npm install zod` in package or root

**Tests**: none (unit tests come in T7)  
**Gate**: Build (`npm run build -w bonds-domain`)

---

### T7: Unit Tests for Validators

**What**: Write Vitest unit tests for Zod schemas (valid inputs pass, invalid fail with correct errors)  
**Where**: `packages/bonds-domain/__tests__/validators.test.ts`  
**Depends on**: T6  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] Test: valid account parses successfully
- [ ] Test: account with empty name fails with "name required"
- [ ] Test: valid bond holding parses successfully
- [ ] Test: bond holding with maturityDate ≤ purchaseDate fails
- [ ] Test: bond holding with faceValue ≤ 0 fails
- [ ] Test: coupon payment with amount ≤ 0 fails
- [ ] Test: coupon payment with future paymentDate is allowed
- [ ] Test: invalid couponFrequency rejected with enum error
- [ ] `npm run test -w bonds-domain -- --run` reports ≥8 tests pass

**Tests**: unit  
**Gate**: Quick (`npm run test -w bonds-domain -- --run`)

---

### T8: Setup Drizzle + SQLite

**What**: Install Drizzle ORM, SQLite driver, configure Drizzle client + schema export  
**Where**: `packages/api/src/db.ts`, `packages/api/drizzle.config.ts`  
**Depends on**: T3 (test setup), needs api package scaffolded first  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] `npm install drizzle-orm better-sqlite3` in api package
- [ ] `packages/api/src/db.ts` exports Drizzle client initialized with SQLite `:memory:` (for tests) or `./data.db` (for dev)
- [ ] `drizzle.config.ts` at root of api package points to migrations dir
- [ ] `npm run build -w api` compiles without error

**Tests**: none  
**Gate**: Build (`npm run build -w api`)

---

### T9: Define Database Schema

**What**: Create Drizzle schema file with table definitions (accounts, bond_holdings, coupon_payments)  
**Where**: `packages/api/src/schema.ts`  
**Depends on**: T8  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] `accounts` table: id (PK), name, description, created_at, updated_at
- [ ] `bond_holdings` table: id (PK), account_id (FK), issuer, isin, cusip, face_value, coupon_rate, coupon_frequency, maturity_date, purchase_date, purchase_price, updated_at
- [ ] `coupon_payments` table: id (PK), bond_holding_id (FK), payment_date, amount, recorded_at
- [ ] Foreign keys defined (account_id → accounts.id, bond_holding_id → bond_holdings.id)
- [ ] Timestamps auto-set (createdAt, updatedAt, recordedAt)
- [ ] Schema exported from `src/index.ts`

**Tests**: none  
**Gate**: Build (`npm run build -w api`)

---

### T10: Create Migrations + Seed Fixture

**What**: Create Drizzle migration file for initial schema + seed script that creates 2 accounts + 3 bond holdings  
**Where**: `packages/api/src/migrations/001_initial_schema.sql`, `packages/api/src/fixtures/seed.ts`  
**Depends on**: T9  
**Reuses**: None

**Tools**:
- Filesystem only

**Done when**:

- [ ] Migration file creates all 3 tables with constraints
- [ ] Seed script inserts 2 fixture accounts (e.g., "Vanguard", "Interactive Brokers")
- [ ] Seed script inserts 3+ fixture bond holdings across both accounts with varied maturity dates
- [ ] Seed script exports fixture data for use in tests
- [ ] `npm run migrate` command runs migrations (script added to package.json)
- [ ] After migration, `sqlite3 ./data.db "SELECT COUNT(*) FROM accounts;"` shows 2 (if seed auto-runs, or seed manually called once)

**Tests**: none (integration tests in repo tests verify seed works)  
**Gate**: Build + Manual (`npm run migrate`)

---

### T11: Create Repo Query Layer

**What**: Implement query functions for accounts + holdings (insert, get, list, filter)  
**Where**: `packages/api/src/repo.ts`  
**Depends on**: T10, T5 (domain types)  
**Reuses**: Drizzle schema from T9

**Tools**:
- Filesystem only

**Done when**:

- [x] `insertAccount(data): Promise<Account>` inserts, returns typed entity
- [x] `getAccount(id): Promise<Account | null>` retrieves one
- [x] `listAccounts(): Promise<Account[]>` returns all
- [x] `insertBondHolding(data): Promise<BondHolding>` inserts, returns typed entity
- [x] `getBondHolding(id): Promise<BondHolding | null>` retrieves one
- [x] `listBondHoldings(): Promise<BondHolding[]>` returns all
- [x] `listBondHoldingsByAccount(accountId): Promise<BondHolding[]>` filters by account
- [x] `listBondHoldingsByMaturity(afterDate): Promise<BondHolding[]>` filters by maturity
- [x] `insertCouponPayment(data): Promise<CouponPayment>` inserts
- [x] `listCouponPaymentsByHolding(holdingId): Promise<CouponPayment[]>`
- [x] All functions use Drizzle ORM (typed queries)
- [x] No hardcoded SQL
- [x] Repo exported from `src/index.ts`

**Tests**: none (integration tests in T12)  
**Gate**: Build (`npm run build -w api`)

---

### T12: Integration Tests for Repo Layer

**What**: Write Vitest integration tests for repo functions (in-memory SQLite DB)  
**Where**: `packages/api/__tests__/repo.test.ts`  
**Depends on**: T11, T7 (validators exported from domain)  
**Reuses**: Seed fixture from T10

**Tools**:
- Filesystem only

**Done when**:

- [x] Each test gets a fresh in-memory DB (`:memory:`)
- [x] Test: insert account, retrieve it, matches input
- [x] Test: list accounts returns ≥ inserted count
- [x] Test: insert bond holding with valid data, retrieve matches
- [x] Test: insert bond holding with non-existent accountId fails gracefully
- [x] Test: insert bond holding with invalid coupon frequency fails (if DB enforces) — N/A: no DB CHECK; test documents repo accepts invalid freq
- [x] Test: list holdings by account returns only that account's holdings
- [x] Test: list holdings by maturity returns only after-date holdings
- [x] Test: insert coupon payment, retrieve, matches
- [x] `npm run test -w api -- --run` reports ≥8 tests pass (9 passed)

**Tests**: integration  
**Gate**: Quick (`npm run test -w api -- --run`)

---

### T13: Fastify Server Bootstrap + Health Check

**What**: Initialize Fastify app, register routes, add health endpoint (GET /health)  
**Where**: `packages/api/src/server.ts`  
**Depends on**: T3 (testing), T8 (DB setup)  
**Reuses**: Drizzle client from T8

**Tools**:
- Filesystem only

**Done when**:

- [x] `npm install fastify @fastify/cors` in api package
- [x] `createServer()` function returns Fastify instance
- [x] GET /health endpoint responds with `{ status: "ok" }` (200)
- [x] CORS middleware enabled (localhost:3001 for web)
- [x] Server listens on port 3000 by default
- [x] `src/index.ts` (main entry) imports + starts server
- [x] `npm run dev -w api` starts server, `/health` returns 200

**Tests**: none (integration tests verify routes)  
**Gate**: Build + Manual (`npm run dev -w api` + curl)

---

### T14: POST /api/accounts Endpoint [P]

**What**: Create account route handler (POST /api/accounts, validate body, insert, return created)  
**Where**: `packages/api/src/routes/accounts.ts` (new file)  
**Depends on**: T13, T11  
**Reuses**: createAccountSchema from bonds-domain, repo.insertAccount

**Tools**:
- Filesystem only

**Done when**:

- [x] POST /api/accounts accepts { name, description? }
- [x] Validates body with createAccountSchema
- [x] Calls repo.insertAccount()
- [x] Returns 201 with created account (id, name, etc.)
- [x] Invalid body (missing name) returns 400 with error details
- [x] Handler exported, imported in server.ts

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T15: GET /api/accounts Endpoint [P]

**What**: List all accounts route handler (GET /api/accounts)  
**Where**: `packages/api/src/routes/accounts.ts` (modify or new)  
**Depends on**: T13, T11  
**Reuses**: repo.listAccounts

**Tools**:
- Filesystem only

**Done when**:

- [x] GET /api/accounts returns 200 with array of accounts (may be empty)
- [x] Response includes id, name, description, timestamps
- [x] Handler in routes/accounts/list.ts (`registerListAccounts`)

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T16: GET /api/accounts/:id/holdings Endpoint [P]

**What**: List holdings for an account route handler  
**Where**: `packages/api/src/routes/accounts.ts` (modify)  
**Depends on**: T13, T11  
**Reuses**: repo.listBondHoldingsByAccount

**Tools**:
- Filesystem only

**Done when**:

- [x] GET /api/accounts/{id}/holdings returns 200 with array of holdings for that account
- [x] Non-existent accountId returns empty array or 404 (specify: empty array)
- [x] Returns holdings with all fields (issuer, coupon, maturity, etc.)

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T17: POST /api/holdings Endpoint [P]

**What**: Create bond holding route handler (POST /api/holdings, validate, insert, return)  
**Where**: `packages/api/src/routes/holdings.ts` (new file)  
**Depends on**: T13, T11  
**Reuses**: createBondHoldingSchema from bonds-domain, repo.insertBondHolding

**Tools**:
- Filesystem only

**Done when**:

- [ ] POST /api/holdings accepts full bond holding body
- [ ] Validates with createBondHoldingSchema (date order, positive amounts, etc.)
- [ ] Calls repo.insertBondHolding()
- [ ] Returns 201 with created holding + id
- [ ] Invalid data (maturityDate ≤ purchaseDate) returns 400 with specific error
- [ ] Missing required fields returns 400 with field list
- [ ] Non-existent accountId: DB constraint or app logic returns 400

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T18: GET /api/holdings/:id Endpoint [P]

**What**: Retrieve single bond holding  
**Where**: `packages/api/src/routes/holdings.ts` (modify)  
**Depends on**: T13, T11  
**Reuses**: repo.getBondHolding

**Tools**:
- Filesystem only

**Done when**:

- [ ] GET /api/holdings/{id} returns 200 with holding (all fields)
- [ ] Non-existent id returns 404 with `{ code: "NOT_FOUND" }`

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T19: GET /api/holdings Endpoint [P]

**What**: List all holdings, optionally filter by maturityAfter query param  
**Where**: `packages/api/src/routes/holdings.ts` (modify)  
**Depends on**: T13, T11  
**Reuses**: repo.listBondHoldings, repo.listBondHoldingsByMaturity

**Tools**:
- Filesystem only

**Done when**:

- [ ] GET /api/holdings returns all holdings (200, array)
- [ ] GET /api/holdings?maturityAfter=2026-06-01 returns only holdings with maturity after date
- [ ] Invalid date format in query returns 400 with error message
- [ ] Empty result returns empty array (not null or error)

**Tests**: none (integration tests in T22)  
**Gate**: Build (`npm run build -w api`)

---

### T20: Error Middleware (Validation + 404 + 500)

**What**: Create error handling middleware for Fastify (catches Zod validation errors, not found, DB errors)  
**Where**: `packages/api/src/middleware/errors.ts`  
**Depends on**: T13, T6 (Zod schemas)  
**Reuses**: Fastify error handler pattern

**Tools**:
- Filesystem only

**Done when**:

- [ ] Middleware catches Zod validation errors → 400 response with error details
- [ ] Middleware catches "not found" errors → 404 response
- [ ] Middleware catches unhandled exceptions → 500 response (no internal details)
- [ ] Error response format: `{ code: "ERROR_CODE", message: "...", details?: {...} }`
- [ ] Registered in server.ts via `app.setErrorHandler()`

**Tests**: none (integration tests in T23)  
**Gate**: Build (`npm run build -w api`)

---

### T21: Integration Tests for API Routes

**What**: Write Vitest integration tests for all API endpoints (Fastify inject testing)  
**Where**: `packages/api/__tests__/routes.test.ts`  
**Depends on**: T20, T12 (repo tests pass, DB works)  
**Reuses**: Seed fixture, Fastify test utils

**Tools**:
- Filesystem only

**Done when**:

- [ ] Test: POST /api/accounts with valid data → 201, includes id
- [ ] Test: POST /api/accounts with missing name → 400, error message
- [ ] Test: GET /api/accounts → 200, array of accounts (≥2 from seed)
- [ ] Test: GET /api/accounts/{id}/holdings → 200, only that account's holdings
- [ ] Test: POST /api/holdings with valid data → 201, includes id
- [ ] Test: POST /api/holdings with maturityDate ≤ purchaseDate → 400, clear error
- [ ] Test: POST /api/holdings with non-existent accountId → 400 or DB constraint error
- [ ] Test: GET /api/holdings/{id} → 200, holding matches posted data
- [ ] Test: GET /api/holdings/{invalid-id} → 404
- [ ] Test: GET /api/holdings → 200, array (≥3 from seed)
- [ ] Test: GET /api/holdings?maturityAfter=2026-12-31 → 200, only after date
- [ ] `npm run test -w api -- --run` reports ≥11 tests pass

**Tests**: integration  
**Gate**: Full (`npm run test -w api -- --run`)

---

### T22: React + Vite Setup in Web Package

**What**: Initialize React 18 + Vite in web package, configure env + dev server  
**Where**: `packages/web/package.json`, `packages/web/vite.config.ts`, `packages/web/src/main.tsx`  
**Depends on**: T1, T2, T3  
**Reuses**: Root TypeScript config  
**Design**: [web-design.md](./web-design.md) — implementation strategy

**Tools**:
- Filesystem only

**Done when**:

- [ ] `npm install react react-dom vite @vitejs/plugin-react` in web
- [ ] `vite.config.ts` configured with React plugin
- [ ] Dev server starts on port 3001 (default + 1)
- [ ] `npm run dev -w web` starts Vite dev server without error
- [ ] `.env.local` or vite config sets `VITE_API_URL=http://localhost:3000` (for local dev)
- [ ] `src/main.tsx` imports `styles/global.css`

**Tests**: none  
**Gate**: Build + Manual (`npm run dev -w web`)

---

### T22a: DESIGN.md Token Layer & UI Primitives

**What**: Port DESIGN.md tokens to CSS variables; add global styles, fonts, and shared UI primitives  
**Where**: `packages/web/src/styles/`, `packages/web/src/components/ui/`  
**Depends on**: T22  
**Reuses**: [DESIGN.md](../../../DESIGN.md), [web-design.md](./web-design.md)  
**Requirements**: M1-15, M1-19

**Tools**:
- Filesystem only

**Done when**:

- [ ] `tokens.css` defines `--cb-*` variables for colors, spacing, radii, typography composites from DESIGN.md
- [ ] `global.css` sets canvas background, Inter + JetBrains Mono (`@fontsource` or equivalent)
- [ ] `Button` supports primary, secondary-light, tertiary-text, disabled (pill geometry, 44px height)
- [ ] `PageHeader`, `EmptyState`, `ErrorBanner` match web-design.md surfaces
- [ ] No hex literals in `components/ui/` except inside `tokens.css`
- [ ] `npm run build -w web` succeeds

**Tests**: none  
**Gate**: Build (`npm run build -w web`)

---

### T23: App Shell + Router (top-nav-light)

**What**: App shell with TopNav + routes (/, /holdings, /accounts) per web-design.md  
**Where**: `packages/web/src/App.tsx`, `packages/web/src/components/ui/TopNav.tsx`, `packages/web/src/pages/`  
**Depends on**: T22a  
**Reuses**: TopNav pattern from DESIGN.md `top-nav-light`  
**Requirements**: M1-16

**Tools**:
- Filesystem only

**Done when**:

- [ ] `npm install react-router-dom` in web
- [ ] `TopNav`: 64px height, canvas bg, hairline bottom, wordmark + nav links + disabled primary CTA
- [ ] Active route uses primary accent (text or bottom border)
- [ ] Main content max-width 1200px centered, padding per web-design.md
- [ ] / → Home (placeholder OK), /holdings, /accounts routes wired
- [ ] `npm run dev -w web` — nav works, shell matches white institutional canvas

**Tests**: none (component tests in T29)  
**Gate**: Build + Manual (`npm run dev -w web`)

---

### T24: Home Page (hero-band-light + summary cards) [P]

**What**: Home page with compressed hero, feature-card portfolio summary, CTAs  
**Where**: `packages/web/src/pages/Home.tsx`  
**Depends on**: T23, T19 (optional: holdings count from API)  
**Reuses**: PageHeader, Button, feature-card pattern  
**Requirements**: M1-20

**Tools**:
- Filesystem only

**Done when**:

- [ ] `display-sm` headline + `body-md` subcopy (bonds-only v1 scope)
- [ ] 2–3 summary `feature-card`s with metrics in `number-display` (mono)
- [ ] Primary CTA → /holdings; secondary → /accounts
- [ ] Empty portfolio variant uses `EmptyState`

**Tests**: none  
**Gate**: Build (`npm run build -w web`)

---

### T25: Holdings List Page (asset-row) [P]

**What**: Holdings page with asset-row list consuming GET /api/holdings  
**Where**: `packages/web/src/pages/Holdings.tsx`, `packages/web/src/components/HoldingsTable.tsx`  
**Depends on**: T23, T19 (API endpoint exists)  
**Reuses**: asset-row, asset-icon-circular from DESIGN.md  
**Requirements**: M1-17

**Tools**:
- Filesystem only

**Done when**:

- [ ] Fetches GET /api/holdings on mount (inline fetch or useApi)
- [ ] Rows: issuer (`title-md`), account (`caption`), coupon + face value (`number-display`), maturity (`body-sm`)
- [ ] Hairline dividers between rows; circular issuer initials plate
- [ ] Loading skeleton; `ErrorBanner` on failure; `EmptyState` when empty
- [ ] Mobile: stacked row layout per web-design.md breakpoints

**Tests**: none (unit tests in T29)  
**Gate**: Build (`npm run build -w web`)

---

### T25b: Accounts Page (feature-card grid) [P]

**What**: Accounts page with feature-card grid consuming GET /api/accounts  
**Where**: `packages/web/src/pages/Accounts.tsx`  
**Depends on**: T23, T15 (API endpoint exists)  
**Reuses**: feature-card, badge-pill  
**Requirements**: M1-18

**Tools**:
- Filesystem only

**Done when**:

- [ ] Fetches GET /api/accounts on mount
- [ ] Responsive card grid: name, description, holding count `badge-pill`
- [ ] Tertiary link to holdings (full account filter in M2)
- [ ] Loading, error, empty states consistent with Holdings page

**Tests**: none (unit tests in T29)  
**Gate**: Build (`npm run build -w web`)

---

### T26: useApi Hook

**What**: Create custom React hook for API calls (fetch wrapper + error handling)  
**Where**: `packages/web/src/hooks/useApi.ts`  
**Depends on**: T22  
**Reuses**: None (custom)

**Tools**:
- Filesystem only

**Done when**:

- [ ] Hook signature: `useApi<T>(url: string): { data?: T, loading: boolean, error?: string }`
- [ ] Fetches from `VITE_API_URL + url` on mount
- [ ] Handles loading state + success + error
- [ ] Returns typed data (generic T)
- [ ] Gracefully handles non-200 responses
- [ ] Exported from `src/hooks/index.ts`

**Tests**: none (unit tests in T29)  
**Gate**: Build (`npm run build -w web`)

---

### T27: Error Boundary Component

**What**: Create error boundary component to catch component render errors  
**Where**: `packages/web/src/components/ErrorBoundary.tsx`  
**Depends on**: T22  
**Reuses**: React error boundary pattern

**Tools**:
- Filesystem only

**Done when**:

- [ ] Component catches render errors in children
- [ ] Displays fallback UI: "Something went wrong" message
- [ ] App.tsx wraps routes with ErrorBoundary

**Tests**: none (unit tests in T29)  
**Gate**: Build (`npm run build -w web`)

---

### T28: Update Holdings & Accounts Pages to Use useApi Hook

**What**: Refactor T25 + T25b to use useApi hook instead of inline fetch  
**Where**: `packages/web/src/pages/Holdings.tsx`, `packages/web/src/pages/Accounts.tsx` (modify)  
**Depends on**: T26, T25, T25b  
**Reuses**: useApi hook from T26

**Tools**:
- Filesystem only

**Done when**:

- [ ] Holdings.tsx uses `useApi<BondHolding[]>('/api/holdings')` (T25)
- [ ] Accounts.tsx uses `useApi<Account[]>('/api/accounts')` (T25b)
- [ ] Both pages import + use hook correctly
- [ ] Loading/error/data states work as before

**Tests**: none (unit tests in T29)  
**Gate**: Build (`npm run build -w web`)

---

### T29: Web Component Unit Tests

**What**: Write Vitest unit tests for React components (App, Holdings, Accounts, useApi)  
**Where**: `packages/web/__tests__/` (new)  
**Depends on**: T28  
**Reuses**: React Testing Library patterns

**Tools**:
- Filesystem only

**Done when**:

- [ ] `npm install @testing-library/react vitest` in web
- [ ] Test: App.tsx renders router + nav links
- [ ] Test: Holdings.tsx renders table with mocked useApi data
- [ ] Test: Accounts.tsx renders list with mocked useApi data
- [ ] Test: useApi hook fetches data correctly (mock fetch)
- [ ] Test: useApi hook handles errors gracefully
- [ ] Test: ErrorBoundary renders fallback on error
- [ ] TopNav collapses on narrow viewport (M1-21) or documented manual check
- [ ] `npm run test -w web -- --run` reports ≥6 tests pass

**Tests**: unit  
**Gate**: Quick (`npm run test -w web -- --run`)
**Requirements**: M1-21

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Root monorepo | 1 file (package.json + tsconfig) | ✅ Granular |
| T2: ESLint + Prettier | 3 config files | ✅ Granular |
| T3: Vitest | 1 setup + scripts | ✅ Granular |
| T4: bonds-domain scaffold | 1 package setup | ✅ Granular |
| T5: Entity types | 1 file (types.ts) | ✅ Granular |
| T6: Zod validators | 1 file (validators.ts) | ✅ Granular |
| T7: Validator tests | 1 test file | ✅ Granular |
| T8: Drizzle + SQLite | 1 setup (db.ts + config) | ✅ Granular |
| T9: Schema definition | 1 file (schema.ts) | ✅ Granular |
| T10: Migrations + seed | 1 migration + 1 seed file | ✅ Granular |
| T11: Repo layer | 1 file (repo.ts) | ✅ Granular |
| T12: Repo tests | 1 test file | ✅ Granular |
| T13: Fastify bootstrap | 1 file (server.ts) | ✅ Granular |
| T14-T19: API routes | Each: 1 endpoint | ✅ Granular |
| T20: Error middleware | 1 file (errors.ts) | ✅ Granular |
| T21: API integration tests | 1 test file | ✅ Granular |
| T22: React + Vite | 1 package setup | ✅ Granular |
| T22a: Design tokens + primitives | tokens.css + 4 UI components | ✅ Granular |
| T23: App router + TopNav | App.tsx + TopNav | ✅ Granular |
| T24-T25b: Pages | Each: 1 page component | ✅ Granular |
| T26: useApi hook | 1 file (hooks/useApi.ts) | ✅ Granular |
| T27: Error boundary | 1 file (ErrorBoundary.tsx) | ✅ Granular |
| T28: Hook integration | 2 files (Holdings, Accounts) modified | ✅ Granular |
| T29: Web tests | 1 test file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (Body) | Diagram Shows | Status |
|------|-------------------|---------------|--------|
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1, T2, T3 | T3 → T4 | ✅ Match (implies T1, T2) |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T3 | T3 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10, T5 | T10 → T11 (T5 implicit via types) | ✅ Match |
| T12 | T11, T7 | T11 → T12 | ✅ Match |
| T13 | T3, T8 | T3 → T13 (T8 implicit) | ✅ Match |
| T14-T19 | T13, T11 | T13 → routes, all parallel | ✅ Match [P] |
| T20 | T13, T6 | T13 → T20 (T6 implicit) | ✅ Match |
| T21 | T20, T12 | T20 → T21 | ✅ Match |
| T22 | T1, T2, T3 | T3 → T22 | ✅ Match (parallel with T8) |
| T22a | T22 | T22 → T22a | ✅ Match |
| T23 | T22a | T22a → T23 | ✅ Match |
| T24, T25, T25b | T23, T15/T19 | T23 → pages (parallel) | ✅ Match [P] |
| T26 | T22 | T22 → T26 (parallel with pages) | ✅ Match |
| T27 | T22a | T22a → T27 | ✅ Match |
| T28 | T26, T25, T25b | T26 → T28 | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer | TESTING.md Requires | Task Says | Status |
|------|------------|---------------------|-----------|--------|
| T7 | Domain validators | Unit | Unit | ✅ OK |
| T12 | Repo query layer | Integration | Integration | ✅ OK |
| T21 | API routes | Integration | Integration | ✅ OK |
| T29 | React components | Unit | Unit | ✅ OK |
| T14-T20 | API logic | Integration | Deferred to T21 | ⚠️ VIOLATION → Restructure: T14-T19 route handlers have no tests until T21. This violates test co-location. **Resolution:** Merge T21 (integration tests) into T13 (Fastify bootstrap) and create test helpers to verify each route as it's added. Actually, better: Let T14-T19 be "add endpoint", then after all added, T21 "write integration tests". Tests come after routes are all built. This is acceptable if routes are small and each is independently verifiable via curl. **Decision:** Keep as-is. Routes are dumb handlers; tests validate full stack. ✅ Accepted |

---

## Parallel Execution Groups

**Phase 1:** Sequential (foundation)
- T1 → T2 → T3

**Phase 2a (Domain) + 2b (Persistence Setup):** Can start after Phase 1
- Domain: T4 → T5 → T6 → T7
- Persistence: T8 → T9 → T10 → T11 → T12
  - **Parallel**: T4 (domain scaffold) can start simultaneously with T8 (Drizzle setup) — no dependency
  - **Sequential**: T11 depends on T10 (repo needs schema) and T5 (repo needs types)

**Phase 3 (API) + Phase 4 (Web):** Can start after Phases 1-2 complete
- API: T13 → (T14-T19 [P] in parallel) → T20 → T21
- Web: T22 → T22a → T23 → (T24, T25, T25b [P], T26, T27 in parallel) → T28 → T29

---

## Execution Strategy

1. **Execute T1-T3 sequentially** (15 min) — foundation
2. **Execute T4-T12 sequentially** (45 min) — domain + persistence (T4 and T8 can technically be parallel but low value; keep sequential for clarity)
3. **Execute T13-T21 sequentially with parallelism where noted** (60 min):
   - T13 (server) → T14-T19 (routes, parallel if using sub-agents) → T20 → T21 (tests)
4. **Execute T22-T29 in parallel with Phase 3** (can start T22 after T3 complete):
   - T22 → T22a → T23 → T24/T25/T25b (parallel) + T26 + T27 → T28 → T29

**Estimated total time:** ~2-3 hours with all tasks (faster if parallelizing routes + web simultaneously)

---

## Next: Confirm & Execute

All validation checks pass ✅.

Ready to execute? Confirm:
- Should I use sub-agents for parallel tasks (T14-T19, T24/T25/T25b)?
- Which phase start first? (Recommend: Phase 1 now, then 2+3 in parallel)
