# M9 — Dashboard Specification

**Status:** Approved (2026-06-05)  
**Source:** `temp.features.md` — Dashboard  
**Depends on:** M5 (holding types), M6 (display currency), M7 (BRFI), **M8 (market indicators for index-linked forecasts)**  
**Architecture:** [API-FIRST.md](../../../codebase/API-FIRST.md) — see **Web vs API** below  
**Release:** Part of **v2.0.0** (with M5–M7, M8)

## Web vs API (AD-010)

| Layer | Owns | Does not own |
| --- | --- | --- |
| **bonds-domain + API** | Allocations, yearly income/principal forecasts, upcoming-events merge, bond coupon schedules, BRFI interest projections (incl. M8 indicator lookup), filter scoping, `displayCurrency` conversion | React, routing, CSS |
| **Web** | `GET /api/dashboard` with query params (`displayCurrency`, `accountId`, `holdingTypeSlug`, `from`, `to`, `limit`), render sections from response, filter controls → refetch | Allocation %, income buckets, event amounts, coupon/interest estimates, any local forecast or aggregation |

Web **only requests and passes parameters**. Dashboard numbers come exclusively from API response fields — no client-side business logic.

## Problem Statement

The current Home page shows basic portfolio totals, a maturity ladder, and upcoming bond coupons, but investors need a **consolidated dashboard**: allocation by type and account, filterable views, **yearly projected income** (coupons + BRFI interest), **maturity/principal forecast by year**, and a unified **upcoming events** timeline. Index-linked BRFI projections require **latest market indicator values** from M8. M9 replaces the minimal Home experience with a full dashboard backed by dedicated forecast API endpoints.

## Goals

- [ ] Display total portfolio value in selected display currency
- [ ] Break down value by account and by holding type with allocation percentages
- [ ] Project income by calendar year (coupons + interest)
- [ ] Project principal returns by calendar year (maturities)
- [ ] Show unified upcoming events (coupon, interest, maturity)
- [ ] Support filters: account, holding type, date range
- [ ] Apply forecast rules: bonds from coupon terms; BRFI fixed from registered rate; BRFI index-linked from M8 latest indicator
- [ ] Automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Live market pricing for bonds | User-entered terms only (existing model) |
| Daily BRFI accrual ledger | Simplified annual/monthly projection model for dashboard |
| Charts / graph library requirement | Tables and metric cards sufficient for M9; charts optional P3 |
| New asset classes (stocks, cash holding type) | Future Considerations — dashboard includes existing types only |
| Export / PDF | Future Considerations |
| Separate `/dashboard` route duplicating Home | Evolve **`/` Home** into dashboard (single entry point) |
| Authentication | Out of scope |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Page | **Enhance existing Home (`/`)** | Avoid duplicate portfolio landing pages |
| API surface | New `GET /api/dashboard` (+ optional decomposed routes if payload too large) | Single fetch for initial load; filters as query params |
| Filters | `accountId`, `holdingTypeSlug`, `from`, `to` (ISO dates) | temp.features filter list |
| Default date range | `from` = today; `to` = today + 3 years | Reasonable forecast window; overridable |
| Display currency | Reuse `displayCurrency` query param (M6) | Consistent with holdings/home |
| Bond income forecast | Existing coupon schedule logic extended to yearly buckets | Reuse `bonds-domain` |
| Bond principal forecast | Sum face value (bonds) / invested amount (BRFI) on maturity date by year | temp.features maturity forecast |
| BRFI pre-fixed interest | `investedAmount × preFixedRatePercent / 100` pro-rated by year (simple) | No daily accrual |
| BRFI index-linked interest | `investedAmount × (latestIndicatorValue / 100) × (cdiPercentage/100 if CDI)` pro-rated by year | Requires M8 latest value |
| BRFI SELIC / IPCA+spread | Use latest indicator value + spread fields per indexing rules | Design task: exact formula in `bonds-domain` |
| Upcoming events | Merge bond estimated coupons, BRFI estimated interest payments, maturities; sort by date | Unified timeline |
| Allocation % | `holdingTypeValue / totalPortfolioValue × 100` from API | Web renders only |
| Empty / partial data | Show sections with `—` or omit when no data; banner if indicators missing for index-linked BRFI | Graceful degradation |

### Forecast rules (from temp.features)

| Holding kind | Income projection | Principal projection |
| --- | --- | --- |
| US Bond | Coupon rate × face value × frequency → payment dates | Face value on maturity date |
| BRFI pre-fixed | Registered fixed rate on invested amount | Invested amount on maturity date |
| BRFI index-linked | Latest market indicator value (M8) applied per indexing config | Invested amount on maturity date |

---

## Dashboard Sections

### 1. Portfolio Summary

- Total portfolio value (converted display currency)
- Counts: accounts with positions, total holdings, distinct currencies
- Optional: total face value (bonds) + total invested (BRFI) as secondary metrics

### 2. Allocation

- **By holding type**: name, value, percentage (bar or table)
- **By account**: name, value, percentage

### 3. Projected Income (by year)

- Per year: coupon total, interest total (BRFI), combined total
- Respects date-range filter

### 4. Maturity / Principal Forecast (by year)

- Per year: sum of principal returning (bond face value + BRFI invested amount)

### 5. Upcoming Events

- Chronological list: date, event type (Coupon | Interest | Maturity), holding label, amount
- Limited default count (e.g. 20) with optional `limit` param

---

## User Stories

### P1: Dashboard API aggregate ⭐ MVP

