# M3 Design — Coupon Income & Cash Flows

**Spec**: `.specs/features/m3-coupon-income/spec.md`  
**Status**: Approved (2026-05-23)  
**Scope**: Large — full design + task breakdown required before Execute

---

## Architecture Overview

M3 extends the M1/M2 stack with **no new packages** and **no schema migration**. The `coupon_payments` table and repo `insertCouponPayment` / `listCouponPaymentsByHolding` already exist from M1; M3 adds CRUD completion, portfolio income aggregation, schedule estimation, and web UI.

Same flow: **Web → Fastify API → bonds-domain validators + schedule helpers → repo → SQLite**.

```mermaid
graph TD
    subgraph Web
        HFP[HoldingFormPage + CouponPaymentsSection]
        INC[Income page]
        HOME[Home YTD + upcoming]
    end

    subgraph API
        CP[/api/coupon-payments CRUD]
        IS[/api/portfolio/income-summary]
        UC[/api/portfolio/upcoming-coupons]
    end

    subgraph Domain
        VAL[Zod validators]
        SCH[couponSchedule helpers]
    end

    subgraph Repo
        R[repo.ts — payment CRUD + aggregates]
    end

    HFP --> CP
    INC --> IS
    HOME --> IS
    HOME --> UC
    CP --> VAL
    CP --> R
    IS --> R
    UC --> SCH
    UC --> R
    SCH --> R
```

**Layer split:**

| Concern | Location |
| --- | --- |
| Payment date bounds (`purchaseDate ≤ paymentDate ≤ maturityDate`) | bonds-domain helper + route enforcement |
| Expected amount + calendar stepping | bonds-domain `couponSchedule.ts` (pure, unit-tested) |
| Income aggregation SQL | repo `getIncomeSummary` |
| Upcoming coupon merge/sort/limit | repo calls domain schedule per holding |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| Route registration pattern | `packages/api/src/routes/**` | One `register*` fn per file; wire in `server.ts` |
| `createCouponPaymentSchema` | `bonds-domain/validators.ts` | POST body; extend with `updateCouponPaymentSchema` |
| `validationErrorBody`, `NotFoundError` | `middleware/errors.ts` | Unchanged; map holding-missing → 404 in routes |
| `mapRepoError` / `RepoError` | `repo.ts`, `errors.ts` | FK on insert → pre-check holding for 404 |
| `toApiBondHolding` / date ISO helpers | `routes/holdings/serialize.ts` | Mirror as `toApiCouponPayment` |
| `useApi` + `useApiMutation` | `hooks/` | Payment CRUD + income page fetches |
| Form primitives | `components/forms/` | `FormField`, `TextInput`, `ConfirmDialog` |
| `EmptyState`, `ErrorBanner`, `PageHeader` | `components/ui/` | Payment list empty, income page |
| `formatCurrency`, `formatDate` | `utils/format.ts` | All payment displays |
| `parseDollarsToCents` pattern | `HoldingForm.tsx` (inline) | **Extract** to `utils/money.ts` for payment form reuse |
| `HoldingFormPage` edit layout | `pages/HoldingFormPage.tsx` | Append `CouponPaymentsSection` below form |
| `Home` summary cards | `pages/Home.tsx` | Add YTD income card + upcoming list |
| `registerPortfolioSummary` | `routes/portfolio/summary.ts` | Sibling files for income-summary + upcoming-coupons |

### Integration Points

- **API ← domain:** Zod for shape; `assertPaymentDateWithinHolding` for bounds after loading holding
- **Repo ← schema:** Existing `coupon_payments` table; join `bond_holdings` for income issuer labels
- **Web ← API:** Mutation hook parses `{ code, message, fields }`; dates as ISO strings in JSON

### No Migration

`coupon_payments` table (M1) is sufficient. No Drizzle journal entry for M3.

---

## Domain Layer (`packages/bonds-domain`)

### New module: `src/couponSchedule.ts`

Pure helpers — no HTTP/DB. Export from `index.ts`.

