# M8 — Market Indicators Specification

**Status:** Shipped (2026-06-05) — v2.0.0 tag deferred until M9  
**Source:** `temp.features.md` — Market Indicator  
**Depends on:** M7 (BRFI indexing types; holdings may reference indicators)  
**Architecture:** [API-FIRST.md](../../../codebase/API-FIRST.md) — see **Web vs API** below  
**Release:** Part of **v2.0.0** (with M5–M7, M9 Dashboard)

## Web vs API (AD-010)

| Layer | Owns | Does not own |
| --- | --- | --- |
| **bonds-domain + API** | Indicator validation, value uniqueness, latest-value resolution, BRFI `marketIndicatorId` rules, category ↔ indexing mapping, response fields (`latestValue`, embedded indicator on BRFI) | React, routing, CSS |
| **Web** | HTTP requests with params/body, render API JSON, form UX, nav, `formatDate` / display formatting | Latest-value logic, category validation, forecast math, duplicating API calculations |

Web **only requests and passes parameters** (query params, POST/PATCH bodies, filter state in URL). All business rules execute on the server.

## Problem Statement

Brazilian fixed-income holdings are indexed to CDI, IPCA, and SELIC, but the app stores only the indexing configuration — not the underlying benchmark values. Forecasts, performance comparisons, and BRFI interest projections need a **manual historical store** for market indicators (rates, inflation indexes, stock benchmarks) with a **latest value** available to the API. M8 adds indicator CRUD, dated values, and optional holding references before M9 builds the consolidated dashboard.

## Goals

- [x] CRUD for market indicators (create, read, update, delete, list)
- [x] Support indicator **categories**: Interest Rate, Inflation, Stock Index
- [x] Store and manage **historical values** per indicator (manual entry)
- [x] Display values ordered by date; one value per indicator per date
- [x] Provide **latest available value** via API for calculations and downstream forecasts (M9)
- [x] Allow **BRFI holdings** to reference a market indicator when indexing type is CDI Percentage, IPCA + Spread, or SELIC
- [x] Seed suggested system indicators (CDI, SELIC, IPCA, CPI, IBOV, S&P 500, Nasdaq 100)
- [x] Automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Automatic indicator feeds (BCB, FRED, Yahoo Finance) | Manual entry only — same pattern as M6 currency quotes |
| File import of indicator history | Future Considerations |
| Bond holdings referencing indicators | Bonds use fixed coupon rate; no index link in M8 |
| Stock/ETF holdings referencing stock indexes | No equity holding type yet — indicators stored for future use |
| Daily accrual / yield engine for BRFI | M7 deferred; M9 uses simplified projections |
| Dashboard UI sections | M9 |
| Authentication | Out of scope |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Tables | `market_indicators`, `market_indicator_values` | Mirror currency catalog + quotes split |
| Indicator identity | `slug` (unique, uppercase, e.g. `CDI`) + `name` + `category` | Programmatic lookup for BRFI defaults |
| Categories | Enum: `INTEREST_RATE`, `INFLATION`, `STOCK_INDEX` | Matches temp.features suggested types |
| Value storage | `value` as decimal **annualized percentage** (e.g. 14.75 = 14.75%) | Consistent with coupon/index display in app |
| Value uniqueness | One row per `(indicator_id, date)` | Same as currency quotes |
| Seed indicators | DB migration script — not user-created types | System catalog like M6 currencies |
| User CRUD | Users may create **custom** indicators in addition to seeds | temp.features: create/update/delete/list |
| API prefix | `/api/market-indicators` + nested `/api/market-indicators/:id/values` | REST clarity |
| Latest value | `GET /api/market-indicators/:id/latest` or embedded on indicator GET | M9 forecast consumption |
| BRFI link | Optional `marketIndicatorId` on `br_fi_holdings` | Required when indexing ∈ {CDI_PERCENTAGE, IPCA_SPREAD, SELIC} |
| Default indicator | Form pre-selects seed slug by indexing type (CDI→CDI, IPCA→IPCA, SELIC→SELIC) | Reduce user friction |
| Validation | Selected indicator `category` must match indexing type mapping | Prevent IPCA holding linked to IBOV |
| Delete indicator | Block delete if referenced by holdings; cascade-delete values on indicator delete | Data integrity |
| Web routes | `/market-indicators` list, `/market-indicators/:id` detail + values | Settings-adjacent reference data |

### Category ↔ indexing type mapping (BRFI)

| BRFI indexing type | Required indicator category | Default seed slug |
| --- | --- | --- |
| CDI Percentage | INTEREST_RATE | CDI |
| IPCA + Spread | INFLATION | IPCA |
| SELIC | INTEREST_RATE | SELIC |
| Pre-Fixed | — (no indicator) | — |

### Seed catalog (migration)

| Slug | Name | Category |
| --- | --- | --- |
| CDI | CDI | INTEREST_RATE |
| SELIC | SELIC | INTEREST_RATE |
| IPCA | IPCA | INFLATION |
| CPI | CPI | INFLATION |
| IBOV | IBOV | STOCK_INDEX |
| SP500 | S&P 500 | STOCK_INDEX |
| NDX100 | Nasdaq 100 | STOCK_INDEX |

---

## Domain Model

### Market Indicator

| Field | Description |
| --- | --- |
| id | UUID or integer PK (match repo convention) |
| slug | Unique short code (uppercase) |
| name | Display name |
| category | INTEREST_RATE \| INFLATION \| STOCK_INDEX |
| description | Optional text |
| isSystem | Boolean — seed rows true; custom false |
| createdAt / updatedAt | Timestamps |

