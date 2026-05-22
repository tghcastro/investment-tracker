# M2 Tasks

**Design**: `.specs/features/m2-core/design.md`  
**Spec**: `.specs/features/m2-core/spec.md`  
**Status**: Approved

---

## 3-Phase Split (work packages)

Use **3 PRs or 3 sessions**. Each phase has its own gate; later phases depend on earlier ones.

| Phase | Tasks | Scope | Gate (done when) |
| --- | --- | --- | --- |
| **P1 — Backend API** | T1–T17 | Migration, domain, repo, all M2 routes, API tests | `npm run test -w bonds-domain && npm run test -w api` |
| **P2 — Web CRUD** | T18–T25 | Types, mutation hook, forms, holding/account create-edit-archive-delete | `npm run test -w web` |
| **P3 — Web polish + ship** | T26–T29 | Filters, Home summary/ladder, regression, full monorepo gate + UAT | `npm run lint && npm run test` |

**Suggested branch names:** `m2-p1-api` → `m2-p2-crud` → `m2-p3-polish` (merge to `main` in order).

---

## Execution Plan

### P1 — Backend API (T1–T17)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
                    ├─→ T8  [P]
                    ├─→ T9  [P]
                    ├─→ T10 [P]
                    ├─→ T11 [P]
                    ├─→ T12 [P]
                    ├─→ T13
                    ├─→ T14
                    └─→ T15 [P]
         T8–T15 → T16 → T17
```

**P1 deliverable:** Full M2 REST API. Web can still use M1 read-only UI; no form pages yet.

**P1 manual smoke (optional):** `curl`/Bruno — POST account, POST holding, PATCH archive, GET portfolio/summary.

---

### P2 — Web CRUD (T18–T25)

```
T17 (P1 done) → T18 → T19 → T20 → T21 → T22 → T23
                              └→ T24 → T25
```

**P2 deliverable:** User can create/edit/delete holdings and create/edit/archive accounts in browser. TopNav **Add holding** works. List pages work; **no** URL filters or Home ladder yet.

**P2 parallel tip:** After T20, `T22` (holdings) and `T24` (accounts) can be split across people if coordinated on `App.tsx` routes.

---

### P3 — Web polish + ship (T26–T29)

```
T23, T25 (P2 done) → T26 → T27 → T28 → T29
```

**P3 deliverable:** M2 complete per spec Success Criteria — filters, portfolio Home, no regressions.

---

## Phase ↔ Task Index

| Task | Phase |
| --- | --- |
| T1–T17 | P1 |
| T18–T25 | P2 |
| T26–T29 | P3 |

---

## Diagram–Definition Cross-Check

| Task | Phase | Depends on (doc) | In execution diagram? | Match |
| --- | --- | --- | --- | --- |
| T1 | P1 | None | P1 start | ✅ |
| T2 | P1 | T1 | P1 chain | ✅ |
| T3–T5 | P1 | T2 chain | P1 chain | ✅ |
| T6–T7 | P1 | T5 chain | P1 chain | ✅ |
| T8–T15 | P1 | T7 (+ repo) | P1 fan-out | ✅ |
| T16–T17 | P1 | T8–T15 | P1 merge | ✅ |
| T18 | P2 | T17 | P2 start (after P1) | ✅ |
| T19–T25 | P2 | P2 chain | P2 diagram | ✅ |
| T26–T29 | P3 | T23, T25 | P3 chain | ✅ |

---

## Test Co-location Validation

| Task | Code layer | TESTING.md type | Tests in same task? | Parallel `[P]`? |
| --- | --- | --- | --- | --- |
| T1 | DB migration | none | N/A (migrate gate) | — |
| T2 | bonds-domain | unit ✅ | ✅ validators.test.ts | — |
| T3–T5 | api repo | integration ✅ | ✅ repo.test.ts | No (shared DB) |
| T6–T16 | api routes | integration ✅ | T17 batch routes.test.ts | Routes T8–T15: Yes |
| T17 | api routes | integration ✅ | ✅ | No |
| T18 | web types | none | — | — |
| T19–T28 | web components/hooks | unit ✅ | ✅ RTL per task | Yes where independent |
| T29 | all packages | full gate | `npm run test` | No |

**E2E (Playwright/Cypress):** None — per spec out of scope.

---

## Task Breakdown

### T1 [P1]: Migration 002 — `accounts.archived_at`

**What**: Add SQL migration + Drizzle `archivedAt` column on `accounts`  
**Where**: `packages/api/src/migrations/002_accounts_archived_at.sql`, `packages/api/src/schema.ts`  
**Depends on**: None  
**Requirement**: M2-14, M2-15

**Done when**:

- [ ] Migration file applies cleanly on existing DB
- [ ] `schema.ts` exposes `archivedAt` optional timestamp
- [ ] `npm run build -w api` passes

**Tests**: none  
**Gate**: Build + run migrate against dev DB

---

### T2 [P1]: Domain — `archivedAt` + update validators

**What**: Extend `Account` type; add `updateAccountSchema`, `updateBondHoldingSchema`; export from index  
**Where**: `packages/bonds-domain/src/types.ts`, `validators.ts`, `index.ts`  
**Depends on**: T1  
**Requirement**: M2-11, M2-12, M2-04, M2-05

**Done when**:

- [ ] `Account.archivedAt?: Date` typed
- [ ] `updateAccountSchema` — name min 1, optional description
- [ ] `updateBondHoldingSchema` — partial create schema; maturity > purchase when both present
- [ ] Unit tests cover valid/invalid partial PATCH inputs
- [ ] `npm run test -w bonds-domain` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w bonds-domain`