**User Story**: As an investor, I want one API call to load dashboard data so the UI stays simple and calculations stay server-side.

**Acceptance Criteria**:

1. WHEN `GET /api/dashboard?displayCurrency=USD` THEN response SHALL include portfolio summary, allocation by type, allocation by account
2. WHEN `displayCurrency` invalid THEN system SHALL return 400
3. WHEN portfolio empty THEN response SHALL return zeros and empty arrays (not 404)
4. All monetary fields SHALL include native and converted values where applicable (M6 pattern)

**Requirement IDs**: M9-01 … M9-04

---

### P1: Filters ⭐ MVP

**Acceptance Criteria**:

1. WHEN `accountId` filter set THEN all sections SHALL scope to that account's holdings
2. WHEN `holdingTypeSlug` filter set THEN sections SHALL include only that type (e.g. `bond`, `brazilian-fixed-income`)
3. WHEN `from` and `to` set THEN income projections and upcoming events SHALL clip to range; `from` ≤ `to` validated
4. WHEN filter invalid (unknown account) THEN system SHALL return 400 or 404 per existing API conventions

**Requirement IDs**: M9-05 … M9-08

---

### P1: Yearly income and maturity forecasts ⭐ MVP

**Acceptance Criteria**:

1. WHEN dashboard requested THEN `projectedIncomeByYear` SHALL list calendar years with coupon, interest, and total amounts
2. WHEN dashboard requested THEN `principalForecastByYear` SHALL list calendar years with maturing principal totals
3. WHEN bond has coupon terms THEN coupon projections SHALL match existing upcoming-coupon logic aggregated by year
4. WHEN BRFI is index-linked AND indicator has latest value THEN interest projection SHALL use that value
5. WHEN BRFI is index-linked AND indicator missing latest value THEN interest for that holding SHALL be omitted with `missingIndicator: true` flag in breakdown (not silent wrong numbers)

**Requirement IDs**: M9-09 … M9-13

---

### P2: Upcoming events timeline ⭐ MVP

**Acceptance Criteria**:

1. WHEN dashboard requested THEN `upcomingEvents` SHALL merge coupons, BRFI interest estimates, and maturities sorted ascending by date
2. Each event SHALL include: `date`, `type`, `holdingId`, `label`, `amountCents`, `currencyCode`, converted amount when display currency set
3. WHEN `limit` query param set THEN list SHALL truncate after sort

**Requirement IDs**: M9-14 … M9-16

---

### P2: Dashboard web UI ⭐ MVP

**User Story**: As an investor, I want the Home page to show all dashboard sections with filters.

**Acceptance Criteria**:

1. WHEN user opens Home THEN all five sections render from `GET /api/dashboard`
2. WHEN user changes display currency THEN dashboard refetches with new param (existing CurrencySelector)
3. WHEN user applies account or holding type filter THEN dashboard refetches; filter controls persist in URL search params
4. WHEN user sets date range THEN projections and events update
5. Web SHALL call `GET /api/dashboard` with filter/display params and render the response — SHALL NOT compute allocations, forecasts, or event amounts locally (AD-010)

**Requirement IDs**: M9-17 … M9-21

---

### P3: UX polish

**Acceptance Criteria**:

1. Loading skeletons cover all sections
2. Section-level empty states when filtered to zero holdings
3. Responsive layout per DESIGN.md tokens (metric cards, tables)

**Requirement IDs**: M9-22 … M9-24

---

## Edge Cases

- WHEN only BRFI positions exist THEN coupon sections show zero; interest sections populated
- WHEN only bonds exist THEN interest sections show zero
- WHEN converted currency unavailable for a holding THEN show native amount with indicator that conversion failed (existing M6 pattern)
- WHEN maturity date before today THEN exclude from upcoming events; include in historical views only if added later (out of M9 scope — exclude from forecast)

---

## Success Criteria

M9 complete when:

1. `GET /api/dashboard` delivers all sections with filters and display currency
2. Home page redesigned as full dashboard per sections above
3. Index-linked BRFI forecasts consume M8 latest indicator values
4. `npm run lint && npm run test` passes
5. FRONTEND.md updated; spec archived when shipped

---

## Requirement Traceability

| ID | FR | Summary |
| --- | --- | --- |
| M9-01 | DB-001 | Dashboard API summary |
| M9-02 | DB-001 | displayCurrency validation |
| M9-03 | DB-001 | Empty portfolio |
| M9-04 | DB-001 | Native + converted fields |
| M9-05 | DB-002 | Account filter |
| M9-06 | DB-002 | Holding type filter |
| M9-07 | DB-002 | Date range filter |
| M9-08 | DB-002 | Invalid filter handling |
| M9-09 | DB-003 | Income by year |
| M9-10 | DB-003 | Principal by year |
| M9-11 | DB-003 | Bond coupon aggregation |
| M9-12 | DB-003 | Index-linked indicator use |
| M9-13 | DB-003 | Missing indicator flag |
| M9-14 | DB-004 | Unified events list |
| M9-15 | DB-004 | Event shape |
| M9-16 | DB-004 | Limit param |
| M9-17 | DB-005 | Home renders dashboard |
| M9-18 | DB-005 | Currency refetch |
| M9-19 | DB-005 | URL filter params |
| M9-20 | DB-005 | Date range UI |
| M9-21 | DB-005 | API-first web |
| M9-22 | DB-006 | Loading skeletons |
| M9-23 | DB-006 | Filtered empty states |
| M9-24 | DB-006 | Responsive layout |