```ts
/** semi-annual=2, quarterly=4, monthly=12, annual=1 */
export function paymentsPerYear(frequency: CouponFrequency): number;

/** Calendar month step for schedule estimation */
export function monthStepForFrequency(frequency: CouponFrequency): number;

/**
 * Nominal per-payment amount in cents.
 * @param couponRateDecimal — repo storage (e.g. 0.0425), NOT API percent
 */
export function expectedCouponAmountCents(
  faceValue: number,
  couponRateDecimal: number,
  frequency: CouponFrequency
): number;

/**
 * UTC date-only comparison. Inclusive bounds.
 * @throws or returns false — use with route validation
 */
export function isPaymentDateWithinHolding(
  paymentDate: Date,
  purchaseDate: Date,
  maturityDate: Date
): boolean;

/**
 * Step calendar months from purchaseDate until maturity.
 * Returns dates where: date > afterDate (UTC day) AND date <= maturityDate (UTC day).
 */
export function generateEstimatedCouponDates(
  purchaseDate: Date,
  maturityDate: Date,
  frequency: CouponFrequency,
  afterDate?: Date
): Date[];
```

**Formula (locked in spec):**

```
expectedCouponAmountCents = round(faceValue × couponRateDecimal / paymentsPerYear)
```

Example: face 1_000_000 cents, rate 0.0425, semi-annual → `1_000_000 × 0.0425 / 2 = 21_250` ($212.50).

**Calendar stepping (locked in spec):**

| Frequency | Month step |
| --- | --- |
| semi-annual | +6 |
| quarterly | +3 |
| monthly | +1 |
| annual | +12 |

Start cursor at `purchaseDate`; repeatedly add step until past maturity. Skip dates on or before today (UTC day). Include dates on or before maturity.

### New validators

| Schema | Purpose |
| --- | --- |
| `updateCouponPaymentSchema` | `paymentDate` optional, `amount` optional (int positive); at least one field required |

`createCouponPaymentSchema` unchanged (amount positive, future dates allowed).

### Route-level bounds validation

Zod cannot validate against holding context. Shared API helper:

```ts
// packages/api/src/routes/coupon-payments/validate.ts
export function assertPaymentDateWithinHoldingOrThrow(
  paymentDate: Date,
  holding: BondHolding
): void;
```

On violation → `400` `{ code: 'VALIDATION_ERROR', message: '...', fields: { paymentDate: ['...'] } }`.

Apply on POST (after holding load) and PATCH (re-load holding linked to payment).

### Tests

| File | Cases |
| --- | --- |
| `couponSchedule.test.ts` | paymentsPerYear, expected amount ($212.50 case), month stepping, skip past/today, stop at maturity |
| `validators.test.ts` | `updateCouponPaymentSchema` partial body, empty PATCH rejected |

---

## Repo Layer (`packages/api/src/repo.ts`)

### Fix existing

| Method | Change |
| --- | --- |
| `listCouponPaymentsByHolding` | Order by `paymentDate` **descending** (spec M3-08; currently asc) |

### New types

```ts
export type UpdateCouponPaymentData = {
  paymentDate?: Date;
  amount?: number;
};

export type IncomeSummaryByHolding = {
  holdingId: string;
  issuer: string;
  totalReceived: number;
  paymentCount: number;
};

export type IncomeSummaryPaymentRow = {
  id: string;
  paymentDate: string; // ISO date
  amount: number;
  holdingId: string;
  issuer: string;
};

export type IncomeSummary = {
  totalReceived: number;
  paymentCount: number;
  byHolding: IncomeSummaryByHolding[];
  payments: IncomeSummaryPaymentRow[];
};

export type UpcomingCoupon = {
  holdingId: string;
  issuer: string;
  estimatedDate: string;
  estimatedAmount: number;
};
```

### New / updated methods

