# M11 — BRFI Coupon Engine Specification

**Milestone:** M11  
**Target version:** v1.3.0  
**Status:** Specified — pending design/tasks approval  
**Depends on:** M7 (BRFI holdings), M8 (market indicator history)  
**Decisions:** AD-010 (API-first), AD-011 (per-milestone release), AD-012 (coupon frequency enum, period-based indicator math, additive migrations)

---

## Problem Statement

BRFI interest projections today use a **simplified annual model**: `brFiAnnualInterestCents` applies one flat yearly amount derived from the **latest** indicator value (or pre-fixed rate), and `generateBrFiInterestDates` emits **purchase anniversaries only** (yearly). That does not match Brazilian fixed-income coupon rules:

- Payments follow a **coupon frequency** (monthly through annual), not implicit yearly cadence.
- **Index-linked** products (CDI %, SELIC, IPCA + spread) must compound indicator **history over each coupon period** (AD-012), not extrapolate from the latest reading.
- **IPCA + spread** coupons apply a **real rate on inflation-adjusted principal** for the period.
- Users recording interest payments have **no API estimate** (`expectedInterestAmountCents` exists for bonds only).
- Dashboard income and upcoming events inherit the same simplified math.

M11 delivers domain + API coupon rules per indexing type, `couponFrequency` on BRFI holdings, projected coupons in dashboard/API responses, and web UI that renders API estimates only.

---

## Goals

- [ ] BRFI holdings store `couponFrequency` (bonds enum; migration default `annual`)
- [ ] Domain calculates **per-period** interest for all four indexing types using indicator history accumulation (AD-012)
- [ ] API embeds `expectedInterestAmountCents` on BRFI GET list/detail (next scheduled payment estimate)
- [ ] Dashboard projected income and upcoming events use per-period BRFI amounts and frequency-based dates
- [ ] Web BRFI form + interest payment section show frequency and API estimate (no client-side math)
- [ ] Ship as **v1.3.0** with **additive migration only** (`009_*`)

---

## Out of Scope

| Feature                                    | Reason                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Daily accrual ledger                       | ROADMAP Future / M9 out of scope                                       |
| Broker feeds or automatic indicator import | M13–M14                                                                |
| Bond coupon rule changes                   | Bonds covered in M3; reuse `couponSchedule` helpers only               |
| Principal amortization before maturity     | Coupons are independent cash flows; principal unchanged until maturity |
| Rewriting historical interest payments     | Recorded payments immutable; projections are separate                  |
| Persisting user calc preferences           | N/A                                                                    |
| Web-side interest math                     | AD-010 — API/domain only                                               |

---

## Baseline (current codebase)

| Area                       | Today                                                         | M11 change                                             |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| BRFI interest payment CRUD | `br_fi_interest_payments` + web section                       | Unchanged CRUD; add estimate display                   |
| BRFI holding schema        | No `coupon_frequency` column                                  | Migration `009_*`: column + default `annual`           |
| BRFI domain type           | `BrFiHolding` without `couponFrequency`                       | Add field; Zod create/update validation                |
| Interest amount calc       | `brFiAnnualInterestCents` — flat annual from latest indicator | Replace with per-period engine per indexing type       |
| Interest payment dates     | `generateBrFiInterestDates` — yearly from purchase            | Use `generateEstimatedCouponDates` + `couponFrequency` |
| Bond coupon helpers        | `couponSchedule.ts` — frequency, dates, pre-fixed amount      | Reuse for BRFI schedule; new BRFI amount fns           |
| API BRFI GET               | No `expectedInterestAmountCents`                              | Embed next-payment estimate (or `null`)                |
| Dashboard `/api/dashboard` | Latest-indicator annual BRFI math                             | Per-period projections from indicator history          |
| Web `BrFiForm`             | No frequency field                                            | Select: Monthly / Quarterly / Semi-annual / Annual     |
| Web interest section       | No estimate banner                                            | Render `expectedInterestAmountCents` from API          |

---

## Calculation Rules (normative)

All amounts in **integer cents**; final step `Math.round`. Indicator `value` is a **percentage number** (e.g. `0.055131` = 0.055131%, `0.44` = 0.44% monthly IPCA).

### Shared schedule

