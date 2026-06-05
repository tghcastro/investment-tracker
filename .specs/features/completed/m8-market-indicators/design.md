# M8 Design — Market Indicators

**Spec**: `.specs/features/completed/m8-market-indicators/spec.md`  
**Status**: Approved (2026-06-05)  
**Depends on**: M7 complete  
**Release**: **v2.0.0** (with M5–M9)

---

## Architecture Overview

```mermaid
graph TD
    subgraph Web
        MI[/market-indicators]
        MID[/market-indicators/:id]
        BRFI[BrFiForm indicator picker]
    end

    subgraph API
        ICRUD[/api/market-indicators CRUD]
        VCRUD[/api/market-indicators/:id/values CRUD]
        LATEST[GET .../latest]
        BRFIAPI[/api/br-fi-holdings — marketIndicatorId]
    end

    subgraph Domain
        MIVAL[marketIndicator.ts validators]
        LATESTFN[resolveLatestIndicatorValue]
        MAP[indexingCategoryForType]
    end

    subgraph DB
        IND[market_indicators]
        VAL[market_indicator_values]
        BRFI[br_fi_holdings.market_indicator_id]
    end

    MI --> ICRUD
    MID --> VCRUD
    MID --> LATEST
    BRFI --> ICRUD
    BRFI --> BRFIAPI
    ICRUD --> MIVAL
    VCRUD --> MIVAL
    BRFIAPI --> MIVAL
    LATEST --> LATESTFN
    LATESTFN --> VAL
    BRFIAPI --> BRFI
    BRFI --> IND
```

**AD-010:** Web sends HTTP params/bodies only. Latest value, category↔indexing validation, and BRFI indicator requirements run in `bonds-domain` + API/repo — never in React.

---

## Schema Changes

### `market_indicators`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | auto-increment |
| `slug` | text NOT NULL UNIQUE | uppercase, e.g. `CDI` |
| `name` | text NOT NULL | display name |
| `category` | text NOT NULL | `INTEREST_RATE` \| `INFLATION` \| `STOCK_INDEX` |
| `description` | text NULL | optional |
| `is_system` | integer NOT NULL DEFAULT 0 | 1 = seed row |
| `created_at` | timestamp_ms | |
| `updated_at` | timestamp_ms | |

### `market_indicator_values`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | |
| `indicator_id` | integer FK → market_indicators.id ON DELETE CASCADE | |
| `value_date` | text NOT NULL | YYYY-MM-DD |
| `value` | real NOT NULL | annualized percentage (14.75 = 14.75%) |
| `created_at` | timestamp_ms | |

**Unique:** `(indicator_id, value_date)`

### Alter `br_fi_holdings`

| Column | Type | Notes |
| --- | --- | --- |
| `market_indicator_id` | integer FK NULL → market_indicators.id | required logically for index-linked types |

**Migration `007_market_indicators.sql`:**

1. Create tables + seed 7 system indicators (spec catalog).
2. Add `market_indicator_id` column.
3. **Backfill** existing index-linked BRFI rows:

| indexing_type | Set market_indicator_id from slug |
| --- | --- |
| CDI_PERCENTAGE | CDI |
| IPCA_SPREAD | IPCA |
| SELIC | SELIC |
| PRE_FIXED | NULL |

Pre-fixed rows stay NULL.

---

## Domain (`packages/bonds-domain/src/marketIndicator.ts`)

```ts
export const INDICATOR_CATEGORIES = ['INTEREST_RATE', 'INFLATION', 'STOCK_INDEX'] as const;

export const DEFAULT_INDICATOR_SLUG_BY_INDEXING: Record<
  Exclude<IndexingType, 'PRE_FIXED'>,
  string
> = {
  CDI_PERCENTAGE: 'CDI',
  IPCA_SPREAD: 'IPCA',
  SELIC: 'SELIC',
};

export function requiredIndicatorCategory(
  indexingType: IndexingType
): IndicatorCategory | null;

export function validateMarketIndicatorForIndexing(
  indexingType: IndexingType,
  indicator: { category: IndicatorCategory } | null
): { ok: true } | { ok: false; fields: Record<string, string[]> };

export function resolveLatestIndicatorValue(
  values: Array<{ valueDate: string; value: number }>,
  asOfDate?: string // default: today UTC YYYY-MM-DD
): { valueDate: string; value: number } | null;
```

**Latest value rule (M8-12):**

1. Filter values where `valueDate <= asOfDate`.
2. If any, pick max `valueDate`.
3. Else pick max `valueDate` across all values (future-dated fallback).
4. If no values, return `null`.

**Zod schemas:**

- `createMarketIndicatorSchema` — slug (normalized uppercase), name, category, optional description
- `updateMarketIndicatorSchema` — name, category, description (custom only at repo layer)
- `createIndicatorValueSchema` — valueDate, value (finite number)
- `updateIndicatorValueSchema` — valueDate and/or value
- Extend `brFiHoldingCreateSchema` / `update` with optional `marketIndicatorId`; cross-field refine calls `validateMarketIndicatorForIndexing`

