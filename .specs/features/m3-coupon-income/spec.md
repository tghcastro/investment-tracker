# M3 — Coupon Income & Cash Flows Specification

**Status:** Approved (2026-05-23)

## Problem Statement

M2 delivers bond holdings and accounts CRUD, but coupon cash flows still live outside the app — typically in spreadsheets or broker statements. Users cannot record interest received, see income history, or plan upcoming coupon dates from the terms they already entered. M3 closes the income loop: link payments to holdings, view history by holding and period, and show simple upcoming expectations calculated from user-entered terms (not market data).

## Goals

- [ ] Users can record, edit, and delete coupon payments for a bond holding through the web UI
- [ ] Users can view payment history per holding and portfolio-wide income for a selected period
- [ ] Home (or dedicated income view) shows recorded income totals and upcoming estimated coupon dates
- [ ] All new API endpoints and UI flows have automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| CSV import of coupon rows | Future Considerations (see ROADMAP.md) |
| Auto-import from broker APIs | Out of v1 scope (AD-005, PROJECT.md) |
| Accrued interest / day-count conventions (30/360, ACT/ACT) | Too complex for v1; use simple calendar stepping for estimates only |
| Tax reporting, 1099-INT mapping, withholding | Future Considerations |
| Push notifications or email reminders | Not in ROADMAP M1–M4 |
| Bulk record payments across holdings | Nice-to-have; manual per-holding entry sufficient for M3 |
| Charts or net-worth dashboard | Future Considerations |
| Authentication / multi-user | Out of v1 scope |
| E2E browser tests (Playwright) | TESTING.md marks E2E as optional; unit + integration sufficient |

---

## Product Decisions (locked for design)

These resolve gray areas without a separate discuss phase:

| Decision | Choice | Rationale |
| --- | --- | --- |
| Money storage | Payment **amount in cents** (integer) | Matches face value / purchase price convention (M2) |
| Coupon rate on holding | **Percent** (0–100) in API responses; decimal in DB | Consistent with M2 holding endpoints |
| Payment date bounds | `purchaseDate ≤ paymentDate ≤ maturityDate` for the linked holding | Payment cannot precede ownership or follow maturity |
| Future-dated payments | **Allowed** | M1 domain allows scheduled payments; user may record expected receipts |
| Duplicate payment dates | **Allowed** on same holding | User may log corrections as separate rows; no uniqueness constraint |
| Edit payment | **PATCH** date and amount | Corrections without delete+recreate |
| Delete payment | **Hard delete** with confirmation | Unblocks DELETE holding when last payment removed (M2-08) |
| Delete holding with payments | **Blocked (409)** until payments deleted | Existing repo behavior; M3 adds payment delete UI |
| Expected coupon amount | `faceValue × (couponRate / 100) / paymentsPerYear` | Simple nominal formula; `paymentsPerYear`: semi-annual=2, quarterly=4, monthly=12, annual=1 |
| Schedule hints | **Informational only** — not persisted | ROADMAP: "user-confirmed"; estimates help data entry, not auto-booking |
| Upcoming date stepping | Calendar months from purchase date (+6/+3/+1/+12) until maturity | Simple v1 estimate; not a pricing engine |
| Income aggregation | **Computed in API** | Same pattern as M2 `GET /api/portfolio/summary` |
| Default period filter | **Current calendar year** on income views | Common personal tracking window; user can change range |
| Holding UI for payments | **Section on `/holdings/:id`** edit page | M2-23: edit page serves as detail; avoids new detail route |
| Portfolio income page | **`/income` route** + TopNav link | Dedicated history view; Home shows summary cards only |

---

## User Stories

### P1: Record Coupon Payment ⭐ MVP

**User Story**: As a bond investor, I want to record a coupon payment against a holding so that I can track cash I actually received.

**Why P1**: Core M3 action; repo `insertCouponPayment` exists but has no HTTP or UI.

**Acceptance Criteria**:

1. WHEN I am on `/holdings/:id` THEN the page SHALL show a **Coupon payments** section listing existing payments for that holding (newest first or by payment date descending)
2. WHEN I submit a valid payment form (payment date, amount) THEN the system SHALL POST `/api/coupon-payments` with `bondHoldingId`, show success, and append the row to the list
3. WHEN amount ≤ 0 or missing THEN the form SHALL not submit and SHALL show field errors per web-design.md
4. WHEN payment date is before the holding's purchase date or after maturity THEN the API SHALL return 400 and the form SHALL display the error
5. WHEN the holding id does not exist THEN POST SHALL return 404
6. WHEN amount is entered THEN the UI SHALL accept currency input and send **cents** to the API (same pattern as face value on holding form)

**Independent Test**: Record a payment on an existing holding → appears in the holding's payment list with correct date and amount.

**Requirement IDs**: M3-01, M3-02, M3-03

---

### P1: Edit Coupon Payment ⭐ MVP

**User Story**: As a bond investor, I want to correct a payment I entered wrong so that my income history stays accurate.

**Why P1**: Manual entry requires edit; complements create.

**Acceptance Criteria**:

1. WHEN I choose **Edit** on a payment row THEN the form SHALL load values from GET `/api/coupon-payments/:id`
2. WHEN I submit valid changes THEN the system SHALL PATCH `/api/coupon-payments/:id` and update the list in place
3. WHEN I submit invalid date bounds THEN the API SHALL return 400 with field errors
4. WHEN the payment id does not exist THEN the app SHALL show not-found (404)

**Independent Test**: Edit payment amount → list reflects new value.

**Requirement IDs**: M3-04, M3-05

---

### P1: Delete Coupon Payment ⭐ MVP

**User Story**: As a bond investor, I want to remove a payment recorded by mistake so that totals stay correct and I can delete the holding if needed.

**Why P1**: Required to satisfy M2-08 workflow (holdings blocked while payments exist).

**Acceptance Criteria**:

1. WHEN I choose **Delete** on a payment THEN the app SHALL show a confirmation dialog
2. WHEN I confirm THEN the system SHALL DELETE `/api/coupon-payments/:id` and remove the row
3. WHEN DELETE succeeds THEN response SHALL be 204 (or 200 with empty body)
4. WHEN the payment id does not exist THEN DELETE SHALL return 404
5. WHEN the last payment on a holding is deleted THEN DELETE `/api/holdings/:id` SHALL succeed (no 409)

**Independent Test**: Add payment → delete payment → delete holding succeeds.

**Requirement IDs**: M3-06, M3-07

---

### P1: List Payments by Holding (API) ⭐ MVP

**User Story**: As a developer/user of the API, I want to list coupon payments for a holding so that the web UI and tests can load history.

**Why P1**: Required for holding payment section and integration tests.

**Acceptance Criteria**:

1. WHEN I GET `/api/coupon-payments?bondHoldingId={id}` THEN the system SHALL return payments for that holding ordered by `paymentDate` descending
2. WHEN `bondHoldingId` is missing THEN GET SHALL return 400
3. WHEN the holding does not exist THEN GET SHALL return 404
4. WHEN the holding has no payments THEN GET SHALL return `[]`
5. WHEN a payment is returned THEN body SHALL include `id`, `bondHoldingId`, `paymentDate` (ISO date), `amount` (cents), `recordedAt` (ISO datetime)

**Independent Test**: POST two payments → GET by holding returns both in correct order.

**Requirement IDs**: M3-08, M3-09

---

### P2: Portfolio Income Summary ⭐ MVP

**User Story**: As a bond investor, I want to see total coupon income for a time period so that I know how much interest I earned.

**Why P2**: ROADMAP income views; builds on recorded payments.

**Acceptance Criteria**:

1. WHEN I GET `/api/portfolio/income-summary?from=YYYY-MM-DD&to=YYYY-MM-DD` THEN the system SHALL return `totalReceived` (cents) and `paymentCount` for payments with `paymentDate` in the inclusive range
2. WHEN `from` or `to` is omitted THEN the API SHALL default to the **current calendar year** (Jan 1 – Dec 31)
3. WHEN `from` > `to` THEN the API SHALL return 400
4. WHEN no payments exist in range THEN `totalReceived` SHALL be 0 and `paymentCount` SHALL be 0
5. WHEN I open `/income` THEN the page SHALL show the summary for the selected period and a table of payments (date, holding issuer, amount)
6. WHEN I change the period filter on `/income` THEN the summary and table SHALL refresh from the API