- **Coupon dates:** Same algorithm as bonds — `generateEstimatedCouponDates(purchaseDate, maturityDate, couponFrequency, afterDate)`; only dates within `[purchaseDate, maturityDate]` count.
- **Coupon period** for payment on date `D`:
  - `periodStart` = previous coupon date, or `purchaseDate` if `D` is the first coupon.
  - `periodEnd` = `D` (payment date).
  - Indicator rows used when `periodStart < valueDate <= periodEnd` (exclusive start, inclusive end).
- **Accumulation factor** over a set of indicator values `{v₁…vₙ}`:

  `factor = ∏ᵢ (1 + vᵢ / 100)`

- **Principal:** `investedAmountCents` is unchanged by coupon payments until maturity (no amortization).
- **Insufficient history:** If any required indicator observation in the period is missing (no value on or before each expected observation date per design), the estimate for that payment is **`null`** — no latest-value fallback (AD-012).

### 1. PRE_FIXED

Per-period interest (fixed nominal rate):

```
perPeriodRatePercent = preFixedRatePercent / paymentsPerYear(couponFrequency)
interestCents = round(investedAmountCents × perPeriodRatePercent / 100)
```

Does not depend on indicator history.

### 2. IPCA_SPREAD

Inflation-adjusted principal × real rate for the period:

```
accumulationFactor = ∏ (1 + IPCA_monthly_value / 100)   // IPCA rows in period
adjustedPrincipalCents = round(investedAmountCents × accumulationFactor)
realRatePerPeriodPercent = ipcaSpreadPercent / paymentsPerYear(couponFrequency)
interestCents = round(adjustedPrincipalCents × realRatePerPeriodPercent / 100)
```

Uses the holding’s linked **INFLATION** indicator (typically IPCA slug).

### 3. CDI_PERCENTAGE

Accumulated CDI over the period × CDI percentage:

```
accumulationFactor = ∏ (1 + CDI_daily_value / 100)   // CDI rows in period
interestCents = round(investedAmountCents × (cdiPercentage / 100) × (accumulationFactor - 1))
```

Uses the holding’s linked **INTEREST_RATE** indicator (typically CDI slug). `cdiPercentage` is required on holding (e.g. `110` = 110% of CDI).

### 4. SELIC

Same accumulation as CDI, **without** a percentage multiplier (100% SELIC):

```
accumulationFactor = ∏ (1 + SELIC_daily_value / 100)   // SELIC rows in period
interestCents = round(investedAmountCents × (accumulationFactor - 1))
```

Uses linked **INTEREST_RATE** indicator (typically SELIC slug).

### `expectedInterestAmountCents` (API field)

- Amount for the **next upcoming** coupon date on or after today (UTC date), using that payment’s coupon period and rules above.
- `null` when: no future coupon before maturity, pre-fixed inputs invalid, or index-linked period lacks sufficient indicator history.
- Distinct per payment in dashboard/upcoming events — not a single flat annual figure.

---

## Worked Examples (AD-012 reference)

Design and domain tests **SHALL** implement these examples (±1 cent rounding tolerance).

### Example A — PRE_FIXED, semi-annual

| Input                 | Value                  |
| --------------------- | ---------------------- |
| `investedAmountCents` | `1_000_000` (R$10,000) |
| `preFixedRatePercent` | `12.0`                 |
| `couponFrequency`     | `semi-annual`          |

```
perPeriodRate = 12 / 2 = 6%
interestCents = round(1_000_000 × 6 / 100) = 60_000
```

**Expected:** `60_000` cents (R$600.00) per semi-annual payment.

---

### Example B — IPCA_SPREAD, semi-annual (period accumulation)

| Input                      | Value                      |
| -------------------------- | -------------------------- |
| `investedAmountCents`      | `10_000_000` (R$100,000)   |
| `ipcaSpreadPercent`        | `5.5` (real annual spread) |
| `couponFrequency`          | `semi-annual`              |
| `purchaseDate`             | `2025-07-01`               |
| First coupon (`periodEnd`) | `2026-01-01`               |
| IPCA monthly `%` in period | see table                  |

| valueDate  | value (% monthly) |
| ---------- | ----------------- |
| 2025-08-01 | 0.38              |
| 2025-09-01 | 0.44              |
| 2025-10-01 | 0.44              |
| 2025-11-01 | 0.56              |
| 2025-12-01 | 0.39              |
| 2026-01-01 | 0.52              |

```
accumulation = 1.0038 × 1.0044 × 1.0044 × 1.0056 × 1.0039 × 1.0052
             ≈ 1.02808088
adjustedPrincipal = round(10_000_000 × 1.02808088) = 10_280_809
realRatePerPeriod = 5.5 / 2 = 2.75%
interestCents = round(10_280_809 × 2.75 / 100) = 282_722
```

