# M6 Design — Multi-Currency Support

**Spec**: `.specs/features/active/m6-multi-currency/spec.md`  
**Status**: Draft (2026-05-29)  
**Depends on**: M5 complete

---

## Architecture Overview

```mermaid
graph TD
    subgraph Web
        CL[/currencies]
        CQ[/currencies/quotes]
        DS[DisplayCurrencyContext]
        HL[Holdings + Home]
    end

    subgraph API
        CUR[GET /api/currencies]
        QCRUD[/api/currency-quotes CRUD]
        ACC[accounts + currencies]
        PF[portfolio summary + displayCurrency]
    end

    subgraph Domain
        FX[convertAmount / latestQuote]
    end

    subgraph DB
        C[currencies]
        Q[currency_quotes]
        AC[account_currencies]
        BH[bond_holdings.currency_code]
    end

    CL --> CUR
    CQ --> QCRUD
    HL --> DS
    DS --> PF
    PF --> FX
    FX --> Q
```

---

## Schema Changes

### `currencies` (read-only seed)

| Column | Type |
| --- | --- |
| `code` | text PK (ISO 4217) |
| `number` | text NOT NULL |
| `name` | text NOT NULL |
| `symbol` | text NOT NULL |
| `region` | text NOT NULL |

Seed all 9 currencies from spec.

### `currency_quotes`

| Column | Type |
| --- | --- |
| `id` | integer PK |
| `quote_date` | text NOT NULL (YYYY-MM-DD) |
| `target_currency_code` | text FK → currencies.code |
| `rate` | real NOT NULL (1 USD = rate × target) |
| `created_at` | timestamp |

**Unique:** `(quote_date, target_currency_code)`

Base currency USD is implicit — no row stores USD→USD.

### `account_currencies`

| Column | Type |
| --- | --- |
| `account_id` | integer FK |
| `currency_code` | text FK |

**Unique:** `(account_id, currency_code)`

### Alter `bond_holdings`

| Column | Type |
| --- | --- |
| `currency_code` | text FK → currencies.code NOT NULL DEFAULT 'USD' |

Migration: set all existing to USD; seed `account_currencies` with USD for every account.

---

## Domain: FX conversion (`bonds-domain` or new `currency.ts`)

```ts
// Pseudocode
function convertFromUsdCents(
  amountUsdCents: number,
  targetCode: string,
  quote: { rate: number }
): number;

function convertNativeCents(
  amountNativeCents: number,
  nativeCode: string,
  targetCode: string,
  quotes: QuoteMap,
  asOfDate: string
): number;
```

**Rules:**

1. Native → USD: divide by USD→native rate (or multiply by inverse)
2. USD → target: multiply by USD→target rate
3. Cross (EUR holding → BRL display): native → USD → target
4. Missing quote: return null; UI shows native only

Store money as **integer cents** in holding native currency (extend existing convention).

---

## API Surface

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/currencies` | Full catalog |
| GET | `/api/currencies/available` | Codes with ≥1 quote (for selector) |
| GET | `/api/currency-quotes` | Optional filters: `targetCurrency`, `fromDate`, `toDate` |
| POST | `/api/currency-quotes` | Create |
| PATCH | `/api/currency-quotes/:id` | Update rate/date |
| DELETE | `/api/currency-quotes/:id` | Delete |
| GET | `/api/portfolio/summary?displayCurrency=BRL` | Converted totals |
| GET | `/api/holdings?displayCurrency=BRL` | Per-row `displayAmount` optional |

### Account payloads

`POST/PATCH /api/accounts` accept `currencyCodes: string[]` (min 1).

Bond `POST/PATCH` accept `currencyCode`; validated against account.

---

## Web Changes

| Component | Change |
| --- | --- |
| `DisplayCurrencyProvider` | Context + localStorage; wraps App |
| `CurrencySelector` | Dropdown from `/api/currencies/available` |
| `CurrenciesPage` | Read-only table |
| `CurrencyQuotesPage` | CRUD table + form |
| `AccountForm` | Multi-select currencies |
| `HoldingForm` | Currency select (filtered by account) |
| `Home`, `Holdings` | Wire selector; pass query param to API |
| `TopNav` | Links: Currencies, Quotes (under Settings group or top-level — design: **Settings submenu** or standalone **Currencies**) |

**Nav decision:** Add **Currencies** top-level link → `/currencies`; quotes as tab or sub-route `/currencies/quotes`.

---

## Testing Strategy

| Area | Tests |
| --- | --- |
| FX math | Unit tests in domain — edge cases, rounding |
| Quote uniqueness | API integration 409 |
| Account currency validation | API integration |
| Display conversion | API portfolio summary with mock quotes |
| Web | CurrencySelector, quotes form validation |

---

## Migration / Backward Compatibility

- All existing monetary data treated as USD
- API responses add `currencyCode` on holdings (default USD)
- Clients ignoring `displayCurrency` param see unchanged numbers when USD selected
