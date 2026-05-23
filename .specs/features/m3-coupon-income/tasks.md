# M3 Tasks — Coupon Income & Cash Flows

**Design**: `.specs/features/m3-coupon-income/design.md`  
**Spec**: `.specs/features/m3-coupon-income/spec.md`  
**Status**: In Progress (P2 done)

---

## 3-Phase Split (work packages)

Use **3 PRs or 3 sessions**. Each phase has its own gate; later phases depend on earlier ones.

| Phase | Tasks | Scope | Gate (done when) |
| --- | --- | --- | --- |
| **P1 — Backend API** | T1–T14 | Domain schedule + validators, repo CRUD/aggregates, coupon-payment + portfolio routes, API tests | `npm run test -w bonds-domain && npm run test -w api` |
| **P2 — Web payments** | T15–T19 | Types, money util, payment form/section on holding edit page | `npm run test -w web` |
| **P3 — Income + ship** | T20–T22 | `/income` page, Home YTD + upcoming, full monorepo gate + UAT | `npm run lint && npm run test` |

**Suggested branch names:** `m3-p1-api` → `m3-p2-payments` → `m3-p3-income` (merge to `main` in order).

---

## Execution Plan

### P1 — Backend API (T1–T14)

```
T1 → T2 → T3 → T4 → T5
                    ├─→ T6  [P]
                    ├─→ T7  [P]
                    ├─→ T8  [P]
                    ├─→ T9  [P]
                    ├─→ T10 [P]
                    ├─→ T11 [P]
                    └─→ T12 [P]
         T6–T12 → T13 → T14
```

**P1 deliverable:** Full M3 REST API. Web can call all endpoints; no payment UI yet.

**P1 manual smoke (optional):** POST payment via curl; GET income-summary; GET upcoming-coupons.

---

### P2 — Web payments (T15–T19)

```
T14 (P1 done) → T15 → T16 → T17 → T18 → T19
```

**P2 deliverable:** User can record, edit, delete coupon payments on `/holdings/:id` with expected-amount hint.

---

### P3 — Income + ship (T20–T22)

```
T19 (P2 done) → T20 → T21 → T22
```

**P3 deliverable:** M3 complete per spec Success Criteria — `/income`, Home cards, no M2 regressions.

---

## Phase ↔ Task Index

| Task | Phase |
| --- | --- |
| T1–T14 | P1 |
| T15–T19 | P2 |
| T20–T22 | P3 |

---

## Diagram–Definition Cross-Check

| Task | Phase | Depends on (doc) | In execution diagram? | Match |
| --- | --- | --- | --- | --- |
| T1 | P1 | None | P1 start | ✅ |
| T2 | P1 | T1 | P1 chain | ✅ |
| T3–T4 | P1 | T2 chain | P1 chain | ✅ |
| T5 | P1 | T4 | P1 chain | ✅ |
| T6–T12 | P1 | T5 | P1 fan-out | ✅ |
| T13–T14 | P1 | T6–T12 | P1 merge | ✅ |
| T15 | P2 | T14 | P2 start | ✅ |
| T16–T19 | P2 | P2 chain | P2 diagram | ✅ |
| T20–T22 | P3 | T19 chain | P3 diagram | ✅ |

---

## Test Co-location Validation

| Task | Code layer | TESTING.md type | Tests in same task? | Parallel `[P]`? |
| --- | --- | --- | --- | --- |
| T1 | bonds-domain schedule | unit ✅ | ✅ couponSchedule.test.ts | — |
| T2 | bonds-domain validators | unit ✅ | ✅ validators.test.ts | — |
| T3–T4 | api repo | integration ✅ | ✅ repo.test.ts | No (shared DB file) |
| T5 | api helpers (serialize/validate) | none | N/A (tested via routes) | — |
| T6–T12 | api routes | integration ✅ | T14 batch routes.test.ts | Impl [P]; tests sequential in T14 |
| T13 | server registration | none | N/A | No |
| T14 | api routes | integration ✅ | ✅ | No |
| T15 | web types | none | — | — |
| T16 | web utils | none | — | — |
| T17–T21 | web components/pages | unit ✅ | ✅ RTL per task | Yes where independent |
| T22 | all packages | full gate | `npm run test` | No |

