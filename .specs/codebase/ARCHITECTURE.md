# Architecture

**Analyzed:** 2026-05-20
**Status:** Pre-scaffold — architecture is **planned**, not yet implemented in code.

**Pattern:** Modular monolith (monorepo with separated domain, API transport, and web UI packages)

## High-Level Structure (planned)

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     repository     ┌──────────┐
│  web (React)│ ◄────────────────► │  api (Node) │ ◄────────────────► │  SQLite  │
│     SPA     │                    │   routes    │                    │   file   │
└─────────────┘                    └──────┬──────┘                    └──────────┘
                                          │
                                   ┌──────▼──────┐
                                   │ bonds domain │
                                   │ (entities,   │
                                   │  validation, │
                                   │  services)   │
                                   └─────────────┘
```

**Design intent (AD-002):** Domain logic (bond holdings, accounts, coupon payments) stays isolated from HTTP handlers and React components so future asset classes and broker adapters can plug in as modules.

## Identified Patterns (planned)

### Layered domain module

**Location:** Planned `packages/bonds` or `src/domain/bonds` (TBD at M1)
**Purpose:** Encapsulate bond-specific entities, validation, and business rules without HTTP or DB details leaking in.
**Implementation:** Entities (`Account`, `BondHolding`, `CouponPayment`), value objects (rates, dates), service layer orchestrating repositories.
**Example:** Not yet in codebase — specified in `.specs/project/ROADMAP.md` M1.

### Repository pattern for persistence

**Location:** Planned alongside domain or in `packages/db`
**Purpose:** Abstract SQLite access from domain services; enable test doubles and future DB migration.
**Implementation:** Interface in domain layer; SQLite/ORM implementation in infrastructure layer.
**Example:** Not yet in codebase.

### REST API as transport boundary

**Location:** Planned `packages/api` or `apps/api`
**Purpose:** Expose CRUD for accounts, holdings, coupon payments; map HTTP ↔ domain DTOs.
**Implementation:** Route handlers delegate to services; validation at boundary (request schemas).
**Example:** Not yet in codebase — M1 target: health check + create/retrieve bond via API.

### Manual data entry (no integration layer in v1)

**Location:** N/A in v1
**Purpose:** All bond terms and cash flows are user-entered; no market-data or broker sync pipeline.
**Implementation:** Form-driven CRUD only (AD-005).
**Example:** Documented in `.specs/project/PROJECT.md` out-of-scope list.

## Data Flow (planned)

### Create bond holding

```
User (web form)
  → POST /holdings (API route)
  → Request validation (schema)
  → BondHoldingService.create()
  → Domain validation (maturity after purchase, positive face value, etc.)
  → BondHoldingRepository.insert()
  → SQLite
  ← JSON response
  ← React updates list view
```

### Record coupon payment

```
User (web form)
  → POST /coupon-payments
  → CouponPaymentService.create(holdingId, amount, date)
  → Verify holding exists
  → CouponPaymentRepository.insert()
  → SQLite
  ← Income views aggregate by holding / period (M3)
```

### Portfolio summary (M2)

```
User (dashboard)
  → GET /portfolio/summary (or composed from holdings endpoints)
  → BondHoldingService.list(filter by account, maturity)
  → Aggregate face value, cost basis, maturity ladder
  ← JSON → React tables/charts
```

## Code Organization (planned)

**Approach:** Package-based modular monorepo — feature/domain packages with clear boundaries.

**Structure (target from ROADMAP M1):**

```
investment-tracker/
├── apps/ or packages/
│   ├── api/          # HTTP server, routes, middleware
│   ├── web/          # React SPA
│   └── bonds/        # Domain: entities, services, validation (shared types)
├── packages/
│   └── db/           # Schema, migrations, repository implementations (optional split)
└── .specs/           # Project & feature specs (observed)
```

**Module boundaries:**

| Module | Owns | Must not depend on |
| ------ | ---- | ------------------ |
| `bonds` (domain) | Entities, validation, service interfaces | React, HTTP framework |
| `api` | Routes, DTO mapping, HTTP errors | React |
| `web` | UI, client state, API client | Direct DB access |
| `db` | Migrations, ORM models, repository impl | React |

## Current State (observed)

No `apps/`, `packages/`, or `src/` directories exist. The only committed application-adjacent content is documentation:

- `.specs/project/PROJECT.md` — vision, scope, stack intent
- `.specs/project/ROADMAP.md` — M1–M4 milestones
- `.specs/project/STATE.md` — architecture decisions AD-001 through AD-005

Architecture docs should be **re-mapped after M1 scaffold** when real directory layout and sample flows exist in code.
