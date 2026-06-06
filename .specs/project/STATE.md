# State

**Last Updated:** 2026-06-06
**Current Work:** **M10–M16** planned in [ROADMAP.md](ROADMAP.md) — per-milestone releases **v1.2.0–v1.8.0** (AD-011). Next implement: **M10**.

### AD-010: API-first business rules — web UI only (2026-05-31)

**Decision:** All **business rules** (calculations, forecasts, FX, coupon estimates, portfolio aggregates, future yield/accrual) live in `bonds-domain` + **API**. Web applies **UI rules** only (show/hide, enable/disable, refetch, format). APIs return original + derived fields on lists/details, or dedicated preview/forecast endpoints when appropriate.
**Reason:** Single source of truth; avoid SPA/API drift; currency discussion generalized to whole product.
**Trade-off:** More API fields and endpoints; slightly larger payloads.
**Impact:** [API-FIRST.md](../codebase/API-FIRST.md); M6.1; migration backlog (`CouponPaymentsSection` coupon estimate, etc.); ARCHITECTURE / FRONTEND / CONVENTIONS / AGENTS.

---

## Recent Decisions (Last 60 days)

### AD-011: Per-milestone versioning post-v1.1.0 (2026-06-06)

**Decision:** After **v1.1.0** (M5–M9 bundle), each new milestone ships as its **own semver tag** on the **1.x** line. No multi-milestone release bundles unless explicitly re-decided.
**Reason:** User wants incremental shippable versions (M10–M16); smaller UAT gates; faster feedback.
**Trade-off:** More release overhead (7 tags vs one); shared infra (Tools page) still sequenced M10 first.
**Impact:** [ROADMAP.md](ROADMAP.md) M10–M16; supersedes AD-009 bundled v2.0.0 intent for **future** work only (v1.1.0 already shipped).

### AD-012: M10–M16 planning decisions (2026-06-06)

**Decision:** (1) "Add currency" = **currency quotes** modal, UI-only continue-creating. (2) BRFI `couponFrequency` = bonds enum; UI **Mensal / Trimestral / Semestral / Anual**; migration default `annual`. (3) Index-linked coupon math uses **indicator history accumulated over each coupon period** (per M11 spec examples), not latest-value shortcut. (4) DB file picker: **prompt each session** — no persisted path across API restarts. (5) DB picker = app feature (DEV + PROD), not Docker-only. (6) Ship order: M10 → M11 → M13 → M14 → M15 → M16 → **M12 last** (v1.8.0). (7) **Retrocompatibility:** additive migrations only; existing DBs/backups must upgrade in place.
**Reason:** User confirmations on open questions.
**Trade-off:** Session DB picker means re-upload after API restart; period-based indicator math needs M8 history gaps handled gracefully (null estimate).
**Impact:** M11 domain/API design; M12 no persistence layer; release map in ROADMAP.

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

**Decision:** All web UI uses the institutional design system in repo-root `DESIGN.md`, applied via `.specs/features/completed/m1-scaffold/web-design.md` (CSS token layer, Inter/JetBrains Mono substitutes).
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

### AD-009: v2 scope — M5–M9, single release at v2.0.0 (2026-05-29, expanded 2026-06-05)

**Decision:** Post-v1 work is milestones M5–M9 in order: holdings framework, multi-currency, Brazilian fixed income, market indicators, dashboard. **v2.0.0** is declared only after **M9** completes (not per-milestone tags). M5–M9 shipped in code (2026-06-05); release tag pending manual validation.
**Reason:** Features form one cohesive v2 (multi-type + FX + BRFI + benchmarks + dashboard); user confirmed bundled release including M8/M9.
**Trade-off:** No v2 tag until dashboard ships; larger release gate.
**Impact:** Active specs M8/M9 in `.specs/features/active/`; ROADMAP M5–M9; release + archive when M9 gate passes.

---

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

