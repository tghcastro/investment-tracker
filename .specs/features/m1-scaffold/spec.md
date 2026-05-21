# M1 — Project Scaffold & Bond Domain Foundation Specification

## Problem Statement

We need a working, testable foundation to build bond holding and coupon tracking features. Currently, there's no runnable code—just design documents. We need a modular Node/TypeScript monorepo with persistence (SQLite), initial domain entities (Account, BondHolding, CouponPayment), and an API that can create and retrieve a bond holding.

## Goals

- [ ] Establish monorepo structure with isolated domain, API, and web packages
- [ ] Define bond domain entities with validation logic
- [ ] Set up SQLite persistence with migrations and seed data
- [ ] Create a working API endpoint to create and retrieve bond holdings
- [ ] Verify the architecture with a runnable integration test

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Full portfolio dashboard / charts | M1 shell lists holdings and accounts; analytics in later milestones |
| Bond CRUD forms in UI | API-only in M1; forms follow DESIGN.md `text-input` patterns in M2 |
| Coupon payment scheduling | Just the data model; scheduling logic deferred to M3 |
| Account management UI | API only; web UI follows in M2 |
| Docker or production deployment | Local dev environment is sufficient for M1 |
| Market data or pricing feeds | All data is user-entered (confirmed in AD-005) |
| Authentication or multi-user support | Out of scope entirely (see PROJECT.md) |

---

## User Stories

### P1: Project Scaffold ⭐ MVP

**User Story**: As a developer, I want a modular TypeScript monorepo structure so that I can build and test the domain, API, and UI independently.

**Why P1**: Without this, nothing else can run. The architecture must be in place before any domain code.

**Acceptance Criteria**:

1. WHEN I clone/pull the repo THEN I can run `npm install` at the root and all packages are linked
2. WHEN I run the API locally THEN it responds to a health-check endpoint (GET /health → `{ status: "ok" }`)
3. WHEN I list the directory structure THEN I see: `/packages/bonds-domain`, `/packages/api`, `/packages/web` (or equivalent)
4. WHEN I run a linter THEN no errors are reported across all packages
5. WHEN I run tests THEN the test runner executes successfully (even if test count is zero initially)

**Independent Test**: `npm install && npm run dev` starts the API; `curl http://localhost:3000/health` returns 200 with status ok.

**Implementation Notes**:
- Choose monorepo tool: npm workspaces (built-in, no extra dependency) or lerna (more control).
- Each package has its own `package.json`, TypeScript config, and linter rules.
- Root `package.json` defines shared scripts: `dev`, `build`, `lint`, `test`.

---

### P1: Bond Domain Model ⭐ MVP

**User Story**: As a developer, I want domain entities (Account, BondHolding, CouponPayment) with typed validation so that bond business logic is isolated from HTTP and storage layers.

**Why P1**: The domain model is the heart of the system. Everything else depends on correct entities and validation.

**Acceptance Criteria**:

1. WHEN I create an Account entity THEN it has properties: id, name, description, createdAt, updatedAt
2. WHEN I create a BondHolding entity THEN it has: id, accountId, issuer, isin, cusip, faceValue, couponRate, couponFrequency, maturityDate, purchaseDate, purchasePrice, updatedAt
3. WHEN I create a CouponPayment entity THEN it has: id, bondHoldingId, paymentDate, amount, recordedAt
4. WHEN I validate BondHolding with maturityDate before purchaseDate THEN validation fails with clear error
5. WHEN I validate BondHolding with faceValue ≤ 0 THEN validation fails
6. WHEN I validate CouponPayment with amount ≤ 0 THEN validation fails
7. WHEN I validate CouponPayment with paymentDate in the future THEN it is allowed (scheduled payment)

**Independent Test**: Can instantiate entities in memory, apply validators, and verify error messages. No database required.

**Implementation Notes**:
- Use TypeScript interfaces for entities; consider a validation library (e.g., Zod) for runtime checks.
- Validation is synchronous and returns clear error messages.
- Entities have no HTTP or database knowledge.

---

### P1: SQLite Persistence Layer ⭐ MVP

**User Story**: As a developer, I want migrations and a query layer for accounts, holdings, and payments so that data persists between restarts.