**E2E (Playwright/Cypress):** None — per spec out of scope.

---

## Task Breakdown

### T1 [P1]: Domain — `couponSchedule.ts`

**What**: Pure schedule helpers: `paymentsPerYear`, `monthStepForFrequency`, `expectedCouponAmountCents`, `isPaymentDateWithinHolding`, `generateEstimatedCouponDates`; export from `index.ts`  
**Where**: `packages/bonds-domain/src/couponSchedule.ts`, `index.ts`, `__tests__/couponSchedule.test.ts`  
**Depends on**: None  
**Reuses**: `CouponFrequency` from `types.ts`  
**Requirement**: M3-17, M3-18, M3-19, M3-20

**Done when**:

- [ ] $212.50 case: face 1_000_000 cents, rate 0.0425, semi-annual → 21_250 cents
- [ ] Calendar stepping + skip past/today + stop at maturity covered
- [ ] `isPaymentDateWithinHolding` inclusive UTC day bounds
- [ ] `npm run test -w bonds-domain` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w bonds-domain`

**Commit**: `feat(bonds-domain): add coupon schedule helpers`

---

### T2 [P1]: Domain — `updateCouponPaymentSchema`

**What**: Partial PATCH schema (optional `paymentDate`, `amount`; at least one required); export type  
**Where**: `packages/bonds-domain/src/validators.ts`, `__tests__/validators.test.ts`  
**Depends on**: T1  
**Requirement**: M3-04

**Done when**:

- [ ] Valid partial bodies parse; empty object rejected
- [ ] Amount must be positive int when present
- [ ] `npm run test -w bonds-domain` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w bonds-domain`

**Commit**: `feat(bonds-domain): add updateCouponPaymentSchema`

---

### T3 [P1]: Repo — payment CRUD + list order fix

**What**: Fix `listCouponPaymentsByHolding` to `ORDER BY payment_date DESC`; add `getCouponPayment`, `updateCouponPayment`, `deleteCouponPayment`  
**Where**: `packages/api/src/repo.ts`, `packages/api/__tests__/repo.test.ts`  
**Depends on**: T2  
**Reuses**: Existing `insertCouponPayment`, `mapCouponPayment`  
**Requirement**: M3-06, M3-07, M3-08

**Done when**:

- [ ] List returns newest payment date first
- [ ] get/update/delete behave per design (null/false when missing)
- [ ] Repo tests for CRUD + order
- [ ] `npm run test -w api` passes (repo tests)

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api`

**Commit**: `feat(api): coupon payment CRUD in repo`

---

### T4 [P1]: Repo — `getIncomeSummary` + `getUpcomingCoupons`

**What**: Income aggregation with `byHolding` + `payments` arrays; upcoming merge via domain schedule; types from design  
**Where**: `packages/api/src/repo.ts`, `packages/api/__tests__/repo.test.ts`  
**Depends on**: T3  
**Reuses**: T1 schedule helpers; `listBondHoldings` or equivalent for upcoming  
**Requirement**: M3-10, M3-11, M3-13, M3-19, M3-20

**Done when**:

- [ ] Inclusive UTC date range filter on `payment_date`
- [ ] Empty portfolio → zeros + empty arrays
- [ ] `byHolding` sorted by `totalReceived` desc; omits zero
- [ ] Upcoming: merge all holdings, sort asc, respect limit default 5
- [ ] Repo tests for range, byHolding, upcoming limit
- [ ] `npm run test -w api` passes

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api`

**Commit**: `feat(api): income summary and upcoming coupons repo`

---

### T5 [P1]: API — payment serialize + bounds validate helpers

**What**: `toApiCouponPayment` in `serialize.ts`; `assertPaymentDateWithinHoldingOrThrow` in `validate.ts`  
**Where**: `packages/api/src/routes/coupon-payments/serialize.ts`, `validate.ts`  
**Depends on**: T4  
**Reuses**: `routes/holdings/serialize.ts` date patterns; domain `isPaymentDateWithinHolding`  
**Requirement**: M3-03, M3-09

**Done when**:

- [ ] API shape matches design (id, bondHoldingId, paymentDate YYYY-MM-DD, amount cents, recordedAt ISO)
- [ ] Bounds violation throws/maps to 400 `VALIDATION_ERROR` with `fields.paymentDate`
- [ ] `npm run build -w api` passes

**Tests**: none (covered in T14)  
**Gate**: `npm run build -w api`

**Commit**: `feat(api): coupon payment serialize and validate helpers`

---

### T6 [P1]: POST `/api/coupon-payments` [P]

**What**: Create payment; pre-check holding → 404; bounds → 400; 201 + serialized body  
**Where**: `packages/api/src/routes/coupon-payments/post.ts`  
**Depends on**: T5  
**Reuses**: `createCouponPaymentSchema`, `insertCouponPayment`, M2 route patterns  
**Requirement**: M3-02, M3-03

**Done when**:

- [ ] Valid POST persists and returns 201
- [ ] Unknown holding → 404
- [ ] Date out of bounds → 400
- [ ] Registered in `server.ts` (or T13)

**Tests**: integration (T14)  
**Gate**: Build

---

### T7 [P1]: GET `/api/coupon-payments?bondHoldingId=` [P]

**What**: List by holding; missing param → 400; unknown holding → 404; `[]` when none  
**Where**: `packages/api/src/routes/coupon-payments/list.ts`  
**Depends on**: T5  
**Requirement**: M3-08, M3-09

**Done when**:

- [ ] Returns payments desc by date
- [ ] Response shape per M3-09

**Tests**: integration (T14)  
**Gate**: Build

---

### T8 [P1]: GET `/api/coupon-payments/:id` [P]

**What**: Single payment; 404 if missing  
**Where**: `packages/api/src/routes/coupon-payments/get-by-id.ts`  
**Depends on**: T5  
**Requirement**: M3-05

**Done when**:

- [ ] 200 with full payment JSON
- [ ] 404 unknown id

**Tests**: integration (T14)  
**Gate**: Build

---

### T9 [P1]: PATCH `/api/coupon-payments/:id` [P]

**What**: Partial update date/amount; reload holding for bounds; 404 payment/holding  
**Where**: `packages/api/src/routes/coupon-payments/patch.ts`  
**Depends on**: T5  
**Reuses**: `updateCouponPaymentSchema`  
**Requirement**: M3-04

**Done when**:

- [ ] Valid PATCH returns updated payment
- [ ] Invalid bounds → 400
- [ ] Unknown id → 404

**Tests**: integration (T14)  
**Gate**: Build

---

### T10 [P1]: DELETE `/api/coupon-payments/:id` [P]

**What**: Hard delete; 204; 404 if missing  
**Where**: `packages/api/src/routes/coupon-payments/delete.ts`  
**Depends on**: T5  
**Requirement**: M3-06, M3-07

**Done when**:

- [ ] 204 on success
- [ ] Deleting last payment unblocks holding delete (assert in T14)

**Tests**: integration (T14)  
**Gate**: Build

---

### T11 [P1]: GET `/api/portfolio/income-summary` [P]

**What**: Query `from`/`to` with calendar-year defaults; `from > to` → 400; full response incl. `payments[]`  
**Where**: `packages/api/src/routes/portfolio/income-summary.ts`  
**Depends on**: T5  
**Reuses**: `registerPortfolioSummary` sibling pattern  
**Requirement**: M3-10, M3-11, M3-12, M3-13

**Done when**:

- [ ] Defaults to current UTC calendar year when params omitted
- [ ] Invalid date format → 400
- [ ] Response matches design JSON shape

**Tests**: integration (T14)  
**Gate**: Build

---

### T12 [P1]: GET `/api/portfolio/upcoming-coupons` [P]

**What**: Query `limit` default 5, max 50; returns estimated dates/amounts  
**Where**: `packages/api/src/routes/portfolio/upcoming-coupons.ts`  
**Depends on**: T5  
**Requirement**: M3-19, M3-20

**Done when**:

- [ ] Default limit 5; invalid limit → 400
- [ ] Skips past/today; only future before maturity

**Tests**: integration (T14)  
**Gate**: Build

---

