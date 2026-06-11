# M11 Design — BRFI Coupon Engine

**Spec**: `.specs/features/active/m11-brfi-coupon-engine/spec.md`  
**Status**: Draft (2026-06-11) — pending approval  
**Depends on**: M7 (BRFI holdings), M8 (indicator history), M9 (dashboard forecast path)  
**Target release**: **v1.3.0** (AD-011)  
**Decisions**: AD-010 (API-first), AD-012 (coupon frequency enum, period accumulation, additive migrations)

---

## Architecture Overview

```mermaid
graph TD
    subgraph Web
        FORM[BrFiForm]
        INT[BrFiInterestPaymentsSection]
        HOME[Home dashboard]
    end

    subgraph API
        BRFI_CRUD[/api/br-fi-holdings CRUD]
        DASH[GET /api/dashboard]
        REPO[repo.ts]
    end

    subgraph Domain
        SCHED[couponSchedule.ts]
        ENGINE[brFiCouponEngine.ts]
        VAL[brFi.ts Zod]
    end

    subgraph DB
        BRFI[br_fi_holdings + coupon_frequency]
        IND_VAL[market_indicator_values]
    end

    FORM --> BRFI_CRUD
    INT --> BRFI_CRUD
    HOME --> DASH
    BRFI_CRUD --> REPO
    DASH --> REPO
    REPO --> ENGINE
    REPO --> SCHED
    REPO --> IND_VAL
    ENGINE --> SCHED
    VAL --> BRFI_CRUD
```

**AD-010:** Web renders `couponFrequency` and `expectedInterestAmountCents` from API JSON only. No `bonds-domain` import in web for interest math.

**AD-012:** Index-linked estimates compound indicator rows over each coupon period `(periodStart, periodEnd]` — never `latestValue × annual shortcut`. Missing required history → `null`, not fallback.

---

## Schema — Migration `009_br_fi_coupon_frequency.sql`

Additive only (AD-012, M11-NFR-002):

```sql
ALTER TABLE `br_fi_holdings`
  ADD COLUMN `coupon_frequency` text NOT NULL DEFAULT 'annual';
```

| Column | Type | Notes |
| --- | --- | --- |
| `coupon_frequency` | text NOT NULL | Same enum as bonds: `monthly` \| `quarterly` \| `semi-annual` \| `annual` |

**Drizzle:** extend `brFiHoldings` in `packages/api/src/schema.ts` with `couponFrequency: text('coupon_frequency').notNull().default('annual')`.

**Retrocompatibility:** Existing rows get `annual` via DEFAULT — preserves current yearly projection behaviour until user edits.

---

## Domain — `packages/bonds-domain/src/brFiCouponEngine.ts`

New module (exported from `index.ts`). Reuses `paymentsPerYear`, `generateEstimatedCouponDates`, `isPaymentDateWithinHolding` from `couponSchedule.ts` — do not fork schedule logic (M11-NFR-004).

### Types

```ts
export type BrFiCouponParams = {
  investedAmountCents: number;
  indexingType: IndexingType;
  couponFrequency: CouponFrequency;
  preFixedRatePercent?: number;
  cdiPercentage?: number;
  ipcaSpreadPercent?: number;
};

export type IndicatorValueRow = { valueDate: string; value: number };

export type BrFiCouponPeriodContext = {
  periodStart: string; // ISO date (exclusive bound for indicators)
  periodEnd: string;   // ISO date (coupon payment date, inclusive)
  indicatorValues: IndicatorValueRow[];
};
```

### Coupon period boundaries

For payment date `D` (Date or ISO string):

1. Previous coupon = latest date from `generateEstimatedCouponDates(purchase, maturity, frequency, dayBefore(D))` strictly before `D`, or `purchaseDate` if first coupon.
2. `periodStart` = ISO(previous coupon) or ISO(purchaseDate).
3. `periodEnd` = ISO(`D`).
4. Indicator rows used when `periodStart < valueDate <= periodEnd`.

### Accumulation factor

```ts
export function indicatorAccumulationFactor(values: IndicatorValueRow[]): number {
  return values.reduce((acc, row) => acc * (1 + row.value / 100), 1);
}
```

### Expected observation dates (insufficient-history rule — M11-005)

