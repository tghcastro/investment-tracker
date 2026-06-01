# M6.1 — Multi-Currency Follow-Ups Specification

**Status:** Shipped (2026-05-31)  
**Source:** [`new-requirements.md`](../../../../new-requirements.md) — Currency Handling Improvements  
**Depends on:** M6 (multi-currency shipped)  
**Blocks:** M7 (Brazilian fixed income) — execute after M6.1  
**Release:** Part of **v2.0.0** (with M7 per AD-009)

## Problem Statement

M6 delivered currency catalog, manual USD→target quotes, display-currency conversion, and basic UI. Usage exposed gaps: conversion uses a **single global as-of date** (default today) instead of **each holding’s purchase date**; non-USD holdings can be saved without a applicable quote; quote entry does not normalize inverted rates; Holdings UI omits original-value sub-lines, tooltips, and live USD preview on the form. BRL (and other non-USD) values can be wrong when historical rates differ from “today.”

This milestone closes those gaps with an **API-first** model: all monetary conversion happens server-side; the web client only renders API fields and applies UI rules (show/hide, enable/disable).

## Goals

- [ ] All stored quotes normalized as **1 USD = X target** (invert `Currency → USD` on input)
- [ ] Holding valuation uses **purchase date** as the exchange-rate reference date (never future rates)
- [ ] **List/detail/summary API responses always include original + converted amounts** (converted defaults to **USD** when `displayCurrency` omitted)
- [ ] API rejects non-USD holdings when no applicable quote exists on/before purchase date (writes); reads expose conversion status when quote missing
- [ ] **No FX business logic in web** — no `bonds-domain` imports, no client-side conversion math
- [ ] Holdings UI shows API `convertedFaceValue` + API `faceValue`/`currencyCode` (layout only)
- [ ] Currency quotes page supports **date range + currency** filters; rates show **symbol**
- [ ] Regression tests cover worked examples from `new-requirements.md` (including BRL → USD → EUR)
- [ ] Automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Automatic quote feeds / imports | Same as M6 |
| User CRUD on currency catalog | Same as M6 |
| Direct cross-rate storage (EUR→BRL) | USD hub only |
| Bond interest type (Simple / Compound) | Deferred to **M7** (BRFI indexing + product types) |
| Home page redesign beyond conversion correctness | Holdings-focused; Home inherits API fix only |
| BRFI products | M7 |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Base currency | **USD** | `new-requirements.md`; unchanged from M6 |
| **Where business rules live** | **`bonds-domain` + API only** | Web is presentation; avoids duplicate FX |
| Stored rate format | **1 USD = X target** | Normalized at write time |
| Inverted input | Optional **`rateDirection`**: `usd-to-target` (default) \| `target-to-usd`** → domain inverts before persist | User may paste EUR→USD feeds |
| Holding reference date | **`purchaseDate`** per holding | Historical face value integrity |
| **`displayCurrency` query param** | Optional on list/summary; **default `USD`** | Omitted param still returns converted fields |
| Global `asOfDate` query param | **Removed/ignored** for valuation | Purchase date is the only as-of for holdings |
| Missing quote on **write** | **400** `EXCHANGE_RATE_REQUIRED` for non-USD | Table in source doc |
| Missing quote on **read** | Row returned with `convertedFaceValue: null`, `conversionError` set | List still usable; web shows placeholder |
| USD holdings | No quote required | Base currency |
| Form USD preview | **`GET /api/fx/convert`** (or equivalent) — API returns USD cents; web displays only | No client conversion |

---

## Architecture: API-first valuation

> Project-wide rule: [API-FIRST.md](../../../codebase/API-FIRST.md) (AD-010). M6.1 is the reference implementation for **monetary conversion**; same pattern applies to coupons, forecasts, and future BRFI logic.

### Layer responsibilities

| Layer | Allowed | Forbidden |
| --- | --- | --- |
| **bonds-domain** | Rate normalize, pick quote, convert cents, validate quote presence | HTTP, UI |
| **API** | Persist quotes; validate writes; **compute and attach** `converted*` on every list/detail/summary; preview endpoint for forms | React, CSS |
| **Web** | Render `faceValue`/`currencyCode` + `convertedFaceValue`/`convertedCurrency`; pass `displayCurrency` query param; enable/disable submit from **API error codes**; tooltips, typography | `convertNativeCents`, quote pick, invert rates, `bonds-domain` import |

### API response contract (holdings list / GET by id)

Every bond holding in a valuation-enabled response includes **both** native and converted amounts:

| Field | Meaning |
| --- | --- |
| `faceValue` | Original amount (integer cents) |
| `currencyCode` | Original ISO currency |
| `convertedFaceValue` | Amount in `convertedCurrency` (integer cents); **always present** on list/detail when endpoint supports valuation |
| `convertedCurrency` | ISO code used for conversion (from `displayCurrency` query or **`USD` default**) |
| `conversionError` | Optional; e.g. `EXCHANGE_RATE_REQUIRED` when `convertedFaceValue` is null |

Same pattern for `purchasePrice` when present: `purchasePrice` + `convertedPurchasePrice` (optional pair).

`displayCurrency` query param on `GET /api/holdings`, `GET /api/holdings/:id`, `GET /api/portfolio/summary`:

- Omitted → treat as **`USD`**
- Invalid/unquoted currency → **400** at route level (before list mapping)

Portfolio summary always returns `convertedCurrency`, `convertedTotalFaceValue`, `convertedTotalCostBasis` (when cost basis exists), and per-ladder-item `convertedFaceValue`.

### Web behavior (UI rules only)

- Display currency selector → changes `displayCurrency` on fetch URL → **refetch**; no local math
- Holdings table primary line → `convertedFaceValue` + `convertedCurrency` from JSON
- Holdings table secondary line → `faceValue` + `currencyCode` from JSON (unchanged when selector changes)
- Holding form USD field → debounced call to preview API; show loading/empty from response
- Submit disabled when API preview returns `conversionError` or user has not received successful preview (UI state)

---

## Gap vs M6 (what this milestone adds)

| Area | M6 behavior | M6.1 target |
| --- | --- | --- |
| Quote as-of | One `asOfDate` (default today) for all holdings | Per-holding `purchaseDate` |
| Quote input | Assumes USD→target only | Normalize inverted rates on create/update |
| Holding create validation | Account currency only | + applicable quote for non-USD |
| Holdings API | Optional `displayFaceValue` only when param set | **Always** `convertedFaceValue` + `convertedCurrency` (default USD) |
| Holdings table | Client picks `displayFaceValue ?? faceValue` | Render API fields only |
| Holding form | No USD equivalent | USD via **preview API**; no client math |
| Quotes UI | List all quotes | Filters + symbol in display |
| BRL conversion | Can be wrong with mixed dates | Fixed via purchase-date rates + tests |

---

## User Stories

### P1: Normalized exchange rates ⭐ MVP

**User Story**: As a user entering quotes from different sources, I want rates stored consistently as USD→target so conversions never depend on how I typed the quote.

**Acceptance Criteria**:

1. WHEN I POST/PATCH a quote with `rateDirection: 'usd-to-target'` (or omitted) THEN stored rate SHALL equal submitted rate
2. WHEN I submit `rateDirection: 'target-to-usd'` with rate `X` THEN stored rate SHALL be `1 / X` (rounded per design)
3. WHEN stored rate is read via API THEN format SHALL remain `1 USD = rate × target`

**Requirement IDs**: M6.1-01, M6.1-02

---

### P1: Purchase-date exchange rate selection ⭐ MVP

**User Story**: As a user with historical positions, I want each holding valued using the rate on or before its purchase date so portfolio totals match reality.

**Acceptance Criteria**:

1. WHEN computing a holding’s converted face value THEN system SHALL use latest quote where `quoteDate <= purchaseDate` for each required currency
2. WHEN no quote exists on/before purchase date for a required currency THEN `convertedFaceValue` SHALL be **null** and `conversionError` SHALL be set (read paths)
3. WHEN a quote exists only after purchase date THEN it SHALL NOT be used
4. WHEN `GET /api/holdings` without `displayCurrency` THEN `convertedCurrency` SHALL be **`USD`** and `convertedFaceValue` SHALL use purchase-date rates
5. WHEN `GET /api/holdings?displayCurrency=EUR` THEN `convertedCurrency` SHALL be **`EUR`** and values SHALL match purchase-date fixtures

**Requirement IDs**: M6.1-03, M6.1-04, M6.1-05, M6.1-16

