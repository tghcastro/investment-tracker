# M11 Tasks — BRFI Coupon Engine

**Design**: `.specs/features/active/m11-brfi-coupon-engine/design.md`  
**Spec**: `.specs/features/active/m11-brfi-coupon-engine/spec.md`  
**Status**: Draft (2026-06-11) — pending approval  
**Depends on**: M7, M8, M9 complete  
**Target release**: **v1.3.0** (AD-011)

---

## 3-Phase Split

| Phase                            | Tasks   | Scope                                                        | Gate                                                                                          |
| -------------------------------- | ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **P1 — Domain, migration & API** | T1–T11  | Migration 009, coupon engine, BRFI CRUD, dashboard repo path | `npm run test -w @investment-tracker/bonds-domain && npm run test -w @investment-tracker/api` |
| **P2 — Web UI**                  | T12–T16 | BrFiForm frequency, interest estimate display                | `npm run test -w @investment-tracker/web`                                                     |
| **P3 — Verify, docs & ship**     | T17–T20 | Edge-case tests, codebase docs, monorepo gate                | `npm run lint && npm run test && npm run check:docs`                                          |

**Suggested branches:** `m11-p1-api` → `m11-p2-web` → `m11-p3-ship`

---

## Task Breakdown

### T1 [P1]: Migration `009_*` — `coupon_frequency` column

**Requirement**: M11-007, M11-NFR-002  
**Where**: `packages/api/src/migrations/009_br_fi_coupon_frequency.sql`, `schema.ts`, migration runner test  
**What**: `ALTER TABLE br_fi_holdings ADD COLUMN coupon_frequency text NOT NULL DEFAULT 'annual'`; Drizzle column on `brFiHoldings`  
**Done when**: Migration runs on empty DB and on DB at migration 008; existing BRFI rows read as `annual`  
**Commit**: `feat(api): migration 009 br_fi coupon_frequency`

---

### T2 [P1]: Domain — `couponFrequency` on BRFI type + Zod

**Requirement**: M11-008  
**Depends on**: T1  
**Where**: `packages/bonds-domain/src/types.ts`, `brFi.ts`, `__tests__/brFi.test.ts` (or extend existing)  
**What**: Add `couponFrequency: CouponFrequency` to `BrFiHolding`; extend create/update schemas with bonds enum; default `annual` on create  
**Done when**: Domain validation tests accept all four frequencies; reject invalid enum  
**Commit**: `feat(domain): brfi couponFrequency validation`

---

### T3 [P1]: Domain — `brFiCouponEngine.ts` scaffolding

**Requirement**: M11-005, M11-NFR-004  
**Depends on**: T2  
**Where**: `packages/bonds-domain/src/brFiCouponEngine.ts`, `index.ts`, `__tests__/brFiCouponEngine.test.ts`  
**What**: Period bounds from coupon schedule; `indicatorAccumulationFactor`; `selectIndicatorValuesForPeriod` (daily + monthly cadence, duplicate-date rule); export types  
**Done when**: Unit tests cover period selection, month-gap → null, empty daily → null  
**Commit**: `feat(domain): brfi coupon period helpers`

---

### T4 [P1]: Domain — per-indexing amount functions + Examples A–D

**Requirement**: M11-001, M11-002, M11-003, M11-004, M11-006  
**Depends on**: T3  
**Where**: `brFiCouponEngine.ts`, tests  
**What**: `brFiInterestCentsForPeriod` for PRE_FIXED, IPCA_SPREAD, CDI_PERCENTAGE, SELIC; dedicated test cases for Examples A–D (±1 cent)  
**Done when**: All four indexing types pass spec worked examples  
**Commit**: `feat(domain): brfi per-period interest formulas`

---

### T5 [P1]: Domain — next coupon + event list helpers

**Requirement**: M11-009, M11-010, M11-011  
**Depends on**: T4  
**Where**: `brFiCouponEngine.ts`, `dashboardForecast.ts`, tests  
**What**: `expectedBrFiInterestAmountCents`, `brFiInterestEvents`; stop exporting annual shortcut from forecast path (deprecate/remove `generateBrFiInterestDates` usage)  
**Done when**: Semi-annual pre-fixed holding yields two dated events with Example A amount; next-coupon helper returns first future date amount  
**Commit**: `feat(domain): brfi coupon schedule and estimate helpers`

---

### T6 [P1]: Repo — BRFI CRUD persistence for `couponFrequency`

**Requirement**: M11-007, M11-008  
**Depends on**: T1, T2  
**Where**: `packages/api/src/repo.ts`, `__tests__/repo.test.ts`  
**What**: Map `coupon_frequency` on insert/update/select; POST/PATCH accept field; GET returns `couponFrequency`  
**Done when**: Repo tests create/update each frequency; migrated rows default `annual`  
**Commit**: `feat(api): brfi couponFrequency CRUD`

---

### T7 [P1]: Repo — indicator history load + `expectedInterestAmountCents`

**Requirement**: M11-009, M11-NFR-001, M11-NFR-005  
**Depends on**: T5, T6  
**Where**: `repo.ts`, `routes/br-fi-holdings/serialize.ts`, `__tests__/repo.test.ts`  
**What**: Batch/query indicator values for holding; compute `expectedInterestAmountCents` on list/get via domain; pre-fixed Example A → `60_000`; sparse history → `null`  
**Done when**: Serialize tests mirror bond `expectedCouponAmountCents` pattern  
**Commit**: `feat(api): brfi expectedInterestAmountCents on GET`

---

### T8 [P1]: Repo — dashboard BRFI forecast path