**Expected:** `282_722` cents (R$2,827.22) for that coupon — **not** `latest IPCA × flat principal`.

---

### Example C — CDI_PERCENTAGE, monthly (period accumulation)

| Input                                            | Value                       |
| ------------------------------------------------ | --------------------------- |
| `investedAmountCents`                            | `5_000_000` (R$50,000)      |
| `cdiPercentage`                                  | `100`                       |
| `couponFrequency`                                | `monthly`                   |
| Period                                           | `2026-01-02` → `2026-02-02` |
| Daily CDI `%` (22 business days, all `0.055131`) |                             |

```
accumulation = (1.00055131)^22 ≈ 1.0121797
interestCents = round(5_000_000 × 1.00 × (1.0121797 - 1)) = 60_899
```

**Expected:** `60_899` cents (R$608.99) — uses **22 days compounded**, not `latest CDI × 12`.

**Contrast (forbidden shortcut):** `latestIndicatorValue × 12 / paymentsPerYear` or flat `brFiAnnualInterestCents` **SHALL NOT** be used for index-linked types.

---

### Example D — SELIC, quarterly (period accumulation)

| Input                                 | Value                                       |
| ------------------------------------- | ------------------------------------------- |
| `investedAmountCents`                 | `2_000_000` (R$20,000)                      |
| `couponFrequency`                     | `quarterly`                                 |
| Period                                | `2026-01-15` → `2026-04-15`                 |
| Daily SELIC `%` (illustrative 5 days) | `0.045`, `0.045`, `0.045`, `0.045`, `0.045` |

```
accumulation = (1.00045)^5 ≈ 1.0022525
interestCents = round(2_000_000 × (1.0022525 - 1)) = 4_505
```

**Expected:** `4_505` cents for that quarter (full implementation uses all indicator rows in the period, not only five).

---

## User Stories

### P1: Domain per-period BRFI interest engine ⭐ MVP

**User Story**: As the system, I need correct per-period BRFI interest math per indexing type so forecasts and estimates match Brazilian fixed-income coupon rules.

**Why P1**: Core business logic; blocks API and dashboard.

**Acceptance Criteria**:

1. WHEN indexing type is `PRE_FIXED` THEN system SHALL compute interest as annual rate ÷ `paymentsPerYear(couponFrequency)` × `investedAmountCents`
2. WHEN indexing type is `IPCA_SPREAD` THEN system SHALL multiply `investedAmountCents` by compounded IPCA history over the coupon period and apply `ipcaSpreadPercent / paymentsPerYear(couponFrequency)` to the adjusted principal
3. WHEN indexing type is `CDI_PERCENTAGE` THEN system SHALL compute `investedAmountCents × (cdiPercentage/100) × (accumulationFactor - 1)` over CDI history in the period
4. WHEN indexing type is `SELIC` THEN system SHALL compute `investedAmountCents × (accumulationFactor - 1)` over SELIC history in the period
5. WHEN index-linked period lacks complete indicator history THEN system SHALL return `null` for that payment estimate (no latest-value fallback)
6. WHEN domain tests run THEN Examples A–D SHALL pass within ±1 cent

**Independent Test**: Unit tests in `bonds-domain` for each indexing type with fixture indicator series matching Examples A–D.

---

### P1: BRFI `couponFrequency` — schema + domain + API ⭐ MVP

**User Story**: As a user, I want to set how often my BRFI pays interest so projections match my product.

**Why P1**: Required input for all coupon schedules; AD-012.

**Acceptance Criteria**:

1. WHEN migration `009_*` runs THEN system SHALL add `coupon_frequency` to `br_fi_holdings` with `NOT NULL DEFAULT 'annual'`
2. WHEN existing rows are migrated THEN `couponFrequency` SHALL be `annual` without data rewrite
3. WHEN user creates or updates BRFI via API THEN `couponFrequency` SHALL accept `monthly` \| `quarterly` \| `semi-annual` \| `annual` (same enum as bonds)
4. WHEN BRFI is returned from GET list/detail THEN response SHALL include `couponFrequency`
5. WHEN backup from pre-M11 DB is restored THEN forward migration SHALL apply cleanly (additive only)

**Independent Test**: POST/PATCH BRFI with each frequency; GET returns field; migration test on empty + seeded DB.

---