**Worked examples** (must pass in tests): see [Calculation fixtures](#calculation-fixtures) below.

---

### P1: Holding create/update validation ⭐ MVP

**User Story**: As a user, I cannot save a non-USD holding unless an exchange rate exists for its purchase date.

**Acceptance Criteria**:

1. WHEN `currencyCode !== USD` and no applicable quote for that currency on/before `purchaseDate` THEN POST/PATCH `/api/holdings` SHALL return **400** with code `EXCHANGE_RATE_REQUIRED`
2. WHEN `currencyCode === USD` THEN quote presence SHALL NOT be required
3. WHEN purchase date or currency changes on update THEN validation SHALL re-run

**Requirement IDs**: M6.1-06, M6.1-07

---

### P2: Holding form USD preview (API-driven)

**User Story**: As a user entering face value in EUR/BRL, I want to see the USD equivalent from the server as I edit fields.

**Acceptance Criteria**:

1. WHEN purchase date, currency, or face value changes THEN web SHALL call **`GET /api/fx/convert`** (see design) and display returned `convertedFaceValue` / `convertedCurrency` read-only
2. WHEN preview returns `conversionError` THEN USD field SHALL show empty state and submit button SHALL be disabled (**UI rule**); POST/PATCH still returns **400** from API
3. WHEN `currencyCode === USD` THEN preview SHALL return same cents as face value
4. Web SHALL NOT import `bonds-domain` or perform cent conversion locally

**Requirement IDs**: M6.1-08, M6.1-09, M6.1-16

---

### P2: Holdings page display polish

**User Story**: As a user comparing currencies, I want to see converted values prominently and original face value always visible underneath.

**Acceptance Criteria**:

1. WHEN Holdings table renders THEN primary line SHALL format `holding.convertedFaceValue` + `holding.convertedCurrency` from API (no `?? holding.faceValue` fallback)
2. WHEN any display currency is selected THEN secondary line SHALL format `holding.faceValue` + `holding.currencyCode` only (unchanged on selector change)
3. WHEN `convertedFaceValue` is null THEN primary line SHALL show UI placeholder (e.g. em dash) — **not** compute a local fallback
4. WHEN user hovers a table metric THEN tooltip SHALL show field label (Issuer, Coupon Rate, Face Value, Maturity Date, Account, Currency, Converted Value)
5. WHEN display currency selector changes THEN web SHALL refetch holdings with new `displayCurrency` query param only

**Requirement IDs**: M6.1-10, M6.1-11, M6.1-12, M6.1-16

---

### P2: Currency quotes UI

**User Story**: As a user managing quotes, I want to filter by date range and currency and see symbols beside codes.

**Acceptance Criteria**:

1. WHEN quotes list renders THEN each row SHALL show target code and symbol (e.g. `EUR (€)`)
2. WHEN user sets start date, end date, and/or target currency filters THEN list SHALL query `GET /api/currency-quotes` with matching query params
3. WHEN filters combine THEN results SHALL satisfy all active filters

**Requirement IDs**: M6.1-13, M6.1-14

---

## Calculation fixtures

Exchange rates (USD → target):

| Date | EUR | BRL |
| --- | ---: | ---: |
| 2026-01-01 | 0.5 | 4.0 |
| 2026-01-10 | 1.0 | 5.0 |
| 2026-01-20 | 1.5 | — |

Holdings (face value in native currency cents; display = converted):

| Purchase Date | Currency | Face (native) | Display | Expected converted |
| --- | --- | ---: | --- | ---: |
| 2026-01-01 | USD | 100000 | USD | 100000 |
| 2026-01-30 | USD | 200000 | USD | 200000 |
| 2026-01-01 | EUR | 300000 | USD | 600000 |
| 2026-01-30 | EUR | 400000 | USD | 266667 |
| 2026-01-01 | BRL | 500000 | USD | 125000 |
| 2026-01-30 | BRL | 600000 | USD | 120000 |
| 2026-01-01 | BRL | 500000 | EUR | 62500 |
| 2026-01-30 | BRL | 600000 | EUR | 180000 |

Formulas (cents, integer rounding):

- To USD: `nativeCents / usdToNativeRate`
- From USD: `usdCents * usdToTargetRate`
- Cross: via USD hub

---

## Requirement traceability index

| ID | Summary |
| --- | --- |
| M6.1-01 | Store USD→target rates unchanged |
| M6.1-02 | Invert target→USD on write |
| M6.1-03 | Per-holding purchase-date rate pick |
| M6.1-04 | Never use future quotes |
| M6.1-05 | Holdings API uses purchase-date conversion |
| M6.1-06 | Reject non-USD without quote |
| M6.1-07 | USD exempt from quote validation |
| M6.1-08 | Form read-only USD via preview API |
| M6.1-09 | Writes validated API-side only |
| M6.1-10 | Converted + original face display |
| M6.1-11 | Original line typography |
| M6.1-12 | Holdings tooltips |
| M6.1-13 | Quote list symbols |
| M6.1-14 | Quote list filters |
| M6.1-16 | API always returns original + converted; web no FX math |

**Deferred to M7:** Interest type display (Simple / Compound) — see M7 spec.

---

## References

- Shipped baseline: `.specs/features/completed/m6-multi-currency/`
- Domain helpers: `packages/bonds-domain/src/currency.ts`
- Source requirements: `new-requirements.md`
