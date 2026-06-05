# M7 Design — Brazilian Fixed Income

**Spec**: `.specs/features/active/m7-brazilian-fixed-income/spec.md`  
**Status**: Draft (2026-05-29)  
**Depends on**: M5, M6

---

## Architecture Overview

```mermaid
graph TD
    subgraph Web
        LIST[/holdings/brazilian-fixed-income]
        FORM[new / :id forms]
        NAV[TopNav BRFI link]
    end

    subgraph API
        CRUD[/api/br-fi-holdings CRUD]
        PF[portfolio summary — include BRFI]
    end

    subgraph Domain
        VAL[brFiValidators.ts]
    end

    subgraph DB
        BRFI[br_fi_holdings]
        HT[holding_types]
        ACC[accounts + account_currencies]
    end

    LIST --> CRUD
    FORM --> CRUD
    CRUD --> VAL
    CRUD --> BRFI
    BRFI --> HT
    BRFI --> ACC
    PF --> BRFI
```

---

## Schema: `br_fi_holdings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | |
| `account_id` | integer FK NOT NULL | |
| `holding_type_id` | integer FK NOT NULL | Always BRFI type |
| `name` | text NOT NULL | |
| `product_type` | text NOT NULL | enum |
| `indexing_type` | text NOT NULL | enum |
| `cdi_percentage` | real NULL | when CDI |
| `ipca_spread_percent` | real NULL | when IPCA+Spread |
| `pre_fixed_rate_percent` | real NULL | when Pre-Fixed |
| `purchase_date` | timestamp NOT NULL | |
| `maturity_date` | timestamp NOT NULL | |
| `invested_amount_cents` | integer NOT NULL | |
| `currency_code` | text FK NOT NULL | from account at create |
| `updated_at` | timestamp | |

**Check constraints (app-level via Zod):**

- `maturity_date` > `purchase_date`
- Indexing params match `indexing_type`

---

## Domain (`packages/bonds-domain/src/brFi.ts`)

- `PRODUCT_TYPES`, `INDEXING_TYPES` const arrays
- `brFiHoldingCreateSchema`, `brFiHoldingUpdateSchema` (Zod)
- `validateIndexingParams(indexingType, body)` helper

---

## API Routes

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/br-fi-holdings` | Optional `accountId` filter |
| GET | `/api/br-fi-holdings/:id` | |
| POST | `/api/br-fi-holdings` | Sets holding_type_id = BRFI |
| PATCH | `/api/br-fi-holdings/:id` | |
| DELETE | `/api/br-fi-holdings/:id` | 204 |

**JSON shape (response):**

```json
{
  "id": 1,
  "holdingType": { "slug": "brazilian-fixed-income", "name": "Brazilian Fixed Income" },
  "name": "LCI Banco X",
  "productType": "LCI",
  "indexingType": "CDI_PERCENTAGE",
  "cdiPercentage": 105,
  "purchaseDate": "2025-01-15",
  "maturityDate": "2027-01-15",
  "investedAmountCents": 10000000,
  "currencyCode": "BRL",
  "accountId": 2
}
```

**Create validation:**

- `currencyCode` ∈ account's `account_currencies`
- Indexing fields per type

---

## Portfolio Summary Changes

Extend `GET /api/portfolio/summary`:

- `totalInvestedCents` aggregates bond face/cost **and** BRFI `invested_amount_cents`
- Separate optional breakdown: `byHoldingType: [{ slug, totalNativeCents, currencyCode }]`
- Apply M6 `displayCurrency` conversion per holding native currency

Bond-specific fields (coupon income) unchanged — BRFI excluded from income/coupon endpoints in M7.

---

## Web

| Route | Page |
| --- | --- |
| `/holdings/brazilian-fixed-income` | `BrFiHoldings.tsx` — table list |
| `/holdings/brazilian-fixed-income/new` | `BrFiFormPage.tsx` create |
| `/holdings/brazilian-fixed-income/:id` | `BrFiFormPage.tsx` edit |

**Components:**

- `BrFiHoldingsTable` — mobile card layout like HoldingsTable
- `BrFiForm` — product type select, indexing conditional fields
- `IndexingFields.tsx` — show/hide CDI/IPCA/pre-fixed inputs

**TopNav:** Enable BRFI link (remove M5 placeholder).

**Home:** Summary cards include combined invested total.

---

## Testing Strategy

| Layer | Focus |
| --- | --- |
| Domain | Indexing validation matrix |
| API | CRUD, currency/account rules, 404/400 |
| Web | Form conditional fields, list CRUD flows |
| Integration | Portfolio summary with bonds + BRFI + BRL quotes |

---

## v2.0.0 Release Checklist

1. All M7 tasks complete
2. `.specs/features/active/m5|m6|m7-*` → `completed/`
3. Update ARCHITECTURE.md, STRUCTURE.md, FRONTEND.md, PROJECT.md
4. `npm run check:docs`
5. Tag `v2.0.0` via `scripts/investment-tracker-release.sh`