**Requirement**: M11-010, M11-011  
**Depends on**: T5, T7  
**Where**: `repo.ts` (`getDashboard`), `__tests__/repo.test.ts`  
**What**: Replace `brFiAnnualInterestCents` + `generateBrFiInterestDates` with `brFiInterestEvents`; per-date amounts; omit/null events without computable index history  
**Done when**: Dashboard test — semi-annual pre-fixed two events/year; CDI monthly fixture shows varying monthly amounts  
**Commit**: `feat(api): dashboard brfi per-period coupons`

---

### T9 [P1]: API — BRFI route integration tests

**Requirement**: M11-008, M11-009  
**Depends on**: T7  
**Where**: `packages/api/__tests__/routes.test.ts`  
**What**: HTTP POST/PATCH with `couponFrequency`; GET list/detail includes `expectedInterestAmountCents`  
**Commit**: `test(api): brfi coupon frequency and estimate routes`

---

### T10 [P1]: API — migration + dashboard route regression

**Requirement**: M11-007, M11-010  
**Depends on**: T8, T9  
**Where**: migration test fixture, `routes.test.ts` or `repo.test.ts`  
**What**: Restore pre-009 backup → forward migrate; `/api/dashboard` BRFI INTEREST events at correct frequency  
**Commit**: `test(api): m11 migration and dashboard brfi events`

---

### T11 [P1]: P1 regression gate

**Requirement**: M11-NFR-007  
**Gate**: `npm run test -w @investment-tracker/bonds-domain && npm run test -w @investment-tracker/api`

---

### T12 [P2]: Web — API types for frequency + estimate

**Requirement**: M11-012, M11-013  
**Where**: `packages/web/src/types/api.ts`  
**What**: Extend `ApiBrFiHolding` with `couponFrequency`, `expectedInterestAmountCents: number | null`  
**Commit**: `feat(web): brfi coupon API types`

---

### T13 [P2]: Web — `BrFiForm` coupon frequency select

**Requirement**: M11-012  
**Depends on**: T12  
**Where**: `packages/web/src/components/BrFiForm.tsx`, `brFiLabels.ts`, `BrFiFormPage.tsx`, `__tests__/brFiHoldings.test.tsx`  
**What**: Select with PT labels Monthly / Quarterly / Semi-annual / Annual; default `annual` on create; edit reflects stored value  
**Done when**: Form test submits `couponFrequency` in POST/PATCH body  
**Commit**: `feat(web): BrFiForm coupon frequency field`

---

### T14 [P2]: Web — interest payments estimate banner

**Requirement**: M11-013, M11-NFR-001  
**Depends on**: T12  
**Where**: `packages/web/src/components/BrFiInterestPaymentsSection.tsx`, `__tests__/brFiInterestPaymentsSection.test.tsx`  
**What**: Display formatted `expectedInterestAmountCents` when non-null; neutral/omit when null; mirror `CouponPaymentsSection` UX  
**Done when**: Component test with mocked holding JSON  
**Commit**: `feat(web): brfi interest payment estimate display`

---

### T15 [P2]: Web regression tests

**Requirement**: M11-012, M11-013  
**Depends on**: T13, T14  
**Where**: existing BRFI web test files  
**Commit**: `test(web): brfi frequency and estimate UI`

---

### T16 [P2]: P2 regression gate

**Gate**: `npm run test -w @investment-tracker/web`

---

### T17 [P3]: Domain edge-case test matrix

**Requirement**: M11-014, M11-005  
**Where**: `packages/bonds-domain/__tests__/brFiCouponEngine.test.ts`  
**What**: First coupon from purchase; last coupon on maturity boundary; duplicate valueDate; `cdiPercentage` 110 scaling; null on indicator gap  
**Commit**: `test(domain): brfi coupon edge cases`

---

### T18 [P3]: Dashboard UAT verification checklist

**Requirement**: M11-010 (UAT)  
**Depends on**: T8  
**Where**: manual or automated — confirm spec UAT items for dashboard projected income + upcoming INTEREST  
**Done when**: Semi-annual / monthly / quarterly patterns match spec acceptance criteria  
**Commit**: `test(api): dashboard brfi UAT scenarios` (if automated) or documented pass in PR

---

### T19 [P3]: Codebase docs

**Requirement**: M11-015  
**Where**: `.specs/codebase/ARCHITECTURE.md`, `.specs/codebase/API-FIRST.md`, `docs/FRONTEND.md`, `.specs/index.md` **Last verified**  
**What**: Document BRFI coupon engine, `expectedInterestAmountCents`, frequency field; remove dashboard latest-value BRFI note  
**Commit**: `docs: M11 BRFI coupon engine`

---

### T20 [P3]: Full monorepo gate + release prep

**Requirement**: M11-015  
**Move on ship**: `active/m11-brfi-coupon-engine/` → `completed/`; ROADMAP M11 → Done; tag **v1.3.0** per AD-011  
**Gate**: `npm run lint && npm run test && npm run check:docs`

---

## Requirement Traceability Matrix

| Task    | Requirements                                |
| ------- | ------------------------------------------- |
| T1      | M11-007                                     |
| T2      | M11-008                                     |
| T3      | M11-005, M11-NFR-004                        |
| T4      | M11-001, M11-002, M11-003, M11-004, M11-006 |
| T5      | M11-009, M11-010, M11-011                   |
| T6      | M11-007, M11-008                            |
| T7      | M11-009, M11-NFR-001, M11-NFR-005           |
| T8      | M11-010, M11-011                            |
| T9      | M11-008, M11-009                            |
| T10     | M11-007, M11-010                            |
| T11     | M11-NFR-007                                 |
| T12–T16 | M11-012, M11-013                            |
| T17–T20 | M11-014, M11-015                            |

---

## Post-ship

- Tag **v1.3.0** via release script (AD-011)
- Close M11 todos in `STATE.md`
- Mark ROADMAP M11 status **Done**