### P1: API `expectedInterestAmountCents` on BRFI responses ⭐ MVP

**User Story**: As a user recording interest payments, I want an API-provided estimate for the next payment so I can compare without manual calculation.

**Why P1**: AD-010 parity with bond `expectedCouponAmountCents`.

**Acceptance Criteria**:

1. WHEN client GETs `/api/br-fi-holdings` or `/api/br-fi-holdings/:id` THEN each holding SHALL include `expectedInterestAmountCents: number | null`
2. WHEN next coupon is computable THEN value SHALL match domain engine for that holding’s **next** coupon date and period
3. WHEN estimate is not computable (missing indicator history, no future coupon) THEN field SHALL be `null`
4. WHEN web renders interest section THEN it SHALL display the API field only — no `bonds-domain` import in web (AD-010)

**Independent Test**: API test — pre-fixed holding returns Example A amount; index-linked with sparse history returns `null`.

---

### P1: Dashboard BRFI projections ⭐ MVP

**User Story**: As a user viewing the dashboard, I want projected BRFI income and upcoming events to reflect coupon frequency and period-based index math.

**Why P1**: M9 dashboard currently uses simplified annual BRFI logic.

**Acceptance Criteria**:

1. WHEN `/api/dashboard` builds projected income THEN BRFI events SHALL use `generateEstimatedCouponDates` with holding `couponFrequency` (not `generateBrFiInterestDates`)
2. WHEN each BRFI event amount is computed THEN system SHALL use per-period domain engine (not `brFiAnnualInterestCents`)
3. WHEN upcoming INTEREST events are listed THEN each row SHALL carry the amount for **that** coupon date (amounts may differ across periods for index-linked holdings)
4. WHEN indicator history is insufficient for a future period THEN that event SHALL be omitted from upcoming list and excluded from summed projections (or counted in `holdingsMissingIndicator` if already surfaced)
5. WHEN recorded historical interest payments exist THEN they SHALL remain immutable and MAY be included in realized income totals separately from projections

**Independent Test**: Dashboard integration test — semi-annual pre-fixed BRFI yields two events per year with Example A amount; CDI holding with history yields monthly varying amounts.

---

### P2: Web BRFI form — coupon frequency

**User Story**: As a user creating or editing BRFI, I want to select payment frequency with Portuguese labels.

**Acceptance Criteria**:

1. WHEN user opens BRFI create/edit form THEN system SHALL show **Coupon frequency** select
2. WHEN select renders THEN options SHALL be: **Monthly** (`monthly`), **Quarterly** (`quarterly`), **Semi-annual** (`semi-annual`), **Annual** (`annual`)
3. WHEN user submits THEN `couponFrequency` SHALL be sent in POST/PATCH body
4. WHEN editing existing holding THEN select SHALL reflect stored value (default `annual` for migrated rows)

**Independent Test**: Form test — labels in Portuguese; payload includes frequency.

---

### P2: Web interest payments — show API estimate

**User Story**: As a user on BRFI detail, I want to see the expected next interest amount from the API when adding payments.

**Acceptance Criteria**:

1. WHEN `expectedInterestAmountCents` is non-null THEN interest payments section SHALL display formatted estimate (mirror `CouponPaymentsSection` pattern)
2. WHEN value is `null` THEN section SHALL omit estimate or show neutral copy (no client-side calculation)
3. WHEN holding is refetched after edit THEN estimate SHALL update from API

**Independent Test**: Component test with mocked holding JSON including `expectedInterestAmountCents`.

---

### P3: Domain test matrix + docs

**User Story**: As a maintainer, I want documented examples and broad tests so regressions in coupon math are caught.

**Acceptance Criteria**:

1. WHEN `bonds-domain` tests run THEN Examples A–D SHALL have dedicated test cases
2. WHEN additional edge cases are covered THEN tests SHALL include: first coupon period from purchase, last coupon on maturity boundary, `null` on indicator gap
3. WHEN M11 ships THEN `.specs/codebase/ARCHITECTURE.md`, `API-FIRST.md`, and `docs/FRONTEND.md` SHALL document BRFI estimate field and frequency

**Independent Test**: `npm run test` green; `npm run check:docs` pass after doc updates in implementation phase.

---

## Edge Cases