| Indicator cadence | Rule |
| --- | --- |
| **Monthly (IPCA / INFLATION)** | For each calendar month `M` with any day in `(periodStart, periodEnd]`, require ≥1 row with `valueDate` in that month (YYYY-MM). Missing month → period not computable. |
| **Daily (CDI / SELIC / INTEREST_RATE)** | Require ≥1 row with `periodStart < valueDate <= periodEnd`. Accumulate **all** rows in range (product formula). Zero rows → not computable. |

**Duplicate `valueDate`:** If multiple rows share a date, use the row with the **latest `createdAt`** when loaded from API; domain tests pass deduped arrays. Repo query: `ORDER BY value_date, id` and keep last per date.

**Deterministic selection helper:**

```ts
export function selectIndicatorValuesForPeriod(
  allValues: IndicatorValueRow[],
  periodStart: string,
  periodEnd: string,
  cadence: 'daily' | 'monthly'
): IndicatorValueRow[] | null;
```

Returns `null` when monthly cadence fails month-coverage check; returns `[]` only for empty daily (treated as null at amount layer).

### Per-indexing formulas (integer cents, final `Math.round`)

All match spec normative section and Examples A–D.

#### PRE_FIXED (M11-001)

```ts
perPeriodRatePercent = preFixedRatePercent / paymentsPerYear(couponFrequency);
interestCents = round(investedAmountCents × perPeriodRatePercent / 100);
```

No indicator dependency.

#### IPCA_SPREAD (M11-002)

```ts
factor = indicatorAccumulationFactor(ipcaRowsInPeriod);
adjustedPrincipalCents = round(investedAmountCents × factor);
realRatePerPeriod = ipcaSpreadPercent / paymentsPerYear(couponFrequency);
interestCents = round(adjustedPrincipalCents × realRatePerPeriod / 100);
```

#### CDI_PERCENTAGE (M11-003)

```ts
factor = indicatorAccumulationFactor(cdiRowsInPeriod);
interestCents = round(investedAmountCents × (cdiPercentage / 100) × (factor - 1));
```

`cdiPercentage` scales earned factor, not daily rate (spec edge case).

#### SELIC (M11-004)

```ts
factor = indicatorAccumulationFactor(selicRowsInPeriod);
interestCents = round(investedAmountCents × (factor - 1));
```

### Public API surface

```ts
export function brFiInterestCentsForPeriod(
  params: BrFiCouponParams,
  ctx: BrFiCouponPeriodContext
): number | null;

export function brFiNextCouponDate(
  purchaseDate: Date,
  maturityDate: Date,
  couponFrequency: CouponFrequency,
  afterDate?: string
): string | null;

export function expectedBrFiInterestAmountCents(
  holding: { purchaseDate: Date; maturityDate: Date; /* + params fields */ },
  indicatorValues: IndicatorValueRow[],
  asOfDate?: string
): number | null;

export function brFiInterestEvents(
  holding: { purchaseDate: Date; maturityDate: Date; /* + params */ },
  indicatorValues: IndicatorValueRow[],
  from: string,
  to: string
): Array<{ date: string; amountCents: number; kind: 'interest' }>;
```

`expectedBrFiInterestAmountCents`: next coupon on/after `asOfDate` (default `todayUtcIsoDate()`); `null` if no future coupon, invalid pre-fixed inputs, or index-linked period fails history rules.

`brFiInterestEvents`: replaces `generateBrFiInterestDates` + flat `brFiAnnualInterestCents` in forecast path (M11-010, M11-011). Each event gets **its own** per-period amount (index-linked amounts may differ).

### Deprecate (forecast path only)

| Symbol | Action |
| --- | --- |
| `brFiAnnualInterestCents` | Stop calling from repo/dashboard; keep exported until M11 P3 if external, else remove |
| `brFiEffectiveAnnualRatePercent` | Same — dashboard no longer uses annual shortcut |
| `generateBrFiInterestDates` | Replace with `brFiInterestEvents` + `generateEstimatedCouponDates` |

---

## Domain — BRFI type + validation

**File:** `packages/bonds-domain/src/types.ts`, `brFi.ts`

- Add `couponFrequency: CouponFrequency` to `BrFiHolding` interface.
- Add `couponFrequency` to `brFiHoldingFieldsSchema` using existing `couponFrequencySchema` from bond validators (or shared enum in `types.ts`).
- Default on create: `annual` if omitted (matches migration default).
- Update/create schemas accept all four frequencies (M11-008).