| Method | Behavior |
| --- | --- |
| `getCouponPayment(id)` | Single row or `null` |
| `updateCouponPayment(id, partial)` | Update `paymentDate` and/or `amount`; return updated or `null` |
| `deleteCouponPayment(id)` | Hard delete; return `false` if missing |
| `getIncomeSummary(from, to)` | Inclusive UTC date range on `payment_date`; join holdings for `issuer`; compute totals, `byHolding` (sorted by `totalReceived` desc, omit zero), `payments` (sorted by `paymentDate` desc) |
| `getUpcomingCoupons(limit)` | All holdings → domain `generateEstimatedCouponDates` + `expectedCouponAmountCents` → merge → sort by date asc → slice `limit` |

**Income query notes:**

- Range filter: `payment_date >= startOfDay(from)` AND `payment_date <= endOfDay(to)` using UTC (match existing `toIsoDateString` convention)
- Empty portfolio → zeros and empty arrays

**Upcoming coupons notes:**

- Use holding's decimal `couponRate` from repo (not API percent)
- Holdings with missing/zero face → `estimatedAmount: 0`
- Default `limit`: 5 when query omitted

---

## API Layer

### Serialization

**New:** `packages/api/src/routes/coupon-payments/serialize.ts`

```ts
export function toApiCouponPayment(payment: CouponPayment): {
  id: string;
  bondHoldingId: string;
  paymentDate: string;   // YYYY-MM-DD
  amount: number;        // cents
  recordedAt: string;    // ISO datetime
};
```

Reuse `toIsoDateString` pattern from repo (extract to shared util or duplicate in serialize — prefer import from a small `dates.ts` if already duplicated).

### Routes (new files)

| File | Method | Path | Notes |
| --- | --- | --- | --- |
| `coupon-payments/post.ts` | POST | `/api/coupon-payments` | Parse body; `getBondHolding` → 404; bounds check → 400; 201 |
| `coupon-payments/list.ts` | GET | `/api/coupon-payments?bondHoldingId=` | Missing param → 400; unknown holding → 404; `[]` if none |
| `coupon-payments/get-by-id.ts` | GET | `/api/coupon-payments/:id` | 404 if missing |
| `coupon-payments/patch.ts` | PATCH | `/api/coupon-payments/:id` | Load payment → 404; load holding; bounds on new date; 200 |
| `coupon-payments/delete.ts` | DELETE | `/api/coupon-payments/:id` | 204; 404 if missing |
| `portfolio/income-summary.ts` | GET | `/api/portfolio/income-summary?from=&to=` | Default calendar year; `from > to` → 400; invalid date → 400 |
| `portfolio/upcoming-coupons.ts` | GET | `/api/portfolio/upcoming-coupons?limit=` | Default limit 5; parse positive int |

### Query param contract

| Param | Endpoint | Default | Validation |
| --- | --- | --- | --- |
| `bondHoldingId` | GET `/api/coupon-payments` | required | positive int string |
| `from` | GET income-summary | Jan 1 current UTC year | `YYYY-MM-DD` |
| `to` | GET income-summary | Dec 31 current UTC year | `YYYY-MM-DD` |
| `limit` | GET upcoming-coupons | `5` | positive int, max 50 (sanity cap) |

### Response: income-summary

```json
{
  "totalReceived": 42500,
  "paymentCount": 2,
  "byHolding": [
    { "holdingId": "1", "issuer": "US Treasury", "totalReceived": 42500, "paymentCount": 2 }
  ],
  "payments": [
    {
      "id": "3",
      "paymentDate": "2026-03-15",
      "amount": 21250,
      "holdingId": "1",
      "issuer": "US Treasury"
    }
  ]
}
```

`payments` array supports `/income` table in one fetch (spec M3-12; implied by page requirements).

### Error handling

| Condition | Status | Body |
| --- | --- | --- |
| Payment date before purchase or after maturity | 400 | `VALIDATION_ERROR` + `fields.paymentDate` |
| POST/PATCH holding not found | 404 | `NOT_FOUND` |
| GET list unknown holding | 404 | `NOT_FOUND` |
| GET/PATCH/DELETE unknown payment | 404 | `NOT_FOUND` |
| Missing `bondHoldingId` on list | 400 | `VALIDATION_ERROR` |
| Invalid date query params | 400 | `VALIDATION_ERROR` |
| `from > to` | 400 | `VALIDATION_ERROR` |
| Malformed JSON | 400 | Existing error middleware |