---

### T3 [P1]: Repo — account list filter, update, archive

**What**: `listAccounts({ includeArchived })`, `updateAccount`, `archiveAccount`, `mapAccount` includes `archivedAt`  
**Where**: `packages/api/src/repo.ts`, `packages/api/__tests__/repo.test.ts`  
**Depends on**: T2  
**Requirement**: M2-14, M2-15, M2-11, M2-12

**Done when**:

- [ ] Default list excludes archived (`archived_at IS NULL`)
- [ ] `includeArchived: true` returns all
- [ ] `archiveAccount` sets `archivedAt`; idempotent on re-archive
- [ ] `updateAccount` updates name/description + `updatedAt`
- [ ] Repo tests: archive, filter, update

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api` (repo tests)

---

### T4 [P1]: Repo — holding update, delete, filters, archived guards

**What**: `updateBondHolding`, `deleteBondHolding`, `listBondHoldingsFiltered`, guard `insertBondHolding`/`updateBondHolding` vs archived account  
**Where**: `packages/api/src/repo.ts`, `packages/api/__tests__/repo.test.ts`  
**Depends on**: T3  
**Requirement**: M2-05, M2-07, M2-08, M2-17, M2-03, M2-16

**Done when**:

- [ ] `deleteBondHolding` → `HAS_COUPON_PAYMENTS` when coupon rows exist
- [ ] Hard delete succeeds when no coupons
- [ ] `listBondHoldingsFiltered` supports `accountId` + `maturityAfter` together
- [ ] Missing `accountId` → empty array (not error)
- [ ] Insert/update with archived `accountId` → `ARCHIVED_ACCOUNT`
- [ ] Repo tests for each behavior

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api`

---

### T5 [P1]: Repo — `getPortfolioSummary`

**What**: Implement portfolio aggregates + top-5 maturity ladder  
**Where**: `packages/api/src/repo.ts` (or `portfolio.ts` helper), `packages/api/__tests__/repo.test.ts`  
**Depends on**: T4  
**Requirement**: M2-20, M2-21, M2-22

**Done when**:

- [ ] Returns `totalFaceValue`, `positionCount`, `nextMaturityDate`, cost basis fields, `maturityLadder` (max 5)
- [ ] Empty portfolio → zeros + empty ladder
- [ ] Cost basis sums only holdings with `purchasePrice`; counts missing
- [ ] Repo tests with fixture holdings