### T13 [P1]: Register M3 routes in `server.ts`

**What**: Wire all seven route modules after existing portfolio summary  
**Where**: `packages/api/src/server.ts`  
**Depends on**: T6–T12  
**Requirement**: — (wiring)

**Done when**:

- [ ] All coupon-payment + portfolio income/upcoming routes registered
- [ ] Server starts; `npm run build -w api` passes

**Tests**: none  
**Gate**: `npm run build -w api`

**Commit**: `feat(api): register M3 coupon and income routes`

---

### T14 [P1]: API route integration tests

**What**: Extend `routes.test.ts` (or split coupon-payments tests) for all M3 endpoints + regression (holding delete 409/204, portfolio summary unchanged)  
**Where**: `packages/api/__tests__/routes.test.ts`  
**Depends on**: T13  
**Requirement**: M3-02–M3-13, M3-19 (API); M3-07 regression

**Done when**:

- [ ] POST/GET list/GET id/PATCH/DELETE coupon-payments covered
- [ ] Income-summary defaults, range, byHolding, payments array
- [ ] Upcoming-coupons limit + stepping smoke case
- [ ] Date bounds 400; 404 cases; archived account POST allowed
- [ ] `npm run test -w api` passes (no silent test deletions)

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api`

**Commit**: `test(api): M3 coupon payment and income route tests`

---

### T15 [P2]: Web — API types for M3

**What**: Add `ApiCouponPayment`, `ApiIncomeSummary`, `ApiUpcomingCoupon`, etc. to `types/api.ts`  
**Where**: `packages/web/src/types/api.ts`  
**Depends on**: T14  
**Requirement**: — (types)

**Done when**:

- [ ] Types match API JSON from design
- [ ] `npm run build -w web` passes

**Tests**: none  
**Gate**: `npm run build -w web`

**Commit**: `feat(web): add M3 API types`

---

### T16 [P2]: Web — extract `money.ts` + refactor `HoldingForm`

**What**: `parseDollarsToCents`, `centsToDollarInput`; import in `HoldingForm.tsx` (no behavior change)  
**Where**: `packages/web/src/utils/money.ts`, `components/HoldingForm.tsx`  
**Depends on**: T15  
**Reuses**: Inline logic from HoldingForm  
**Requirement**: M3-03 (reuse for payment form)

**Done when**:

- [ ] Holding form still submits correctly
- [ ] Existing web tests pass

**Tests**: none (regression via existing tests)  
**Gate**: `npm run test -w web`

**Commit**: `refactor(web): extract money parsing utilities`

---

### T17 [P2]: Web — `CouponPaymentForm`

**What**: Date + USD amount inputs; client validation; uses `parseDollarsToCents`  
**Where**: `packages/web/src/components/CouponPaymentForm.tsx`, `__tests__/couponPaymentForm.test.tsx`  
**Depends on**: T16  
**Reuses**: `FormField`, `TextInput`, web-design patterns  
**Requirement**: M3-03

**Done when**:

- [ ] Invalid amount/date show field errors without submit
- [ ] Valid submit calls onSubmit with cents + ISO date
- [ ] RTL tests pass

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

**Commit**: `feat(web): CouponPaymentForm component`

---

### T18 [P2]: Web — `CouponPaymentsTable`

**What**: Table rows: date, amount, Edit/Delete actions  
**Where**: `packages/web/src/components/CouponPaymentsTable.tsx`  
**Depends on**: T17  
**Reuses**: `formatCurrency`, `formatDate`  
**Requirement**: M3-01

**Done when**:

- [ ] Renders payment rows; action callbacks wired
- [ ] Covered by T19 section tests or standalone smoke test

**Tests**: unit (via T19)  
**Gate**: Build

---

### T19 [P2]: Web — `CouponPaymentsSection` + `HoldingFormPage`

**What**: Section with expected hint (client calc, "Estimate" label), list/add/edit/delete flow, `ConfirmDialog`; append to edit page only  
**Where**: `CouponPaymentsSection.tsx`, `CouponPaymentsSection.css`, `pages/HoldingFormPage.tsx`, `__tests__/couponPaymentsSection.test.tsx`  
**Depends on**: T18  
**Reuses**: `useApi`, `useApiMutation`, `EmptyState`, M2 HoldingFormPage layout  
**Requirement**: M3-01, M3-04, M3-06, M3-17, M3-18

**Done when**:

- [ ] GET list on mount; POST/PATCH/DELETE refresh list
- [ ] Expected per payment hint when terms complete; hidden when not
- [ ] EmptyState + record flow when no payments
- [ ] Edit loads GET by id; delete confirms
- [ ] `npm run test -w web` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

**Commit**: `feat(web): coupon payments section on holding edit page`

---

### T20 [P3]: Web — `/income` page + TopNav + route

**What**: Period filter (default calendar year), summary cards, by-holding table, all-payments table; nav link  
**Where**: `pages/Income.tsx`, `Income.css`, `App.tsx`, `TopNav.tsx`, `__tests__/income.test.tsx`, `topNav.test.tsx`  
**Depends on**: T19  
**Reuses**: Home metric card classes, `PageHeader`, `useApi`  
**Requirement**: M3-12, M3-14

**Done when**:

- [ ] Fetches `GET /api/portfolio/income-summary?from=&to=` on load and period change
- [ ] TopNav **Income** link to `/income`
- [ ] RTL tests for period refetch + render
- [ ] `npm run test -w web` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

**Commit**: `feat(web): income page and navigation`

---

### T21 [P3]: Web — Home YTD income + upcoming coupons

**What**: Extend `Home.tsx` with YTD card (`$0.00` when zero) and upcoming list (up to 5, estimate labeling); parallel fetches  
**Where**: `pages/Home.tsx`, `__tests__/home.test.tsx` (extend)  
**Depends on**: T20  
**Requirement**: M3-15, M3-16, M3-21

**Done when**:

- [ ] Cards hidden when `positionCount === 0` (unchanged M2 behavior)
- [ ] YTD uses calendar-year income-summary
- [ ] Upcoming section hidden or empty state when none
- [ ] `npm run test -w web` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

**Commit**: `feat(web): home YTD income and upcoming coupons`

---

### T22 [P3]: Full regression + spec Success Criteria

**What**: Monorepo lint/test gate; manual UAT checklist from spec; confirm M2 portfolio summary + holding CRUD unchanged  
**Where**: — (verification)  
**Depends on**: T21  
**Requirement**: All M3-01–M3-21; spec Success Criteria

**Done when**:

- [ ] `npm run lint && npm run test` — all packages green
- [ ] Manual UAT: record/edit/delete payment → delete holding; `/income` period filter; Home cards
- [ ] No Playwright/Cypress required

**Tests**: full gate  
**Gate**: `npm run lint && npm run test`

**Commit**: `chore(m3): complete coupon income milestone`

---

## Requirement Traceability (task → req)

| Task | Requirement IDs |
| --- | --- |
| T1 | M3-17, M3-18, M3-19, M3-20 |
| T2 | M3-04 |
| T3 | M3-06, M3-07, M3-08 |
| T4 | M3-10, M3-11, M3-13, M3-19, M3-20 |
| T5 | M3-03, M3-09 |
| T6 | M3-02, M3-03 |
| T7 | M3-08, M3-09 |
| T8 | M3-05 |
| T9 | M3-04 |
| T10 | M3-06, M3-07 |
| T11 | M3-10, M3-11, M3-12, M3-13 |
| T12 | M3-19, M3-20 |
| T14 | M3-02–M3-13, M3-19 (API) |
| T17 | M3-03 |
| T18 | M3-01 |
| T19 | M3-01, M3-04, M3-06, M3-17, M3-18 |
| T20 | M3-12, M3-14 |
| T21 | M3-15, M3-16, M3-21 |
| T22 | All success criteria |

---

## Parallel Execution Map

```
P1 Backend:  T1 → T2 → T3 → T4 → T5 ─┬ T6–T12 [P] → T13 → T14
                                     └ (merge)

P2 Payments: T15 → T16 → T17 → T18 → T19

P3 Income:   T20 → T21 → T22
```

---

## Next Phase

**Approve tasks** → **Execute P1** (`m3-p1-api` branch) → P2 → P3