---

## API Surface

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/market-indicators` | Optional `category` filter; ordered by name; each row includes `latestValue`, `valueCount` |
| GET | `/api/market-indicators/:id` | Detail + `latestValue`, `valueCount` |
| POST | `/api/market-indicators` | Create custom (`isSystem: false`) |
| PATCH | `/api/market-indicators/:id` | Custom: name/category/description; system: **description only** |
| DELETE | `/api/market-indicators/:id` | 400 if system; 409 if referenced by BRFI; cascade values |
| GET | `/api/market-indicators/:id/values` | Optional `fromDate`, `toDate`; order date DESC |
| POST | `/api/market-indicators/:id/values` | Create value |
| PATCH | `/api/market-indicators/:id/values/:valueId` | Update |
| DELETE | `/api/market-indicators/:id/values/:valueId` | Delete |
| GET | `/api/market-indicators/:id/latest` | `{ latestValue: { valueDate, value } \| null }` |

### BRFI changes

**Request body (create/update):**

- `marketIndicatorId`: string (positive int id) — **required** when `indexingType` ∈ {CDI_PERCENTAGE, IPCA_SPREAD, SELIC}
- **absent/null** when PRE_FIXED

**Response embed:**

```json
{
  "marketIndicatorId": "3",
  "marketIndicator": {
    "id": "3",
    "slug": "CDI",
    "name": "CDI",
    "category": "INTEREST_RATE",
    "latestValue": { "valueDate": "2026-06-01", "value": 14.75 }
  }
}
```

When no values: `"latestValue": null`.

Repo loads indicator + values once per list row (batch query for list performance — single JOIN + aggregate or subquery for latest).

---

## Web Changes

| Route | Page | Behavior |
| --- | --- | --- |
| `/market-indicators` | `MarketIndicators.tsx` | Table: slug, name, category label, latest value %, value count; link to detail |
| `/market-indicators/:id` | `MarketIndicatorDetail.tsx` | Header + values table CRUD (mirror `CurrencyQuotes.tsx` patterns) |

| Component | Change |
| --- | --- |
| `TopNav.tsx` | Add **Market Indicators** link (after Currencies) |
| `BrFiForm.tsx` | When indexing ≠ PRE_FIXED: `<Select>` from `GET /api/market-indicators?category=...`; default id from API list matching default slug (web compares `slug` from response — no local category mapping) |
| `IndexingFields.tsx` | Host indicator picker or sibling field in form |
| `types/api.ts` | `ApiMarketIndicator`, `ApiIndicatorValue`, extend `ApiBrFiHolding` |

**Web must not:**

- Compute latest value from values array
- Filter indicators by category client-side when API supports `?category=`
- Validate indicator↔indexing compatibility (show API `fields.marketIndicatorId` errors)

**Nav decision:** Top-level **Market Indicators** → `/market-indicators` (parallel to Currencies).

---

## Error Codes

| Code | When |
| --- | --- |
| `VALIDATION_ERROR` | Duplicate slug/date, invalid value, category mismatch, missing marketIndicatorId |
| `NOT_FOUND` | Unknown indicator/value id |
| `CONFLICT` | Delete indicator referenced by BRFI |
| `FORBIDDEN` / `VALIDATION_ERROR` | Delete or restricted edit on system indicator |

Use existing error middleware patterns (`fields` map for 400).

---

## Testing Strategy

| Layer | Focus |
| --- | --- |
| Domain | `resolveLatestIndicatorValue` edge cases; `validateMarketIndicatorForIndexing` matrix |
| Repo | Indicator/value CRUD; uniqueness; cascade delete; BRFI FK |
| API | Full route integration; BRFI create/update with indicator; list embeds latestValue |
| Web | List/detail CRUD flows; BrFiForm picker visible/hidden by indexing type; API error display |

**Fixtures:** CDI values on 2026-04-01, 2026-05-01, 2026-06-01; verify latest as of 2026-06-05 = 2026-06-01 / 14.75.

---

## Migration / Backward Compatibility

- Existing BRFI API clients: new optional-then-required field on write; responses gain `marketIndicatorId` + `marketIndicator`
- Backfill migration assigns default seeds — existing index-linked holdings valid without user action
- M9 dashboard consumes `latestValue` from indicator embed or `/latest` — no web calc

---

## Docs to Update (P3)

- `.specs/codebase/STRUCTURE.md` — routes, domain file
- `docs/FRONTEND.md` — `/market-indicators` routes, BrFiForm field
- `.specs/codebase/API-FIRST.md` — mark M8 shipped when complete

**Not in M8:** v2.0.0 tag (waits for M9), archive to `completed/` at M8 ship gate.
