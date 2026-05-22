# M2 — Bond Holdings & Accounts (v1 Core) Specification

## Problem Statement

M1 delivered a read-only web shell and API to list accounts and holdings. Users still cannot add, edit, or retire positions through the UI — they must use API clients or raw HTTP. M2 closes the core loop: manage manual broker accounts and bond holdings entirely in the web app, with filtering and portfolio-level summaries, so spreadsheet tracking is no longer required for bonds-only portfolios.

## Goals

- [ ] Users can create, rename, and archive accounts from the web UI
- [ ] Users can add, edit, and delete bond holdings from the web UI with domain validation surfaced as clear form errors
- [ ] Users can filter holdings by account, maturity window, and issuer text search
- [ ] Home and dedicated views show aggregated face value, cost basis (where purchase price exists), and an upcoming maturity ladder
- [ ] All new API endpoints and forms have automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Coupon payment CRUD UI | M3 — coupon income & cash flows |
| CSV import | M4 |
| Hard-delete accounts | ROADMAP specifies archive only; preserves holding history |
| Un-archive / restore archived accounts | Deferred unless needed during design; archive is one-way in M2 |
| Live market pricing, YTM, duration | Future considerations; manual entry only (AD-005) |
| Authentication / multi-user | Out of v1 scope (PROJECT.md) |
| Bulk edit or multi-select delete | Nice-to-have; not required for v1 core |
| Charts or net-worth dashboard | M4 / future asset classes |
| E2E browser tests (Playwright) | TESTING.md marks E2E as M2+ optional; unit + integration sufficient for M2 |

---

## Product Decisions (locked for design)

These resolve gray areas without a separate discuss phase:

| Decision | Choice | Rationale |
| --- | --- | --- |
| Account retirement | **Soft archive** (`archivedAt` timestamp) | ROADMAP language; holdings remain linked |
| Archived account visibility | Hidden from default account lists; holdings still show account name with archived indicator | User can still see positions grouped by retired broker |
| Archive with holdings | **Allowed** | User may close a brokerage account label while keeping historical positions |
| Holding deletion | **Hard delete** with UI confirmation | Simplest model pre-M3; no tombstone column |
| Delete holding with coupon payments | **Blocked (409)** if linked coupon rows exist | FK integrity; M3 will manage payments first |
| Money storage | Face value and purchase price in **cents** (existing convention) | Consistent with M1 API/repo |
| Coupon rate in API body | **Percent** (0–100) on write; decimal in DB (existing) | Consistent with M1 POST /api/holdings |
| Filter implementation | `accountId`, `maturityAfter` on API; issuer filter **client-side** on loaded list | `maturityAfter` exists; issuer search is M1 stretch in web-design.md |
| Portfolio summary | **Computed in API** via `GET /api/portfolio/summary` | Single source for Home + future views; avoids duplicate client math |

---

## User Stories

### P1: Create Bond Holding (Web) ⭐ MVP

**User Story**: As a bond investor, I want to add a new holding through a form so that I can record a position without using curl or Bruno.

**Why P1**: Primary daily action once accounts exist; TopNav "Add holding" is already stubbed in M1.

**Acceptance Criteria**:

1. WHEN I click **Add holding** in TopNav THEN the app SHALL navigate to `/holdings/new`
2. WHEN I submit a valid holding form THEN the system SHALL POST `/api/holdings`, show success, and redirect to `/holdings` with the new row visible
3. WHEN I submit with invalid data (e.g. maturity ≤ purchase) THEN the form SHALL show field-level errors using `semantic-down` caption text per web-design.md
4. WHEN required fields are empty THEN the form SHALL not submit and SHALL indicate which fields are required
5. WHEN the selected account does not exist THEN the API SHALL return 400 and the form SHALL display the error
6. WHEN the form loads THEN account SHALL be a select listing non-archived accounts from GET `/api/accounts`

**Independent Test**: Create holding via UI → appears on Holdings list with correct issuer, coupon, face value, maturity.

**Requirement IDs**: M2-01, M2-02, M2-03

---