**Independent Test**: Record payments in two years → filter to one year → total matches sum of that year's payments only.

**Requirement IDs**: M3-10, M3-11, M3-12

---

### P2: Income by Holding

**User Story**: As a bond investor, I want to see how much each bond contributed to income in a period so that I can compare positions.

**Why P2**: ROADMAP "history by holding".

**Acceptance Criteria**:

1. WHEN I GET `/api/portfolio/income-summary?from=&to=` THEN the response SHALL include `byHolding`: array of `{ holdingId, issuer, totalReceived, paymentCount }` sorted by `totalReceived` descending
2. WHEN a holding has no payments in range THEN it SHALL be omitted from `byHolding`
3. WHEN I view `/income` THEN the page SHALL show a per-holding breakdown section or sortable table column

**Independent Test**: Two holdings with payments → byHolding shows correct per-holding totals.

**Requirement IDs**: M3-13, M3-14

---

### P2: Home Income Card

**User Story**: As a bond investor, I want a quick income snapshot on Home so that I see YTD coupons without opening another page.

**Why P2**: Complements M2 portfolio summary cards; minimal extra navigation.

**Acceptance Criteria**:

1. WHEN Home loads and holdings exist THEN it SHALL fetch income summary for the current calendar year
2. WHEN payments exist YTD THEN Home SHALL display a metric card **Coupon income (YTD)** with formatted total
3. WHEN no payments YTD THEN the card SHALL show `$0.00` (or equivalent zero state)
4. WHEN Home loads with zero holdings THEN income card SHALL not appear (same as other summary cards)

**Independent Test**: Record payment this year → Home shows non-zero YTD income.

**Requirement IDs**: M3-15, M3-16

---

### P3: Expected Coupon Hint on Holding

**User Story**: As a bond investor, I want to see the expected coupon amount from the terms I entered so that I can verify what I record.

**Why P3**: ROADMAP schedule hints; reduces entry errors without automation.

**Acceptance Criteria**:

1. WHEN I view `/holdings/:id` THEN the payment section SHALL show **Expected per payment** calculated from face value, coupon rate, and frequency
2. WHEN any required term is missing THEN the hint SHALL not display
3. WHEN the hint is shown THEN it SHALL be labeled as an **estimate** (not market or accrual data)

**Independent Test**: Holding with 4.25% semi-annual on $10,000 face → hint shows `$212.50` per payment (1000000 cents face → verify formula in tests).

**Requirement IDs**: M3-17, M3-18

---

### P3: Upcoming Coupon Expectations

**User Story**: As a bond investor, I want to see upcoming estimated coupon dates across my portfolio so that I can anticipate cash flow.

**Why P3**: ROADMAP "simple upcoming coupon expectations".

**Acceptance Criteria**:

1. WHEN I GET `/api/portfolio/upcoming-coupons?limit=5` THEN the system SHALL return the next `limit` estimated payment dates before maturity across all holdings, each with `holdingId`, `issuer`, `estimatedDate`, `estimatedAmount` (cents)
2. WHEN estimation uses calendar stepping THEN dates on or before today SHALL be skipped; only future dates before maturity included
3. WHEN a holding matures before the next coupon step THEN no further dates SHALL be generated for it
4. WHEN Home loads with holdings THEN it SHALL show an **Upcoming coupons** list (same data as API, up to 5 rows)
5. WHEN no upcoming dates exist THEN the section SHALL be hidden or show an empty state message

**Independent Test**: Holding with semi-annual frequency → API returns next future coupon date and amount.

**Requirement IDs**: M3-19, M3-20, M3-21

---