POST on archived account's holding: **allowed** (spec edge case — no archived guard on coupon payments).

### server.ts

Register all seven new route modules after existing portfolio summary.

---

## Web Layer

### Shared utility

**New:** `packages/web/src/utils/money.ts`

```ts
export function parseDollarsToCents(value: string): number | null;
export function centsToDollarInput(cents: number): string;
```

Refactor `HoldingForm.tsx` to import from `money.ts` (no behavior change).

### New components

| Component | Location | Purpose |
| --- | --- | --- |
| `CouponPaymentForm` | `components/CouponPaymentForm.tsx` | Date + amount (USD input → cents); client validation |
| `CouponPaymentsTable` | `components/CouponPaymentsTable.tsx` | Rows: date, amount, Edit/Delete actions |
| `CouponPaymentsSection` | `components/CouponPaymentsSection.tsx` | Section wrapper: expected hint, list, add/edit form, delete confirm |

**CouponPaymentsSection behavior (edit mode only):**

1. `GET /api/coupon-payments?bondHoldingId={id}` on mount
2. **Expected per payment** hint when holding has face value, coupon rate, frequency — label "Estimate" / helper text per M3-18
3. EmptyState + "Record payment" when no rows
4. Inline add form → POST → refresh list
5. Edit mode: GET `/api/coupon-payments/:id` or hydrate from row → PATCH → refresh
6. Delete → `ConfirmDialog` → DELETE → refresh list

**Expected hint (client-side):** Duplicate domain formula using API holding fields (`couponRate` is percent from API → divide by 100 before formula). Keeps UI responsive without extra API call; domain tests are source of truth.

### Pages

| Route | Component | Data |
| --- | --- | --- |
| `/holdings/:id` | `HoldingFormPage` + `CouponPaymentsSection` | Existing holding fetch + payments list |
| `/income` | `Income.tsx` (new) | `GET /api/portfolio/income-summary?from=&to=` |
| `/` | `Home.tsx` (extend) | Summary card: income-summary (calendar year); upcoming: `GET /api/portfolio/upcoming-coupons?limit=5` |

### Income page layout

```
PageHeader — "Coupon income"
Period filter — two <input type="date"> from / to; default current calendar year
Summary cards — totalReceived, paymentCount
By holding — table sorted by totalReceived desc
All payments — table: date, issuer (link to /holdings/:id optional), amount
```

On period change → rebuild query string → refetch income-summary.

### Home updates

When `positionCount > 0`:

1. **Coupon income (YTD)** metric card — same calendar-year default as API; show `$0.00` when zero (M3-16)
2. **Upcoming coupons** section — up to 5 rows: issuer, estimated date, estimated amount; label as estimates; hide or empty state when none (M3-21)

Fetch income-summary and upcoming-coupons in parallel (two `useApi` calls) — acceptable for Home; optional future merge not in M3 scope.

### TopNav

Add nav item:

```ts
{ to: '/income', label: 'Income', end: false }
```

Update `topNav.test.tsx` for new link.

### Router (`App.tsx`)

```tsx
<Route path="/income" element={<Income />} />
```

### Web types (`types/api.ts`)

```ts
export type ApiCouponPayment = {
  id: string;
  bondHoldingId: string;
  paymentDate: string;
  amount: number;
  recordedAt: string;
};

export type ApiIncomeSummaryByHolding = {
  holdingId: string;
  issuer: string;
  totalReceived: number;
  paymentCount: number;
};

export type ApiIncomeSummaryPaymentRow = {
  id: string;
  paymentDate: string;
  amount: number;
  holdingId: string;
  issuer: string;
};

export interface ApiIncomeSummary {
  totalReceived: number;
  paymentCount: number;
  byHolding: ApiIncomeSummaryByHolding[];
  payments: ApiIncomeSummaryPaymentRow[];
}

export type ApiUpcomingCoupon = {
  holdingId: string;
  issuer: string;
  estimatedDate: string;
  estimatedAmount: number;
};
```

### CSS