- WHEN `couponFrequency` is `monthly` and maturity is one month after purchase THEN one coupon on schedule if within holding window
- WHEN index-linked holding has indicator values only after purchase THEN first coupon period may return `null` until history covers the period
- WHEN multiple indicator values share the same `valueDate` THEN system SHALL use one value per date (design task: last-write or validation — spec requires deterministic choice)
- WHEN `cdiPercentage` is `110` THEN CDI accumulation is scaled by `1.10` on the **earned factor**, not on the daily rate itself
- WHEN PRE_FIXED rate is `12` and frequency `annual` THEN one payment per year equals full `12%` of invested amount
- WHEN user records actual interest payment differing from estimate THEN stored payment wins for realized totals; estimate remains for next unpaid coupon
- WHEN restored backup lacks `coupon_frequency` column THEN migration `009_*` applies default `annual` preserving current yearly projection behavior

---

## Non-Functional Requirements

| ID          | Requirement                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| M11-NFR-001 | All coupon math in `bonds-domain`; API orchestrates indicator history load; web renders only (AD-010) |
| M11-NFR-002 | Migration `009_*` additive only — no column drops or data rewrites (AD-012)                           |
| M11-NFR-003 | Integer cents with `Math.round` at final step; no floating-point money in API responses               |
| M11-NFR-004 | Reuse `couponSchedule.ts` for frequency helpers and date generation; do not fork bond schedule logic  |
| M11-NFR-005 | Index-linked estimates degrade to `null` on history gaps — never silent latest-value fallback         |
| M11-NFR-006 | Existing BRFI interest payment CRUD and routes remain backward compatible                             |
| M11-NFR-007 | Domain + API tests cover all four indexing types and Examples A–D                                     |

---

## Requirement Traceability

| ID      | Story        | Summary                                                                           |
| ------- | ------------ | --------------------------------------------------------------------------------- |
| M11-001 | P1 Domain    | PRE_FIXED per-period formula                                                      |
| M11-002 | P1 Domain    | IPCA_SPREAD adjusted principal + real rate                                        |
| M11-003 | P1 Domain    | CDI_PERCENTAGE period accumulation × CDI %                                        |
| M11-004 | P1 Domain    | SELIC period accumulation                                                         |
| M11-005 | P1 Domain    | Null estimate on insufficient indicator history                                   |
| M11-006 | P1 Domain    | Examples A–D test conformance                                                     |
| M11-007 | P1 Frequency | Migration `009_*` + default `annual`                                              |
| M11-008 | P1 Frequency | API CRUD accepts/returns `couponFrequency`                                        |
| M11-009 | P1 API       | `expectedInterestAmountCents` on BRFI GET                                         |
| M11-010 | P1 Dashboard | Frequency-based dates + per-period amounts                                        |
| M11-011 | P1 Dashboard | Remove `brFiAnnualInterestCents` / `generateBrFiInterestDates` from forecast path |
| M11-012 | P2 Web       | BrFiForm frequency select (PT labels)                                             |
| M11-013 | P2 Web       | Interest section shows API estimate                                               |
| M11-014 | P3 Tests     | Example + edge-case domain tests                                                  |
| M11-015 | P3 Docs      | ARCHITECTURE / API-FIRST / FRONTEND updates on ship                               |

---

## Verification (UAT checklist)

- [ ] Migration `009_*` on existing DB: all BRFI rows have `couponFrequency: annual`
- [ ] Pre-fixed semi-annual BRFI: API estimate `60_000` cents for Example A inputs
- [ ] IPCA+ spread: estimate matches Example B (~`282_722` cents), not flat annual shortcut
- [ ] CDI 100% monthly: estimate matches Example C (~`60_899` cents) with 22-day fixture
- [ ] SELIC quarterly: per-period compound matches Example D pattern
- [ ] Index-linked holding with gap in indicator history: `expectedInterestAmountCents` is `null`
- [ ] Dashboard upcoming INTEREST events show per-date amounts at correct frequency
- [ ] BrFiForm: Monthly / Quarterly / Semi-annual / Annual labels; saves frequency
- [ ] Interest payment section shows estimate from API; no web-side math
- [ ] `npm run test` and `npm run check:docs` pass

---

## Docs to update (implementation phase)

- `.specs/codebase/ARCHITECTURE.md` — BRFI coupon engine, `expectedInterestAmountCents`
- `.specs/codebase/API-FIRST.md` — BRFI estimate field; remove dashboard BRFI latest-value note
- `docs/FRONTEND.md` — BrFiForm frequency, interest estimate display
- `.specs/project/STATE.md` — mark M11 complete on ship
- `.specs/project/ROADMAP.md` — M11 status → Done when shipped