### P1: Edit Bond Holding ⭐ MVP

**User Story**: As a bond investor, I want to edit an existing holding so that I can correct terms I entered wrong.

**Why P1**: Spreadsheets are editable; read-only lists do not replace them.

**Acceptance Criteria**:

1. WHEN I open a holding row action (e.g. **Edit**) THEN the app SHALL navigate to `/holdings/:id` with fields pre-filled from GET `/api/holdings/:id`
2. WHEN I submit valid changes THEN the system SHALL PATCH `/api/holdings/:id` and redirect to `/holdings` with updated data
3. WHEN I submit invalid data THEN the form SHALL show validation errors without losing other field values
4. WHEN the holding id does not exist THEN the app SHALL show a not-found state (404)
5. WHEN PATCH succeeds THEN `updatedAt` SHALL reflect the change in API responses

**Independent Test**: Edit coupon rate on existing holding → Holdings list shows new rate.

**Requirement IDs**: M2-04, M2-05, M2-06

---

### P1: Delete Bond Holding ⭐ MVP

**User Story**: As a bond investor, I want to remove a holding I added by mistake so that my portfolio reflects only real positions.

**Why P1**: Essential CRUD completeness; complements create/edit.

**Acceptance Criteria**:

1. WHEN I choose **Delete** on a holding THEN the app SHALL show a confirmation dialog before calling the API
2. WHEN I confirm delete THEN the system SHALL DELETE `/api/holdings/:id` and remove the row from the list
3. WHEN DELETE succeeds THEN response SHALL be 204 (or 200 with empty body)
4. WHEN the holding has linked coupon payments THEN DELETE SHALL return 409 with a clear message and the UI SHALL show it
5. WHEN the holding id does not exist THEN DELETE SHALL return 404

**Independent Test**: Add holding → delete → no longer on Holdings page.

**Requirement IDs**: M2-07, M2-08

---

### P1: Create Account (Web) ⭐ MVP

**User Story**: As a bond investor, I want to create a brokerage/custodian account label so that I can group holdings by where they are held.

**Why P1**: POST `/api/accounts` exists from M1 but has no UI; required before creating holdings for new brokers.

**Acceptance Criteria**:

1. WHEN I navigate to `/accounts/new` (from Accounts page CTA) THEN I see a form with name (required) and description (optional)
2. WHEN I submit a valid account THEN POST `/api/accounts` SHALL return 201 and redirect to `/accounts` with the new card visible
3. WHEN name is empty THEN validation SHALL fail with "Account name required"
4. WHEN name duplicates an existing active account THEN the system MAY allow duplicates (same broker, multiple sub-accounts) — no uniqueness constraint in M2

**Independent Test**: Create account → visible on Accounts grid with 0 holdings badge.

**Requirement IDs**: M2-09, M2-10

---

### P1: Rename Account ⭐ MVP

**User Story**: As a bond investor, I want to rename an account so that labels stay accurate when I rename brokers in my head or fix typos.

**Why P1**: ROADMAP account management explicitly includes rename.

**Acceptance Criteria**:

1. WHEN I open `/accounts/:id` THEN I see edit form pre-filled from GET `/api/accounts/:id` (new endpoint)
2. WHEN I change name or description and save THEN PATCH `/api/accounts/:id` SHALL persist changes
3. WHEN name is cleared THEN validation SHALL fail with clear error
4. WHEN save succeeds THEN Holdings list SHALL show the updated account name for linked holdings

**Independent Test**: Rename account → Holdings rows show new name.

**Requirement IDs**: M2-11, M2-12, M2-13

---

### P1: Archive Account ⭐ MVP

**User Story**: As a bond investor, I want to archive a closed brokerage account so that it disappears from active lists but my historical holdings remain.

**Why P1**: ROADMAP specifies archive (not delete).

**Acceptance Criteria**:

1. WHEN I archive an account from `/accounts/:id` THEN PATCH `/api/accounts/:id/archive` SHALL set `archivedAt` and return the updated account
2. WHEN an account is archived THEN GET `/api/accounts` SHALL exclude it by default
3. WHEN an account is archived THEN GET `/api/accounts?includeArchived=true` SHALL include it with `archivedAt` populated
4. WHEN an account is archived THEN it SHALL NOT appear in the holding form account select
5. WHEN an account is archived THEN existing holdings SHALL remain listed on `/holdings` with an archived indicator on the account label
6. WHEN archive is triggered THEN the UI SHALL require confirmation

**Independent Test**: Archive account → gone from Accounts grid; holdings still visible with archived badge on account name.

**Requirement IDs**: M2-14, M2-15, M2-16

---

### P2: Filter Holdings

**User Story**: As a bond investor, I want to filter holdings by account and maturity so that I can focus on one broker or upcoming maturities.

**Why P2**: ROADMAP list/filter; M1 already has read-only list and API `maturityAfter`.

**Acceptance Criteria**:

1. WHEN I click **View holdings** on an account card THEN the app SHALL navigate to `/holdings?accountId={id}` and show only that account's holdings
2. WHEN `accountId` query param is present THEN GET `/api/holdings?accountId={id}` SHALL return filtered results
3. WHEN I set a maturity-after date filter THEN GET `/api/holdings?maturityAfter=YYYY-MM-DD` SHALL apply (existing behavior) and the UI SHALL reflect the filter
4. WHEN I type in an issuer search box THEN the client SHALL filter visible rows by issuer substring (case-insensitive) without a new API call
5. WHEN filters yield no rows THEN EmptyState SHALL explain how to clear filters

**Independent Test**: Filter by account from Accounts page → Holdings shows subset; clear filter → full list.

**Requirement IDs**: M2-17, M2-18, M2-19

---

### P2: Portfolio Summary & Maturity Ladder

**User Story**: As a bond investor, I want to see total face value, cost basis, and upcoming maturities so that I understand portfolio size and refinancing risk at a glance.

**Why P2**: ROADMAP bond portfolio summary; Home already shows basic metrics from raw holdings — M2 formalizes accurate aggregates.

**Acceptance Criteria**:

1. WHEN I open Home THEN GET `/api/portfolio/summary` SHALL drive summary cards: total face value, position count, next maturity date (or "None" if empty)
2. WHEN holdings have `purchasePrice` THEN summary SHALL include total cost basis (sum of purchase prices) in a separate metric card
3. WHEN cost basis is unavailable for some holdings THEN summary SHALL sum only holdings with purchase price and indicate count of holdings missing cost basis
4. WHEN I view the maturity ladder section on Home THEN I SHALL see the next 5 upcoming maturities (issuer, date, face value) sorted by date ascending
5. WHEN portfolio is empty THEN Home SHALL show EmptyState with CTA to add first holding (enabled in M2)

**Independent Test**: Seed 3 holdings with varied maturities → Home shows correct totals and ladder order.

**Requirement IDs**: M2-20, M2-21, M2-22

---

### P3: Holding Detail Read-Only View (Optional)

**User Story**: As a bond investor, I want a read-only detail view before editing so that I can review all fields on one screen.

**Why P3**: Edit form doubles as detail; nice-to-have separate view if design prefers.

**Acceptance Criteria**:

1. WHEN I click a holding row (not Edit) THEN the app MAY navigate to `/holdings/:id` in view mode with Edit/Delete actions

**Independent Test**: Optional — skip if edit page serves as detail.

**Requirement IDs**: M2-23

---

## API Contract Summary (new or extended)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/accounts/:id` | Single account (incl. archived) |
| PATCH | `/api/accounts/:id` | Rename / update description |
| PATCH | `/api/accounts/:id/archive` | Soft-archive account |
| GET | `/api/accounts` | Add query `includeArchived` (default false) |
| PATCH | `/api/holdings/:id` | Update holding fields |
| DELETE | `/api/holdings/:id` | Remove holding |
| GET | `/api/holdings` | Add query `accountId`; retain `maturityAfter` |
| GET | `/api/portfolio/summary` | Aggregates + maturity ladder slice |

Existing M1 endpoints unchanged unless noted above.

---

