# State

**Last Updated:** 2026-05-23
**Current Work:** M3 coupon income & cash flows — spec approved; next: design (`.specs/features/m3-coupon-income/design.md`)

---

## Recent Decisions (Last 60 days)

### AD-001: v1 scope is bonds-only (2026-05-19)

**Decision:** First shippable version tracks bond holdings and coupon cash flows only; no stocks, live broker sync, or full net-worth dashboard.
**Reason:** Bonds are a well-bounded domain (issuer, coupon, maturity); validates architecture before expanding asset classes.
**Trade-off:** Product does not yet replace spreadsheets for equities or unified net worth.
**Impact:** Roadmap M1–M4 focus on bond entities; other capabilities live in Future Considerations.

### AD-002: Web + Node/TypeScript modular API (2026-05-19)

**Decision:** Web client with backend API; Node + TypeScript; modular packages separating domain from transport and UI.
**Reason:** User preference; supports incremental features and future broker adapters as modules.
**Trade-off:** More initial structure than a single-file app.
**Impact:** Scaffold should establish package boundaries early (e.g. `bonds` domain, `api`, `web`).

### AD-003: SQLite for v1 persistence (2026-05-19)

**Decision:** Use SQLite as the v1 database (single local file).
**Reason:** Simplest solo deploy, no separate DB server, aligns with low ops overhead.
**Trade-off:** Not ideal for multi-user hosted production without later migration path.
**Impact:** ORM/migrations target SQLite; consider abstraction if PostgreSQL is needed later.

### AD-004: React for web UI (2026-05-19)

**Decision:** React SPA for the frontend, consuming the backend API.
**Reason:** User preference; large ecosystem for forms, tables, and charts later.
**Trade-off:** Requires API + CORS/dev proxy setup in monorepo scaffold.
**Impact:** M1 scaffold includes a `web` package with React + TypeScript.

### AD-006: Web UI follows DESIGN.md (Coinbase-inspired) (2026-05-20)

**Decision:** All web UI uses the institutional design system in repo-root `DESIGN.md`, applied via `.specs/features/m1-scaffold/web-design.md` (CSS token layer, Inter/JetBrains Mono substitutes).
**Reason:** User-provided design spec; ensures calm financial-brand aesthetic from M1 shell onward.
**Trade-off:** No Tailwind/component library in M1; manual CSS variables. Licensed Coinbase fonts replaced with Inter + JetBrains Mono.
**Impact:** Web tasks T22a–T29 reference web-design.md; P3 spec requirements M1-15–M1-21 added.

### AD-005: Manual bond data entry in v1 (2026-05-19)

**Decision:** All bond holdings, terms, and coupon records are entered manually by the user; no market-data or broker feeds in v1.
**Reason:** Keeps v1 scope small and avoids API cost/complexity.
**Trade-off:** No live prices or auto-reconciliation; user maintains accuracy.
**Impact:** UI is form-driven CRUD; no pricing service module in M1–M3.

### AD-007: Docker deployment and release automation (2026-05-23)

**Decision:** Ship api + web as separate Docker images; local stack via `docker compose`; releases via `scripts/investment-tracker-release.sh` (git tag, GitHub release, Docker Hub push).
**Reason:** Repeatable deploys without manual build/push steps; nginx web image proxies `/api/` to api container.
**Trade-off:** Two images to version and pull; SQLite still file-backed (`./data` volume locally).
**Impact:** `docker/`, `docker-compose.yml`, `Makefile`, Hub repo `tghcastro/investment-tracker` with tags `api-<version>` and `web-<version>`.

### AD-008: M4 scope is backup/restore + UX polish, not CSV import (2026-05-23)

**Decision:** M4 delivers a settings/backup page (version, DB path, backup download, restore) and remaining UX polish. Spreadsheet import moves to Future Considerations.
**Reason:** Docker prod deploy makes data safety the priority before v1 declaration; import can follow after core coupon flows (M3).
**Trade-off:** Users still enter holdings manually until import is built later.
**Impact:** ROADMAP M4, PROJECT.md constraints, INTEGRATIONS.md, m2-core out-of-scope table aligned; M4 spec not yet written.

---

## Active Blockers

_None._

---

## Lessons Learned

_None yet._

---

## Quick Tasks Completed

| #   | Description              | Date       | Commit | Status  |
| --- | ------------------------ | ---------- | ------ | ------- |
| —   | —                        | —          | —      | —       |

---

## Deferred Ideas

- [ ] Spreadsheet import (CSV templates matching common layouts) — Future Considerations; was scoped to M4, moved out per AD-008 (2026-05-23)
- [ ] Broker adapter interface for future sync — Captured during: project init
- [ ] Yield-to-maturity / duration calculators — Captured during: project init

---

## Todos