## API Surface (M3)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/coupon-payments` | Create payment |
| GET | `/api/coupon-payments?bondHoldingId=` | List by holding |
| GET | `/api/coupon-payments/:id` | Get one (edit form) |
| PATCH | `/api/coupon-payments/:id` | Update date/amount |
| DELETE | `/api/coupon-payments/:id` | Remove payment |
| GET | `/api/portfolio/income-summary?from=&to=` | Totals + by-holding breakdown |
| GET | `/api/portfolio/upcoming-coupons?limit=` | Estimated future coupons |

**Request body (POST/PATCH):**

```json
{
  "bondHoldingId": "1",
  "paymentDate": "2026-03-15",
  "amount": 21250
}
```

PATCH omits `bondHoldingId` (payment stays linked to original holding).

---

## Web Routes (M3)

| Route | Purpose |
| --- | --- |
| `/holdings/:id` | Existing edit page + **Coupon payments** section (list, add, edit, delete) |
| `/income` | Period filter, portfolio income summary, payment history table |
| `/` (Home) | Add YTD income card + upcoming coupons section (P2/P3) |

TopNav SHALL include **Income** linking to `/income`.

---

## Edge Cases

- WHEN POST payment for archived account's holding THEN payment SHALL still be allowed (historical income on retired brokers)
- WHEN PATCH payment date violates holding bounds after holding terms were changed THEN API SHALL return 400
- WHEN DELETE holding with any coupon payments THEN API SHALL return 409 (unchanged from M2)
- WHEN malformed JSON on POST/PATCH THEN API SHALL return 400 per M1 error middleware
- WHEN GET income-summary with invalid date format THEN API SHALL return 400
- WHEN holding has zero face value (invalid per domain) THEN expected amount SHALL be 0
- WHEN user opens payment form on holding with no prior payments THEN list SHALL show EmptyState with add action

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| M3-01 | P1: Record payment (UI section + list) | Design | Mapped |
| M3-02 | P1: Record payment (POST + validation) | Design | Mapped |
| M3-03 | P1: Record payment (cents + date bounds) | Design | Mapped |
| M3-04 | P1: Edit payment (load + PATCH) | Design | Mapped |
| M3-05 | P1: Edit payment (404) | Design | Mapped |
| M3-06 | P1: Delete payment (confirm + DELETE) | Design | Mapped |
| M3-07 | P1: Delete payment (unblocks holding delete) | Design | Mapped |
| M3-08 | P1: List by holding (GET query) | Design | Mapped |
| M3-09 | P1: List by holding (response shape) | Design | Mapped |
| M3-10 | P2: Income summary API | Design | Mapped |
| M3-11 | P2: Income summary defaults (calendar year) | Design | Mapped |
| M3-12 | P2: `/income` page | Design | Mapped |
| M3-13 | P2: byHolding breakdown API | Design | Mapped |
| M3-14 | P2: byHolding UI | Design | Mapped |
| M3-15 | P2: Home YTD card | Design | Mapped |
| M3-16 | P2: Home YTD zero state | Design | Mapped |
| M3-17 | P3: Expected amount hint | Design | Mapped |
| M3-18 | P3: Estimate labeling | Design | Mapped |
| M3-19 | P3: Upcoming coupons API | Design | Mapped |
| M3-20 | P3: Calendar stepping rules | Design | Mapped |
| M3-21 | P3: Home upcoming list | Design | Mapped |

**Coverage:** 21 total; 9 P1 (MVP); 7 P2; 5 P3

---

## Success Criteria

- [ ] User can record, edit, and delete coupon payments on a holding without API tools
- [ ] User can view portfolio income for a date range on `/income` and YTD on Home
- [ ] Upcoming coupon estimates appear on Home from user-entered terms (labeled as estimates)
- [ ] Deleting all payments on a holding allows holding deletion (M2 regression)
- [ ] `npm run test` passes across bonds-domain, api, and web packages
- [ ] No regression in M2 holdings/accounts CRUD or portfolio summary

---

## Next Phase

Design: `.specs/features/m3-coupon-income/design.md` (approved). Tasks: `.specs/features/m3-coupon-income/tasks.md`. Next: **Approve tasks** → **Execute**.