## Web Routes (new)

| Route | Purpose |
| --- | --- |
| `/holdings/new` | Create holding form |
| `/holdings/:id` | Edit holding form (P3: optional view mode) |
| `/accounts/new` | Create account form |
| `/accounts/:id` | Edit + archive account |

TopNav **Add holding** SHALL link to `/holdings/new` (enabled in M2).

Forms SHALL follow `.specs/features/m1-scaffold/web-design.md` **Forms** section and DESIGN.md `text-input` patterns.

---

## Edge Cases

- WHEN PATCH account on archived account THEN system SHALL allow description edit but SHALL NOT allow un-archive in M2
- WHEN POST holding references archived accountId THEN API SHALL return 400
- WHEN DELETE holding with coupon payments THEN API SHALL return 409 with code `CONFLICT` and message explaining M3 dependency
- WHEN GET `/api/holdings?accountId=` references non-existent account THEN API SHALL return 200 with empty array
- WHEN GET `/api/holdings?accountId=` references archived account THEN API SHALL still return its holdings (historical data)
- WHEN portfolio summary with zero holdings THEN all numeric metrics SHALL be zero and ladder SHALL be empty
- WHEN malformed JSON on PATCH/POST THEN API SHALL return 400 per M1 error middleware
- WHEN user navigates to `/holdings/new` with no active accounts THEN EmptyState SHALL direct user to create an account first

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| M2-01 | P1: Create Bond Holding (nav + route) | Execute | Pending |
| M2-02 | P1: Create Bond Holding (submit + validation) | Execute | Pending |
| M2-03 | P1: Create Bond Holding (account select) | Execute | Pending |
| M2-04 | P1: Edit Bond Holding (load + route) | Execute | Pending |
| M2-05 | P1: Edit Bond Holding (PATCH) | Execute | Pending |
| M2-06 | P1: Edit Bond Holding (404) | Execute | Pending |
| M2-07 | P1: Delete Bond Holding (confirm + DELETE) | Execute | Pending |
| M2-08 | P1: Delete Bond Holding (409 with coupons) | Execute | Pending |
| M2-09 | P1: Create Account (web form) | Execute | Pending |
| M2-10 | P1: Create Account (validation) | Execute | Pending |
| M2-11 | P1: Rename Account (GET by id) | Execute | Pending |
| M2-12 | P1: Rename Account (PATCH) | Execute | Pending |
| M2-13 | P1: Rename Account (holdings reflect name) | Execute | Pending |
| M2-14 | P1: Archive Account (PATCH archive) | Execute | Pending |
| M2-15 | P1: Archive Account (list filtering) | Execute | Pending |
| M2-16 | P1: Archive Account (holding form + badge) | Execute | Pending |
| M2-17 | P2: Filter Holdings (accountId query + link) | Execute | Pending |
| M2-18 | P2: Filter Holdings (maturityAfter UI) | Execute | Pending |
| M2-19 | P2: Filter Holdings (issuer client search) | Execute | Pending |
| M2-20 | P2: Portfolio Summary (API + Home cards) | Execute | Pending |
| M2-21 | P2: Portfolio Summary (cost basis) | Execute | Pending |
| M2-22 | P2: Portfolio Summary (maturity ladder) | Execute | Pending |
| M2-23 | P3: Holding detail view (optional) | — | Deferred |

**Coverage:** 23 total; 16 P1 (MVP); 6 P2; 1 P3

---

## Success Criteria

- [ ] User can add, edit, and delete a bond holding entirely through the web UI without external API tools
- [ ] User can create, rename, and archive accounts through the web UI
- [ ] Holdings can be filtered by account (URL + API) and maturity; issuer search works client-side
- [ ] Home displays accurate portfolio summary and next 5 maturities from `GET /api/portfolio/summary`
- [ ] `npm run test` passes across bonds-domain, api, and web packages
- [ ] No regression in M1 read-only flows (list pages, CORS, design tokens)

---

## Next Phase

Tasks complete → **Execute** (`.specs/features/m2-core/tasks.md` T1–T29). Start with T1 (migration).