**Tests**: integration (co-located)  
**Gate**: `npm run test -w api`

---

### T6 [P1]: API — holding serialize helper + M1 route refactor

**What**: Extract `serialize.ts`; apply `toApiBondHolding` on post, get-by-id, list  
**Where**: `packages/api/src/routes/holdings/serialize.ts`, `post.ts`, `get-by-id.ts`, `list.ts`  
**Depends on**: T5  
**Requirement**: M2-02 (coupon % consistency)

**Done when**:

- [ ] Shared percent ↔ decimal conversion
- [ ] GET list returns `couponRate` as percent (matches POST/get-by-id)
- [ ] Existing route tests still pass (update expectations if needed)

**Tests**: integration (via T17 or update existing route tests in this task)  
**Gate**: `npm run test -w api -- routes.test` (or full api if faster)

---

### T7 [P1]: API — error middleware 409 + repo code mapping

**What**: Map `HAS_COUPON_PAYMENTS` → 409 `CONFLICT`; `ARCHIVED_ACCOUNT` → 400  
**Where**: `packages/api/src/middleware/errors.ts`  
**Depends on**: T6  
**Requirement**: M2-08

**Done when**:

- [ ] DELETE holding with coupons returns 409 + clear message
- [ ] POST/PATCH holding on archived account returns 400 `ARCHIVED_ACCOUNT`
- [ ] Unit/integration assertion in routes or middleware test

**Tests**: integration (co-located in T17 or small test here)  
**Gate**: `npm run test -w api`

---

### T8 [P1]: GET `/api/accounts/:id` [P]

**What**: Single account route; 404 if missing; includes `archivedAt`  
**Where**: `packages/api/src/routes/accounts/get-by-id.ts`  
**Depends on**: T7, T3  
**Requirement**: M2-11

**Done when**:

- [ ] 200 with full account JSON
- [ ] 404 for unknown id
- [ ] Registered in `server.ts` (or T16)

**Tests**: integration (T17)  
**Gate**: Build

---

### T9 [P1]: PATCH `/api/accounts/:id` [P]

**What**: Rename/update description; block name change when archived  
**Where**: `packages/api/src/routes/accounts/patch.ts`  
**Depends on**: T7, T3  
**Requirement**: M2-12, M2-13

**Done when**:

- [ ] Valid PATCH persists; returns updated account
- [ ] Empty name → 400 validation
- [ ] Archived account + name change → 400
- [ ] Archived account + description-only PATCH allowed

**Tests**: integration (T17)  
**Gate**: Build

---

### T10 [P1]: PATCH `/api/accounts/:id/archive` + extend GET list [P]

**What**: Archive endpoint; `GET /api/accounts?includeArchived=true`  
**Where**: `packages/api/src/routes/accounts/archive.ts`, `list.ts`  
**Depends on**: T7, T3  
**Requirement**: M2-14, M2-15, M2-16

**Done when**:

- [ ] PATCH archive sets `archivedAt`, returns account
- [ ] Default GET excludes archived
- [ ] `includeArchived=true` includes them

**Tests**: integration (T17)  
**Gate**: Build

---

### T11 [P1]: PATCH `/api/holdings/:id` [P]

**What**: Partial update with `updateBondHoldingSchema`; coupon % in/out  
**Where**: `packages/api/src/routes/holdings/patch.ts`  
**Depends on**: T6, T4  
**Requirement**: M2-04, M2-05, M2-06

**Done when**:

- [ ] PATCH updates fields + `updatedAt`
- [ ] Invalid body → 400 with `fields`
- [ ] Unknown id → 404
- [ ] Uses `toApiBondHolding` on response

**Tests**: integration (T17)  
**Gate**: Build

---

### T12 [P1]: DELETE `/api/holdings/:id` [P]