- [x] Map codebase (`/tlc-spec-driven map codebase`) — pre-scaffold baseline in `.specs/codebase/` (2026-05-20); re-map after M1
- [x] Specify first feature: M1 project scaffold — `/.specs/features/m1-scaffold/spec.md` (2026-05-20)
- [x] Design M1 — `/.specs/features/m1-scaffold/design.md` (2026-05-20)
- [x] Create tasks for M1 — `/.specs/features/m1-scaffold/tasks.md` (2026-05-20)
- [x] Implement T11 — repo query layer (`packages/api/src/repo.ts`) (2026-05-20)
- [x] Implement T12 — repo integration tests (`packages/api/__tests__/repo.test.ts`, 9 tests) (2026-05-20)
- [x] Implement T13 — Fastify bootstrap + GET /health (`packages/api/src/server.ts`) (2026-05-20)
- [x] Implement T14 — POST /api/accounts (`packages/api/src/routes/accounts/post.ts`; `list.ts`/`holdings.ts` stubs for T15/T16) (2026-05-20)
- [x] Implement T15 — GET /api/accounts (`packages/api/src/routes/accounts/list.ts`) (2026-05-20)
- [x] Implement T16 — GET /api/accounts/:id/holdings (`packages/api/src/routes/accounts/holdings.ts`) (2026-05-20)
- [x] Implement T17 — POST /api/holdings (`packages/api/src/routes/holdings/post.ts`; `list.ts`/`get-by-id.ts` stubs for T18/T19; validators `accountId`/`bondHoldingId` positive int strings; API `couponRate` % in body, decimal in DB) (2026-05-20)
- [x] Implement T19 — GET /api/holdings (`packages/api/src/routes/holdings/list.ts`; optional `maturityAfter` YYYY-MM-DD filter) (2026-05-20)
- [x] Web application design — `/.specs/features/m1-scaffold/web-design.md` from DESIGN.md (2026-05-20)
- [x] Implement T20 — API error middleware (`packages/api/src/middleware/errors.ts`) (2026-05-20)
- [x] Implement T21 — API route integration tests (`packages/api/__tests__/routes.test.ts`, 11 tests) (2026-05-20)
- [x] Implement T22 — React + Vite web scaffold (`packages/web/`) (2026-05-20)
- [x] Implement T22a — DESIGN.md tokens + UI primitives (`packages/web/src/styles/`, `packages/web/src/components/ui/`) (2026-05-21)
- [x] Implement T23 — App shell + TopNav + router (`packages/web/src/App.tsx`, placeholder pages) (2026-05-21)
- [x] Implement T24 — Home page (hero + summary cards, useApi, EmptyState) (2026-05-21)
- [x] Implement T25 — Holdings list page + HoldingsTable (2026-05-21)
- [x] Implement T25b — Accounts page (feature-card grid) (2026-05-21)
- [x] Implement T26 — useApi hook (2026-05-21)
- [x] Implement T27 — ErrorBoundary (2026-05-21)
- [x] Implement T28 — Wire Holdings/Accounts to useApi (2026-05-21)
- [x] Implement T29 — Web component unit tests (8 tests, vitest + RTL) (2026-05-21)
- [x] Specify M2 — bond holdings & accounts CRUD — `.specs/features/m2-core/spec.md` (2026-05-21)
- [x] Approve M2 spec (2026-05-22)
- [x] Design M2 — `.specs/features/m2-core/design.md` (2026-05-22)
- [x] Create tasks for M2 — `.specs/features/m2-core/tasks.md` (2026-05-22)
- [x] Implement M2 P1 — backend API T1–T17 (2026-05-22)
- [x] Implement M2 P2 — web CRUD T18–T25 (2026-05-22)
- [x] Implement M2 P3 — web polish T26–T29 (2026-05-23)
- [x] Docker deployment + release script — PR #9, `scripts/investment-tracker-release.sh` (2026-05-23)
- [x] Release v0.1.0 + v0.1.1 — Hub images, GitHub releases; prod compose; prod seed fix (PR #10–#11) (2026-05-23)
- [x] Update M4 roadmap scope — backup/restore + UX polish; import deferred (AD-008) (2026-05-23)
- [x] Specify M3 — coupon income & cash flows — `.specs/features/m3-coupon-income/spec.md` (2026-05-23)
- [x] Approve M3 spec (2026-05-23)
- [ ] Design M3 — `.specs/features/m3-coupon-income/design.md`
- [ ] Create tasks for M3 — `.specs/features/m3-coupon-income/tasks.md`
- [ ] Specify M4 — v1 polish (after M3)

---

## Open Questions

- **Hosting:** Docker images on Hub + compose for local/VPS deploy (see AD-007). Cloud multi-instance or managed DB still TBD.
- ~~**API style:** REST (default) vs tRPC~~ — **Resolved:** REST + Fastify (M1 implementation, AD-002)