---

## API Changes

### Repo (`packages/api/src/repo.ts`)

| Area | Change |
| --- | --- |
| BRFI insert/update | Persist `coupon_frequency`; map to/from domain |
| BRFI list/get | Include `couponFrequency`; compute `expectedInterestAmountCents` via domain helper |
| Indicator load | New helper `loadIndicatorValuesForHolding(holdingId, from, to)` — query `market_indicator_values` for holding's `market_indicator_id` in date range (batch for dashboard) |
| `getDashboard` | BRFI income + upcoming: call `brFiInterestEvents` instead of `brFiAnnualInterestCents` + `generateBrFiInterestDates`; skip events where amount is `null`; increment `holdingsMissingIndicator` when index-linked and no computable events in range |

### Serialize (`packages/api/src/routes/br-fi-holdings/serialize.ts`)

Add to `ApiBrFiHoldingResponse`:

```ts
couponFrequency: CouponFrequency;
expectedInterestAmountCents: number | null;
```

Mirror bond pattern in `packages/api/src/routes/holdings/serialize.ts` (`expectedCouponAmountCents` computed in serialize layer from domain fn + repo-loaded indicator history).

### Routes

No new endpoints. Existing BRFI GET list/detail gain fields. POST/PATCH accept optional/required `couponFrequency`.

### Dashboard

No response shape change — amounts and dates change internally. INTEREST upcoming rows may differ in count (frequency) and per-row amount (period engine).

---

## Web Changes

| File | Change |
| --- | --- |
| `packages/web/src/types/api.ts` | `couponFrequency`, `expectedInterestAmountCents` on `ApiBrFiHolding` |
| `packages/web/src/components/BrFiForm.tsx` | Select **Frequência de cupom** — Mensal / Trimestral / Semestral / Anual; include in submit payload |
| `packages/web/src/components/BrFiInterestPaymentsSection.tsx` | Estimate banner from `holding.expectedInterestAmountCents` (pattern: `CouponPaymentsSection`) |
| `packages/web/src/utils/brFiLabels.ts` | Optional `COUPON_FREQUENCY_OPTIONS` PT labels (reuse bond labels if shared) |

No dashboard web changes — Home already consumes `/api/dashboard`.

---

## Test Strategy

| Layer | Focus | Requirement IDs |
| --- | --- | --- |
| **Domain unit** | Examples A–D ±1 cent; PRE_FIXED/IPCA/CDI/SELIC; null on gap; first/last coupon period | M11-001–006, M11-014 |
| **Migration** | Fresh DB + seeded pre-M11 fixture → column exists, default `annual` | M11-007 |
| **API repo** | CRUD frequency; GET estimate pre-fixed Example A; sparse history → `null` | M11-008, M11-009 |
| **Dashboard integration** | Semi-annual pre-fixed → 2 events/year @ 60_000; CDI monthly varying amounts | M11-010 |
| **Web component** | Form PT labels + payload; interest section estimate render | M11-012, M11-013 |

**Fixtures:** Domain tests use inline indicator arrays from spec Examples B–D. API tests seed `market_indicator_values` rows for integration paths.

**Gates:**

- P1: `npm run test -w @investment-tracker/bonds-domain && npm run test -w @investment-tracker/api`
- P2: `npm run test -w @investment-tracker/web`
- P3: `npm run lint && npm run test && npm run check:docs`

---

## Files Touched (implementation reference)

| Package | Primary files |
| --- | --- |
| `bonds-domain` | `brFiCouponEngine.ts` (new), `brFi.ts`, `types.ts`, `dashboardForecast.ts`, `index.ts`, `__tests__/brFiCouponEngine.test.ts` |
| `api` | `migrations/009_*.sql`, `schema.ts`, `repo.ts`, `routes/br-fi-holdings/*`, `__tests__/repo.test.ts`, `__tests__/routes.test.ts` |
| `web` | `BrFiForm.tsx`, `BrFiInterestPaymentsSection.tsx`, `types/api.ts`, `__tests__/*` |

---

## Out of Scope (confirm)

Daily accrual ledger, broker feeds, bond coupon changes, principal amortization, rewriting historical payments, web-side math — per spec.