**Why P1**: Without persistence, we can't store anything. This is the contract between domain and storage.

**Acceptance Criteria**:

1. WHEN I run migrations THEN the database is created with tables: accounts, bond_holdings, coupon_payments
2. WHEN I inspect the schema THEN each table has the correct columns matching the domain entities
3. WHEN I insert an account record THEN I can query it back with all fields intact
4. WHEN I insert a bond holding for a non-existent account THEN the database enforces the foreign key constraint (or migration code prevents invalid inserts)
5. WHEN I seed the database with test data THEN I can query 2+ accounts and 3+ bond holdings from the fixture

**Independent Test**: Run migrations; seed fixture data; query and verify data matches inserted records.

**Implementation Notes**:
- Use an ORM (e.g., Drizzle, Prisma) or query builder (e.g., Knex) for SQLite.
- Migrations are version-controlled and idempotent.
- Fixture file includes at least 2 accounts and 3+ bond holdings with varied maturity dates.

---

### P1: API Create & Retrieve Bond Holding ⭐ MVP

**User Story**: As a developer, I want HTTP endpoints to create and retrieve a bond holding so that I can test the full stack from API to database.

**Why P1**: The first working slice. Proves the architecture: HTTP → validation → domain → persistence.

**Acceptance Criteria**:

1. WHEN I POST to /api/holdings with valid bond data THEN a 201 response includes the created holding with id
2. WHEN I GET /api/holdings/{id} THEN a 200 response returns the holding with all fields
3. WHEN I POST with invalid data (e.g., maturityDate before purchaseDate) THEN a 400 response explains the validation error
4. WHEN I GET a non-existent holding THEN a 404 response is returned
5. WHEN I POST with required fields missing THEN a 400 response lists missing fields
6. WHEN the database is down THEN the API returns a 500 with a clear error message (graceful degradation)

**Independent Test**: 
- `POST /api/holdings` with valid fixture data → verify 201 and returned id
- `GET /api/holdings/{id}` → verify returned data matches posted data
- `POST /api/holdings` with invalid data → verify 400 and error message mentions the problem
- `GET /api/holdings/999` → verify 404

**Implementation Notes**:
- Use Fastify or Express; prefer Fastify for performance and TypeScript ergonomics.
- Validation middleware uses the domain validators (Zod schemas or similar).
- Errors are structured: `{ code, message, details? }`.
- Use Swagger/OpenAPI for API documentation.

---

### P2: API List Accounts & Holdings

**User Story**: As a developer, I want endpoints to list accounts and list holdings by account so that I can query the portfolio without hardcoding IDs.

**Why P2**: Not MVP, but required for M2 (portfolio UI). Deferring to P2 keeps M1 focused on scaffold + basic CRUD.

**Acceptance Criteria**:

1. WHEN I GET /api/accounts THEN a 200 response returns an array of all accounts
2. WHEN I GET /api/accounts/{accountId}/holdings THEN a 200 response returns holdings for that account only
3. WHEN an account has no holdings THEN the response is an empty array (not null)
4. WHEN I GET /api/holdings?maturityAfter=2026-06-01 THEN only holdings maturing after that date are returned (optional filtering)

**Independent Test**: 
- Seed 2 accounts, 3 holdings spread across them
- GET /api/accounts → verify 2 accounts returned
- GET /api/accounts/{id}/holdings → verify correct holdings for that account

---

### P3: Web Shell (React SPA) — DESIGN.md UI

**User Story**: As a user, I want a calm, institutional-quality web app to view my bond portfolio so that the product feels trustworthy from the first screen — not a raw developer prototype.

**Why P3**: Establishes the web layer and visual system early. Full CRUD UI ships in M2; M1 delivers a styled shell that consumes the API and follows [`DESIGN.md`](../../../DESIGN.md) via [web-design.md](./web-design.md).

**Design reference**: [web-design.md](./web-design.md) (maps DESIGN.md tokens to pages and components).

**Acceptance Criteria**:

1. WHEN I run the web dev server THEN it starts on http://localhost (port 80)
2. WHEN I open the app THEN I see a `top-nav-light` shell (64px): wordmark, nav (Home, Holdings, Accounts), and a primary-styled "Add holding" control (disabled until M2)
3. WHEN I visit Home THEN I see a compressed `hero-band-light` headline, summary `feature-card`(s) with portfolio metrics in `number-display` (mono font), and navigation CTAs using `button-primary` / `button-secondary-light`
4. WHEN I visit Holdings THEN the app fetches GET /api/holdings and renders an `asset-row` list (issuer, account, coupon, maturity, face value) with hairline dividers — not an unstyled HTML table
5. WHEN I visit Accounts THEN the app fetches GET /api/accounts and renders a `feature-card` grid (name, description, holding count badge)
6. WHEN data is loading THEN skeleton or muted loading copy appears (no uncaught spinner crash)
7. WHEN the API is unreachable THEN an error band shows clear copy (`semantic-down` text on `surface-soft`) and the app does not white-screen
8. WHEN the portfolio is empty THEN an `EmptyState` card explains next steps with tertiary/primary CTAs per web-design.md
9. WHEN I inspect styles THEN colors and spacing come from CSS variables in `tokens.css` mapped from DESIGN.md — no ad-hoc hex in page components
10. WHEN I view on mobile (< 640px) THEN the top nav collapses to a hamburger pattern and holdings rows stack per DESIGN.md responsive rules

**Independent Test**:
- Start web and API dev servers
- Open http://localhost — confirm white canvas, Coinbase Blue (#0052ff) used only on primary CTA/nav accent
- Navigate Home → Holdings → Accounts; verify API data renders with mono numbers and pill/card geometry
- Stop API; verify error state on Holdings page

---

## Edge Cases

- WHEN a database migration fails THEN the application does not start; the error is clear about which migration failed
- WHEN an invalid coupon frequency is posted (e.g., "weekly") THEN validation rejects it with a message listing allowed values
- WHEN a bond holding references a deleted account THEN the query should handle the foreign key constraint gracefully
- WHEN the req body is malformed JSON THEN the API responds with 400 and "Invalid JSON"

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| M1-01 | P1: Project Scaffold | Design | Pending |
| M1-02 | P1: Project Scaffold (npm install & health check) | Design | Pending |
| M1-03 | P1: Project Scaffold (directory structure) | Design | Pending |
| M1-04 | P1: Project Scaffold (linting & testing) | Design | Pending |
| M1-05 | P1: Bond Domain Model (entities) | Design | Pending |
| M1-06 | P1: Bond Domain Model (validation) | Design | Pending |
| M1-07 | P1: SQLite Persistence (migrations & schema) | Design | Pending |
| M1-08 | P1: SQLite Persistence (seed data) | Design | Pending |
| M1-09 | P1: API Create Bond Holding | Design | Pending |
| M1-10 | P1: API Retrieve Bond Holding | Design | Pending |
| M1-11 | P1: API Validation & Error Handling | Design | Pending |
| M1-12 | P2: API List Accounts | Design | Pending |
| M1-13 | P2: API List Holdings by Account | Design | Pending |
| M1-14 | P3: React Shell & API Integration | Design | Pending |
| M1-15 | P3: DESIGN.md token layer (tokens.css) | Design | Pending |
| M1-16 | P3: top-nav-light app shell | Design | Pending |
| M1-17 | P3: Holdings asset-row list | Design | Pending |
| M1-18 | P3: Accounts feature-card grid | Design | Pending |
| M1-19 | P3: Button variants (primary/secondary/tertiary) | Design | Pending |
| M1-20 | P3: Home hero-band-light + summary cards | Design | Pending |
| M1-21 | P3: Responsive nav + holdings stack (mobile) | Design | Pending |

**Coverage:** 21 total; 11 P1 (MVP); 2 P2; 8 P3 (UI design + integration)

---

## Success Criteria

- [ ] After `npm install && npm run dev`, both API and web start without errors
- [ ] Web UI matches DESIGN.md via web-design.md (tokens, nav, holdings list, accounts grid)
- [ ] A developer can create a bond holding via POST /api/holdings and retrieve it via GET /api/holdings/{id}
- [ ] All linter and test commands pass (`npm run lint`, `npm run test`)
- [ ] The codebase enforces TypeScript strict mode with no `any` types in domain logic
- [ ] A new developer can clone the repo, run install, and have a working dev environment in < 10 minutes