**What**: Hard delete; 204 success; 409 if coupons  
**Where**: `packages/api/src/routes/holdings/delete.ts`  
**Depends on**: T7, T4  
**Requirement**: M2-07, M2-08

**Done when**:

- [ ] 204 on successful delete
- [ ] 404 unknown id
- [ ] 409 when coupon payments linked

**Tests**: integration (T17)  
**Gate**: Build

---

### T13 [P1]: Extend GET `/api/holdings` — `accountId` query

**What**: Add `accountId` filter; combinable with `maturityAfter`; serialize all rows  
**Where**: `packages/api/src/routes/holdings/list.ts`  
**Depends on**: T6, T4  
**Requirement**: M2-17, M2-18

**Done when**:

- [ ] `?accountId=1` filters correctly
- [ ] Combined with `maturityAfter` works
- [ ] Invalid `accountId` format → 400
- [ ] Non-existent account → 200 `[]`

**Tests**: integration (T17)  
**Gate**: Build

---

### T14 [P1]: POST `/api/holdings` — reject archived account

**What**: Before insert, check account not archived  
**Where**: `packages/api/src/routes/holdings/post.ts`  
**Depends on**: T7, T4  
**Requirement**: M2-03

**Done when**:

- [ ] POST with archived `accountId` → 400 `ARCHIVED_ACCOUNT`

**Tests**: integration (T17)  
**Gate**: Build

---

### T15 [P1]: GET `/api/portfolio/summary` [P]

**What**: Route wrapping `repo.getPortfolioSummary()`  
**Where**: `packages/api/src/routes/portfolio/summary.ts`  
**Depends on**: T5  
**Requirement**: M2-20, M2-21, M2-22

**Done when**:

- [ ] 200 with documented JSON shape
- [ ] Works for empty and populated DB

**Tests**: integration (T17)  
**Gate**: Build

---

### T16 [P1]: Register all M2 routes in `server.ts`

**What**: Wire T8–T15 registrars into `createServer`  
**Where**: `packages/api/src/server.ts`  
**Depends on**: T8, T9, T10, T11, T12, T13, T14, T15  
**Requirement**: (infra)

**Done when**:

- [ ] All new endpoints reachable
- [ ] `npm run build -w api` passes

**Tests**: none  
**Gate**: Build

---

### T17 [P1]: API route integration tests (M2 suite)

**What**: Extend `routes.test.ts` for all M2 endpoints + edge cases from spec  
**Where**: `packages/api/__tests__/routes.test.ts`  
**Depends on**: T16  
**Requirement**: M2-01–M2-22 (API side)

**Done when**:

- [ ] Archive + includeArchived list
- [ ] Account GET/PATCH
- [ ] Holding PATCH/DELETE/409
- [ ] Holdings filter `accountId`
- [ ] POST holding on archived account → 400
- [ ] Portfolio summary empty + seeded
- [ ] M1 route tests still pass
- [ ] `npm run test -w api` passes

**Tests**: integration  
**Gate**: `npm run test -w api`

---

### T18 [P2]: Web types — `archivedAt`, `ApiPortfolioSummary`

**What**: Extend `ApiAccount`; add portfolio summary type  
**Where**: `packages/web/src/types/api.ts`  
**Depends on**: T17  
**Requirement**: M2-15, M2-20

**Done when**:

- [ ] Types match API JSON shapes
- [ ] `npm run build -w web` passes

**Tests**: none  
**Gate**: Build

---

### T19 [P2]: `useApiMutation` hook

**What**: POST/PATCH/DELETE hook with `fieldErrors` + message parsing  
**Where**: `packages/web/src/hooks/useApiMutation.ts`, `hooks/index.ts`, `__tests__/useApiMutation.test.ts`  
**Depends on**: T18  
**Requirement**: M2-02, M2-07

**Done when**:

- [ ] Parses 400 `fields` into `fieldErrors`
- [ ] Surfaces 404/409 `message` as `error`
- [ ] Uses `VITE_API_URL` like `useApi`
- [ ] Unit tests with mocked `fetch`

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T20 [P2]: Form primitives

