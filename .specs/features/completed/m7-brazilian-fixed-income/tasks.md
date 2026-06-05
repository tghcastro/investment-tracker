# M7 Tasks — Brazilian Fixed Income

**Design**: `.specs/features/completed/m7-brazilian-fixed-income/design.md`  
**Spec**: `.specs/features/completed/m7-brazilian-fixed-income/spec.md`  
**Status**: Shipped (2026-06-05) — T22 v2.0.0 release deferred  
**Depends on**: M5 + M6 complete

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — Domain & API** | T1–T10 | Schema, validators, CRUD routes | `npm run test -w @investment-tracker/api` |
| **P2 — Web CRUD** | T11–T17 | List, form, nav, routes | `npm run test -w @investment-tracker/web` |
| **P3 — Portfolio + v2 ship** | T18–T22 | Summary integration, docs, release | `npm run lint && npm run test` + tag |

**Suggested branches:** `m7-p1-api` → `m7-p2-web` → `m7-p3-ship`

---

## Task Breakdown

### T1 [P1]: Domain — BRFI types and Zod schemas

**Requirement**: M7-07, M7-08  
**Where**: `packages/bonds-domain/src/brFi.ts`, tests  
**Commit**: `feat(domain): brazilian fixed income validators`

---

### T2 [P1]: Schema — `br_fi_holdings` + migration

**Requirement**: M7-01  
**Depends on**: M5 holding_types seed  
**Commit**: `feat(api): br_fi_holdings schema`

---

### T3 [P1]: Repo — BRFI CRUD

**Requirement**: M7-01–M7-06  
**Depends on**: T2  
**Commit**: `feat(api): repo br-fi holdings`

---

### T4 [P1]: Routes — GET list + GET by id

**Requirement**: M7-04  
**Depends on**: T3  
**Commit**: `feat(api): GET br-fi holdings routes`

---

### T5 [P1]: Routes — POST create

**Requirement**: M7-01–M7-03, M7-09  
**Depends on**: T3, M6 account currencies  
**Commit**: `feat(api): POST br-fi holdings`

---

### T6 [P1]: Routes — PATCH + DELETE

**Requirement**: M7-05, M7-06  
**Depends on**: T3  
**Commit**: `feat(api): PATCH DELETE br-fi holdings`

---

### T7 [P1]: API integration tests

**Depends on**: T4–T6  
**Commit**: `test(api): br-fi holdings coverage`

---

### T8 [P2]: Portfolio summary — include BRFI

**Requirement**: M7-13, M7-14  
**Depends on**: T3, M6 FX  
**Commit**: `feat(api): portfolio summary includes br-fi`

---

### T9 [P2]: Account holdings count (optional)

**Requirement**: M7-10  
**Commit**: `feat(api): account stats multi holding type`

---

### T10 [P1]: API regression gate

**Gate**: `npm run test -w @investment-tracker/api`

---

### T11 [P2]: Web types + API hooks

**Requirement**: M7-04  
**Commit**: `feat(web): br-fi API types`

---

### T12 [P2]: Routes — BRFI pages in App.tsx

**Requirement**: M7-11  
**Commit**: `feat(web): br-fi routes`

---

### T13 [P2]: BrFiHoldings list page + table

**Requirement**: M7-04  
**Commit**: `feat(web): br-fi holdings list`

---

### T14 [P2]: BrFiForm + IndexingFields

**Requirement**: M7-02, M7-07  
**Commit**: `feat(web): br-fi holding form`

---

### T15 [P2]: BrFiFormPage create/edit

**Requirement**: M7-01, M7-05  
**Commit**: `feat(web): br-fi form page`

---

### T16 [P2]: TopNav — enable BRFI link

**Requirement**: M7-11, M7-12  
**Commit**: `feat(web): TopNav brazilian fixed income`

---

### T17 [P2]: Web tests

**Commit**: `test(web): br-fi UI coverage`

---

### T18 [P3]: Home — combined totals

**Requirement**: M7-13  
**Commit**: `feat(web): home includes br-fi totals`

---

### T19 [P3]: Full monorepo gate

**Gate**: `npm run lint && npm run test`

---

### T20 [P3]: Codebase docs update

**Where**: `.specs/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `docs/FRONTEND.md`  
**Commit**: `docs: v2 architecture and routes`

---

### T21 [P3]: Archive specs + ROADMAP/PROJECT/STATE

**Move**: `active/m5|m6|m7-*` → `completed/`  
**Commit**: `docs: complete M5-M7 move specs to completed`

---

### T22 [P3]: Release v2.0.0

**Requirement**: M7-15  
**Actions**: `scripts/investment-tracker-release.sh v2.0.0`  
**Commit**: tag only via release script

---

## Post-ship Gardening

- Run `npm run check:docs`
- Update `.specs/index.md` Last verified dates
- Close M5–M7 todos in STATE.md