- `CouponPaymentsSection.css` — section spacing below holding form; estimate callout uses `body-sm` + muted caption
- `Income.css` — period filter bar, summary cards (reuse Home metric card classes where possible)

---

## Form Field Mapping (coupon payment)

| Field | Input | API field | Notes |
| --- | --- | --- | --- |
| Payment date | `<input type="date">` | `paymentDate` | `YYYY-MM-DD` |
| Amount | Number USD | `amount` | `parseDollarsToCents` → cents |

PATCH body omits `bondHoldingId`.

---

## Requirement Traceability (design mapping)

| ID | Design component |
| --- | --- |
| M3-01 | `CouponPaymentsSection` on `HoldingFormPage` |
| M3-02 | `coupon-payments/post.ts` |
| M3-03 | Bounds helper + cents validation |
| M3-04 | `CouponPaymentForm` edit + `patch.ts` |
| M3-05 | `get-by-id.ts` + 404 UI |
| M3-06 | `ConfirmDialog` + `delete.ts` |
| M3-07 | Repo delete + M2 holding delete regression |
| M3-08 | `list.ts` + repo desc order fix |
| M3-09 | `toApiCouponPayment` shape |
| M3-10 | `getIncomeSummary` + `income-summary.ts` |
| M3-11 | Default from/to in route |
| M3-12 | `Income.tsx` + payments array in response |
| M3-13 | `byHolding` in `IncomeSummary` |
| M3-14 | By-holding table on `/income` |
| M3-15 | Home YTD card |
| M3-16 | Home zero display |
| M3-17 | Expected hint in section |
| M3-18 | "Estimate" labeling |
| M3-19 | `upcoming-coupons.ts` + repo |
| M3-20 | `generateEstimatedCouponDates` |
| M3-21 | Home upcoming section |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Schedule logic location | bonds-domain `couponSchedule.ts` | Pure functions; unit test without DB; reusable if import added later |
| Income page payment rows | Include `payments[]` in income-summary | One fetch for summary + table; spec API table omits but UI needs rows |
| Expected hint on web | Client-side calc from holding props | Avoid extra endpoint; formula tested in domain |
| Payment list order | Repo SQL `ORDER BY payment_date DESC` | Spec M3-08; fix M1 asc ordering |
| POST missing holding | Route pre-check → 404 | Spec M3-02; clearer than FK 400 |
| Archived account coupons | No guard | Spec edge case — historical income allowed |
| UTC date comparisons | Match repo `toIsoDateString` | Consistent with M1/M2 date storage |
| `limit` max on upcoming | 50 | Prevent abuse; Home uses 5 |

---

## Testing Plan

| Layer | What to add |
| --- | --- |
| bonds-domain | `couponSchedule.test.ts`; `updateCouponPaymentSchema` tests |
| api repo | get/update/delete payment; income summary range + byHolding; upcoming merge/limit; list desc order |
| api routes | Each endpoint + date bounds 400 + 404 cases + income defaults + upcoming limit |
| web | `CouponPaymentForm` validation; `CouponPaymentsSection` list/add/edit/delete (mock fetch); `Income` period filter; Home YTD + upcoming; TopNav Income link |

**Regression:**

- DELETE holding after deleting all payments → 204
- DELETE holding with payments → 409 unchanged
- M2 portfolio summary unchanged

Gate: `npm run test` + `npm run lint` before merge.

---

## Execution Order (preview for tasks.md)

1. bonds-domain — `couponSchedule.ts` + validators + tests  
2. Repo — CRUD completion, order fix, `getIncomeSummary`, `getUpcomingCoupons` + repo tests  
3. API — serialize + coupon-payment routes + portfolio routes + route tests  
4. Web — `money.ts` extract + types  
5. Web — `CouponPaymentForm`, `CouponPaymentsSection`, wire into `HoldingFormPage`  
6. Web — `Income` page + TopNav + route  
7. Web — Home YTD + upcoming sections  
8. Regression pass + spec Success Criteria checklist  

---

## Next Phase

**Tasks** (`.specs/features/m3-coupon-income/tasks.md`) → **Approve tasks** → **Execute**