**What**: `FormField`, `TextInput`, `Select`, `ConfirmDialog` + `forms.css`  
**Where**: `packages/web/src/components/forms/`  
**Depends on**: T19  
**Requirement**: M2-02, M2-07 (confirm dialog)

**Done when**:

- [ ] Matches web-design.md (48px inputs, focus ring, `semantic-down` errors)
- [ ] `ConfirmDialog` supports confirm/cancel callbacks
- [ ] Basic RTL render tests

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T21 [P2]: `HoldingForm` component

**What**: Controlled form for all holding fields + client validation  
**Where**: `packages/web/src/components/HoldingForm.tsx` (+ css)  
**Depends on**: T20  
**Requirement**: M2-02, M2-03, M2-04

**Done when**:

- [ ] Account select, issuer, face value, coupon rate/frequency, dates, optional ISIN/CUSIP/price
- [ ] Merges server `fieldErrors` into field state
- [ ] Required fields block submit client-side
- [ ] RTL test: renders + validation message

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T22 [P2]: Holding create page + routes + TopNav

**What**: `/holdings/new`, `HoldingFormPage` create mode, enable TopNav link, Home empty CTA  
**Where**: `App.tsx`, `pages/HoldingFormPage.tsx`, `TopNav.tsx`, `Home.tsx`  
**Depends on**: T21, T17  
**Requirement**: M2-01, M2-02, M2-03

**Done when**:

- [ ] TopNav **Add holding** → `/holdings/new`
- [ ] POST on submit → redirect `/holdings`
- [ ] No active accounts → EmptyState → `/accounts/new`
- [ ] Home empty CTA enabled → `/holdings/new`
- [ ] Route order: `/holdings/new` before `/holdings/:id`

**Tests**: unit (page smoke with mocked mutation)  
**Gate**: `npm run test -w web`

---

### T23 [P2]: Holding edit page + delete flow

**What**: `/holdings/:id` edit mode; load GET holding; PATCH; delete confirm + DELETE  
**Where**: `pages/HoldingFormPage.tsx`, wire `ConfirmDialog`  
**Depends on**: T22  
**Requirement**: M2-04, M2-05, M2-06, M2-07, M2-08

**Done when**:

- [ ] Pre-fill from GET `/api/holdings/:id`
- [ ] 404 not-found state
- [ ] Delete confirms then calls DELETE; 409 shows message
- [ ] Success redirects to `/holdings`

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T24 [P2]: `AccountForm` + create page

**What**: Account form + `/accounts/new`; Accounts page CTA  
**Where**: `components/AccountForm.tsx`, `pages/AccountFormPage.tsx`, `Accounts.tsx`  
**Depends on**: T20, T17  
**Requirement**: M2-09, M2-10

**Done when**:

- [ ] POST create → redirect `/accounts`
- [ ] Name required validation
- [ ] **Add account** CTA on Accounts page

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T25 [P2]: Account edit + archive

**What**: `/accounts/:id` edit; PATCH; archive confirm + PATCH archive  
**Where**: `pages/AccountFormPage.tsx`  
**Depends on**: T24  
**Requirement**: M2-11, M2-12, M2-13, M2-14, M2-15, M2-16

**Done when**:

- [ ] Load GET `/api/accounts/:id`
- [ ] PATCH name/description
- [ ] Archive with confirmation; archived account hidden from default list
- [ ] Card **Manage** or edit link → `/accounts/:id`

**Tests**: unit (co-located)  
**Gate**: `npm run test -w web`

---

### T26 [P3]: Holdings filters + table actions + account links

**What**: URL filters, issuer search, archived badge, Edit/Delete row actions, account card deep link  
**Where**: `Holdings.tsx`, `HoldingsTable.tsx`, `Accounts.tsx`  
**Depends on**: T23, T25  
**Requirement**: M2-16, M2-17, M2-18, M2-19