### Indicator Value

| Field | Description |
| --- | --- |
| id | PK |
| indicatorId | FK → market_indicators |
| date | ISO date (YYYY-MM-DD) |
| value | Decimal percentage (e.g. 14.75) |

---

## User Stories

### P1: Indicator catalog CRUD ⭐ MVP

**User Story**: As an investor, I want to manage market indicators so I can track benchmarks my holdings depend on.

**Acceptance Criteria**:

1. WHEN user lists indicators THEN system SHALL return all indicators ordered by name
2. WHEN user creates a custom indicator with slug, name, category THEN system SHALL persist and return 201
3. WHEN user creates indicator with duplicate slug THEN system SHALL return 400 VALIDATION_ERROR
4. WHEN user updates name/description/category on custom indicator THEN system SHALL persist changes
5. WHEN user attempts to delete a **system** seed indicator THEN system SHALL return 400
6. WHEN user deletes custom indicator with no holding references THEN system SHALL remove indicator and its values
7. WHEN user deletes indicator referenced by a BRFI holding THEN system SHALL return 409 CONFLICT

**Requirement IDs**: M8-01 … M8-07

---

### P1: Historical values CRUD ⭐ MVP

**User Story**: As an investor, I want to enter dated indicator values manually so forecasts use my recorded history.

**Acceptance Criteria**:

1. WHEN user lists values for an indicator THEN system SHALL return rows ordered by date descending
2. WHEN user adds value (date, value) THEN system SHALL persist; value must be finite number
3. WHEN user adds duplicate date for same indicator THEN system SHALL return 400
4. WHEN user updates or deletes a value THEN system SHALL persist change
5. WHEN user requests latest value THEN system SHALL return the row with max date ≤ today (or max date overall if none ≤ today)

**Requirement IDs**: M8-08 … M8-12

---

### P2: BRFI holding reference ⭐ MVP

**User Story**: As an investor, I want index-linked BRFI holdings to reference a market indicator so the API can resolve benchmark rates.

**Acceptance Criteria**:

1. WHEN creating/updating BRFI with indexing CDI_PERCENTAGE, IPCA_SPREAD, or SELIC THEN `marketIndicatorId` SHALL be required
2. WHEN indexing type is PRE_FIXED THEN `marketIndicatorId` SHALL be null/absent
3. WHEN indicator category does not match indexing mapping THEN system SHALL return 400
4. WHEN BRFI holding is read (list/detail) THEN response SHALL include `marketIndicatorId` and resolved `marketIndicator` summary (slug, name, latestValue if available)
5. WHEN BRFI form loads THEN UI SHALL pre-select default seed indicator for indexing type (user may change among valid category matches)

**Requirement IDs**: M8-13 … M8-17

---

### P2: Web UI for indicators

**User Story**: As an investor, I want a web UI to browse indicators and enter values without using the API directly.

**Acceptance Criteria**:

1. WHEN user navigates to Market Indicators THEN list shows slug, name, category, latest value, value count
2. WHEN user opens indicator detail THEN values table shows date + value with add/edit/delete
3. WHEN user edits BRFI holding THEN indicator picker shows only indicators matching indexing category
4. Web SHALL request API endpoints and pass user input as params/body only — SHALL NOT implement latest-value, category, or validation rules (AD-010)

**Requirement IDs**: M8-18 … M8-21

---

### P3: Navigation entry

**Acceptance Criteria**:

1. TopNav or Settings area includes link to Market Indicators
2. Empty state explains manual entry (no live feeds)

**Requirement IDs**: M8-22, M8-23

---

## Edge Cases

- WHEN indicator has no values THEN latest endpoint SHALL return `latestValue: null`
- WHEN value date is in the future THEN system SHALL allow storage (user may record announced rates)
- WHEN slug contains lowercase THEN API SHALL normalize to uppercase on write
- WHEN invalid indicator id on value CRUD THEN system SHALL return 404

---

## Success Criteria

M8 complete when:

1. Full indicator + value CRUD API + web UI
2. BRFI holdings require and store market indicator reference for index-linked types
3. Latest value available for M9 consumption
4. `npm run lint && npm run test` passes
5. Spec moved to `completed/` when shipped

---

## Requirement Traceability

| ID | FR | Summary |
| --- | --- | --- |
| M8-01 | MI-001 | List indicators |
| M8-02 | MI-001 | Create custom indicator |
| M8-03 | MI-001 | Slug uniqueness |
| M8-04 | MI-001 | Update indicator |
| M8-05 | MI-001 | Protect system seeds |
| M8-06 | MI-001 | Delete custom indicator |
| M8-07 | MI-001 | Block delete when referenced |
| M8-08 | MI-002 | List values by date |
| M8-09 | MI-002 | Create value |
| M8-10 | MI-002 | One value per date |
| M8-11 | MI-002 | Update/delete value |
| M8-12 | MI-002 | Latest value resolution |
| M8-13 | MI-003 | BRFI requires indicator |
| M8-14 | MI-003 | Pre-fixed no indicator |
| M8-15 | MI-003 | Category validation |
| M8-16 | MI-003 | API embeds indicator + latest |
| M8-17 | MI-003 | Form default selection |
| M8-18 | MI-004 | Indicators list page |
| M8-19 | MI-004 | Values detail UI |
| M8-20 | MI-004 | BRFI indicator picker |
| M8-21 | MI-004 | API-first web |
| M8-22 | MI-005 | Nav link |
| M8-23 | MI-005 | Empty state copy |