- [ ] Specify M10 — navigation & Tools shell → [ROADMAP](ROADMAP.md#m10--navigation--tools-shell)
- [ ] Specify M11 — BRFI coupon engine
- [ ] Specify M12 — database file picker
- [ ] Specify M13 — CSV currency quotes import
- [ ] Specify M14 — CSV market indicators import
- [ ] Specify M15 — compound & simple interest calculators
- [ ] Specify M16 — million goal calculator
- [x] Approve M8 spec → Design + tasks (2026-06-05)
- [x] Execute M8 P1 — domain + API [tasks](../features/completed/m8-market-indicators/tasks.md) (2026-06-05)
- [x] Execute M8 P2 — web UI (2026-06-05)
- [x] Execute M8 P3 — docs + archive (2026-06-05)
- [x] Specify M8 — `.specs/features/completed/m8-market-indicators/spec.md` (2026-06-05)
- [x] Approve M9 spec → Design + tasks (2026-06-05)
- [x] Specify M9 — `.specs/features/completed/m9-dashboard/spec.md` (2026-06-05)
- [x] Execute M9 P1 — domain + API [tasks](../features/completed/m9-dashboard/tasks.md) (2026-06-05)
- [x] Execute M9 P2 — web UI (2026-06-05)
- [x] Execute M9 P3 — docs + archive (2026-06-05)
- [x] v1.1.0 release — M5–M9 bundle (2026-06-06); supersedes planned v2.0.0 tag name (AD-009 scope unchanged)
- [x] Approve M5 spec → Execute P1 [tasks](../features/completed/m5-holdings-framework/tasks.md)
- [x] Implement M5 — holdings framework on `m5-holdings-framework` (2026-05-29)
- [x] Execute M6 — multi-currency on `m6-multi-currency` (2026-05-29)
- [x] Approve M6 spec → shipped (2026-05-29)
- [x] Specify M6.1 — `.specs/features/completed/m6.1-multi-currency-follow-ups/` (2026-05-31)
- [x] Approve M6.1 spec → Execute P1 [tasks](../features/completed/m6.1-multi-currency-follow-ups/tasks.md)
- [x] Implement M6.1 — multi-currency follow-ups (2026-05-31)
- [x] Approve M7 spec → shipped (2026-06-05)
- [x] Implement M7 — Brazilian fixed income on `m7-p1-api` (2026-06-05)
- [x] Specify M5 — `.specs/features/completed/m5-holdings-framework/` (2026-05-29)
- [x] Specify M6 — `.specs/features/completed/m6-multi-currency/` (2026-05-29)
- [x] Specify M7 — `.specs/features/active/m7-brazilian-fixed-income/` (2026-05-29)
- [x] Map codebase (`/tlc-spec-driven map codebase`) — pre-scaffold baseline in `.specs/codebase/` (2026-05-20); re-map after M1
- [x] Specify first feature: M1 project scaffold — `/.specs/features/completed/m1-scaffold/spec.md` (2026-05-20)
- [x] Design M1 — `/.specs/features/completed/m1-scaffold/design.md` (2026-05-20)
- [x] Create tasks for M1 — `/.specs/features/completed/m1-scaffold/tasks.md` (2026-05-20)
- [x] Implement T11 — repo query layer (`packages/api/src/repo.ts`) (2026-05-20)
- [x] Implement T12 — repo integration tests (`packages/api/__tests__/repo.test.ts`, 9 tests) (2026-05-20)
- [x] Implement T13 — Fastify bootstrap + GET /health (`packages/api/src/server.ts`) (2026-05-20)
- [x] Implement T14 — POST /api/accounts (`packages/api/src/routes/accounts/post.ts`; `list.ts`/`holdings.ts` stubs for T15/T16) (2026-05-20)
- [x] Implement T15 — GET /api/accounts (`packages/api/src/routes/accounts/list.ts`) (2026-05-20)
- [x] Implement T16 — GET /api/accounts/:id/holdings (`packages/api/src/routes/accounts/holdings.ts`) (2026-05-20)
- [x] Implement T17 — POST /api/holdings (`packages/api/src/routes/holdings/post.ts`; `list.ts`/`get-by-id.ts` stubs for T18/T19; validators `accountId`/`bondHoldingId` positive int strings; API `couponRate` % in body, decimal in DB) (2026-05-20)
- [x] Implement T19 — GET /api/holdings (`packages/api/src/routes/holdings/list.ts`; optional `maturityAfter` YYYY-MM-DD filter) (2026-05-20)
- [x] Web application design — `/.specs/features/completed/m1-scaffold/web-design.md` from DESIGN.md (2026-05-20)
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
- [x] Specify M2 — bond holdings & accounts CRUD — `.specs/features/completed/m2-core/spec.md` (2026-05-21)
- [x] Approve M2 spec (2026-05-22)
- [x] Design M2 — `.specs/features/completed/m2-core/design.md` (2026-05-22)
- [x] Create tasks for M2 — `.specs/features/completed/m2-core/tasks.md` (2026-05-22)
- [x] Implement M2 P1 — backend API T1–T17 (2026-05-22)
- [x] Implement M2 P2 — web CRUD T18–T25 (2026-05-22)
- [x] Implement M2 P3 — web polish T26–T29 (2026-05-23)
- [x] Docker deployment + release script — PR #9, `scripts/investment-tracker-release.sh` (2026-05-23)
- [x] Release v0.1.0 + v0.1.1 — Hub images, GitHub releases; prod compose; prod seed fix (PR #10–#11) (2026-05-23)
- [x] Update M4 roadmap scope — backup/restore + UX polish; import deferred (AD-008) (2026-05-23)
- [x] Specify M3 — coupon income & cash flows — `.specs/features/completed/m3-coupon-income/spec.md` (2026-05-23)
- [x] Approve M3 spec (2026-05-23)
- [x] Design M3 — `.specs/features/completed/m3-coupon-income/design.md` (2026-05-23)
- [x] Approve M3 design (2026-05-23)
- [x] Create tasks for M3 — `.specs/features/completed/m3-coupon-income/tasks.md` (2026-05-23)
- [x] Approve M3 tasks → Execute P1 (2026-05-23)
- [x] Implement M3 P1 — backend API T1–T14 (2026-05-23)
- [x] Implement M3 P2 — web payments T15–T19 (2026-05-23)
- [x] Implement M3 P3 — income + ship T20–T22 (2026-05-23)
- [x] Approve M4 spec (2026-05-23)
- [x] Approve M4 design (2026-05-23)
- [x] Create tasks for M4 — `.specs/features/completed/m4-v1-polish/tasks.md` (2026-05-23)
- [x] Approve M4 tasks → Execute P1 (2026-05-28)
- [x] Implement M4 P1 — backup API T1–T13 on `m4-p1-backup-api` (2026-05-28)
- [x] Implement M4 P2 — settings UI T14–T18 on `m4-p2-settings` (2026-05-28)
- [x] Implement M4 P3 — UX polish T19–T23 (2026-05-28)

---

## Open Questions

- **M15 chart library:** No chart dep in web today — pick at M15 design (e.g. lightweight SVG vs add `recharts`). Deferred to M15 spec.
- **Hosting:** Docker images on Hub + compose for local/VPS deploy (see AD-007). Cloud multi-instance or managed DB still TBD.
- ~~**M10 "Add currency"**~~ — **Resolved (AD-012):** currency quotes modal
- ~~**M11 coupon frequency**~~ — **Resolved (AD-012):** bonds enum + PT labels; default `annual` migration
- ~~**M11 index math**~~ — **Resolved (AD-012):** period accumulation from indicator history
- ~~**M12 persistence / Docker / ship order**~~ — **Resolved (AD-012):** session-only; app-level; ships last
- ~~**Version series**~~ — **Resolved (AD-012):** 1.x through v1.8.0
- ~~**API style:** REST (default) vs tRPC~~ — **Resolved:** REST + Fastify (M1 implementation, AD-002)