**Done when**:

- [ ] `?accountId=` drives API fetch
- [ ] Maturity date filter UI → `maturityAfter`
- [ ] Issuer client filter + clear-filters EmptyState
- [ ] `GET /api/accounts?includeArchived=true` for names + `(archived)` badge
- [ ] Account card **View holdings** → `/holdings?accountId={id}`
- [ ] Edit/Delete actions on rows

**Tests**: unit — extend `holdings.test.tsx` / table tests  
**Gate**: `npm run test -w web`

---

### T27 [P3]: Home — portfolio summary + maturity ladder

**What**: Replace client metrics with `GET /api/portfolio/summary`; ladder section; cost basis card  
**Where**: `pages/Home.tsx`, `Home.css`  
**Depends on**: T15, T22  
**Requirement**: M2-20, M2-21, M2-22

**Done when**:

- [ ] Summary cards from API
- [ ] Cost basis card + footnote when holdings missing price
- [ ] Next 5 maturities ladder
- [ ] Loading/error states preserved

**Tests**: unit — update home tests with mocked summary  
**Gate**: `npm run test -w web`

---

### T28 [P3]: Web regression + M1 non-regression

**What**: Fix/update existing tests (coupon % display, TopNav enabled, accounts); add any missing coverage  
**Where**: `packages/web/__tests__/`  
**Depends on**: T26, T27  
**Requirement**: spec Success Criteria (web)

**Done when**:

- [ ] `topNav.test.tsx` — Add holding not disabled
- [ ] `holdings.test.tsx` — filters/actions
- [ ] `app.test.tsx` — new routes resolve
- [ ] All web tests pass

**Tests**: unit  
**Gate**: `npm run test -w web`

---

### T29 [P3]: Full monorepo gate

**What**: Lint + test all packages; manual UAT checklist from spec  
**Where**: repo root  
**Depends on**: T28  
**Requirement**: all M2 success criteria

**Done when**:

- [ ] `npm run lint` — no errors
- [ ] `npm run test` — all packages green
- [ ] Manual UAT: create/edit/delete holding, account CRUD, archive, filters, home summary
- [ ] No Playwright/Cypress required

**Tests**: full gate  
**Gate**: `npm run lint && npm run test`

---

## Requirement Traceability (task → req)

| Task | Requirement IDs |
| --- | --- |
| T1 | M2-14, M2-15 |
| T2 | M2-04, M2-05, M2-11, M2-12 |
| T3 | M2-11, M2-12, M2-14, M2-15 |
| T4 | M2-03, M2-05, M2-07, M2-08, M2-16, M2-17 |
| T5 | M2-20, M2-21, M2-22 |
| T6 | M2-02 |
| T7 | M2-08 |
| T8 | M2-11 |
| T9 | M2-12, M2-13 |
| T10 | M2-14, M2-15, M2-16 |
| T11 | M2-04, M2-05, M2-06 |
| T12 | M2-07, M2-08 |
| T13 | M2-17, M2-18 |
| T14 | M2-03 |
| T15 | M2-20, M2-21, M2-22 |
| T17 | M2-01–M2-22 (API) |
| T22 | M2-01, M2-02, M2-03 |
| T23 | M2-04–M2-08 |
| T24 | M2-09, M2-10 |
| T25 | M2-11–M2-16 |
| T26 | M2-16–M2-19 |
| T27 | M2-20–M2-22 |
| T29 | All success criteria |
| — | M2-23 deferred (no task) |

---

## Parallel Execution Map

```
P1 Backend:  T1 → T2 → T3 → T4 → T5 → T6 → T7 ─┬ T8–T15 [P] → T16 → T17
                                                └ (merge)

P2 Web CRUD: T18 → T19 → T20 → T21 → T22 → T23
                              └→ T24 → T25

P3 Polish:   T26 → T27 → T28 → T29
```

---

## Next Phase

**Execute P1** — start at **T1**. Merge P1 before starting P2; merge P2 before P3.
