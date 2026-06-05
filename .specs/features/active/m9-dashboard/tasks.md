# M9 Tasks — Dashboard

**Design**: `.specs/features/active/m9-dashboard/design.md`  
**Spec**: `.specs/features/active/m9-dashboard/spec.md`  
**Status**: Approved — ready to execute  
**Depends on**: M8 complete  
**Release**: **v2.0.0** (declares v2 tag when P3 ships)

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — Domain & API** | T1–T10 | Forecast domain, repo, route, tests | `npm run test -w @investment-tracker/api` |
| **P2 — Web UI** | T11–T17 | Home dashboard, filters, types | `npm run test -w @investment-tracker/web` |
| **P3 — Docs & ship** | T18–T20 | Codebase docs, spec archive, monorepo gate | `npm run lint && npm run test && npm run check:docs` |

**Suggested branches:** `m9-p1-api` → `m9-p2-web` → `m9-p3-ship`

---

## Task Breakdown

### T1 [P1]: Domain — `dashboardForecast.ts`

**Requirement**: M9-09 … M9-13  
**Where**: `packages/bonds-domain/src/dashboardForecast.ts`, `index.ts`, `__tests__/dashboardForecast.test.ts`  
**What**: BRFI annual interest, anniversary dates, year buckets, allocation %, event merge helpers  
**Done when**: Unit tests cover all indexing types + missing indicator  
**Commit**: `feat(domain): dashboard forecast helpers`

---

### T2 [P1]: Domain — bond event helpers

**Requirement**: M9-11  
**Depends on**: T1  
**Where**: `dashboardForecast.ts`, tests  
**What**: Wrap coupon schedule into dated events within `[from, to]`  
**Commit**: `feat(domain): bond coupon forecast events`

---

### T3 [P1]: Repo — filter types + holding queries

**Requirement**: M9-05 … M9-08  
**Where**: `repo.ts`, tests  
**What**: `DashboardFilters`; extend BRFI list with `holdingTypeSlug`; validate account + slug  
**Commit**: `feat(api): dashboard filter scaffolding`

---

### T4 [P1]: Repo — `getDashboard`

**Requirement**: M9-01 … M9-16  
**Depends on**: T1–T3  
**Where**: `repo.ts`, `__tests__/repo.test.ts`  
**What**: Summary, allocations, yearly income/principal, upcoming events, warnings, FX  
**Commit**: `feat(api): repo getDashboard`

---

### T5 [P1]: Route — `GET /api/dashboard`

**Requirement**: M9-01 … M9-04  
**Depends on**: T4  
**Where**: `routes/dashboard/get.ts`, `server.ts`  
**Commit**: `feat(api): GET /api/dashboard route`

---

### T6 [P1]: API integration tests

**Requirement**: M9-01 … M9-16  
**Depends on**: T5  
**Where**: `__tests__/routes.test.ts`  
**Commit**: `test(api): dashboard integration`

---

### T7 [P1]: API regression gate

**Gate**: `npm run test -w @investment-tracker/api`

---

### T8 [P2]: Web — `ApiDashboard` types

**Requirement**: M9-17  
**Where**: `packages/web/src/types/api.ts`  
**Commit**: `feat(web): dashboard API types`

---

### T9 [P2]: Web — `dashboardUrl` + filter state

**Requirement**: M9-19, M9-20  
**Where**: `utils/dashboardUrl.ts`, tests  
**Commit**: `feat(web): dashboard URL filter helpers`

---

### T10 [P2]: Home — dashboard sections

**Requirement**: M9-17 … M9-21  
**Depends on**: T8, T9  
**Where**: `Home.tsx`, `Home.css`  
**What**: Replace 3 portfolio fetches with single dashboard fetch; allocation, forecasts, events  
**Commit**: `feat(web): Home dashboard sections`

---

### T11 [P2]: Home — filter bar

**Requirement**: M9-18, M9-19, M9-20  
**Depends on**: T10  
**Where**: `Home.tsx`, CSS  
**Commit**: `feat(web): dashboard filter controls`

---

### T12 [P2]: Web tests

**Requirement**: M9-17 … M9-21  
**Where**: `__tests__/home.test.tsx`, update `app.test.tsx`  
**Commit**: `test(web): dashboard Home UI`

---

### T13 [P2]: Web regression gate

**Gate**: `npm run test -w @investment-tracker/web`

---

### T14 [P3]: UX polish

**Requirement**: M9-22 … M9-24  
**Where**: `Home.tsx`, `Home.css`  
**Commit**: `feat(web): dashboard loading and empty states`

---

### T15 [P3]: Codebase docs

**Where**: `ARCHITECTURE.md`, `API-FIRST.md`, `STRUCTURE.md`, `docs/FRONTEND.md`  
**Commit**: `docs: M9 dashboard route and Home`

---

### T16 [P3]: Archive M9 + update STATE/ROADMAP/index

**Move**: `active/m9-dashboard/` → `completed/`  
**Commit**: `docs: complete M9 move spec to completed`

---

### T17 [P3]: Full monorepo gate

**Gate**: `npm run lint && npm run test && npm run check:docs`

---

## Post-ship

- Declare **v2.0.0** per AD-009 (release script + tag)
- Close M9 todos in `STATE.md`
