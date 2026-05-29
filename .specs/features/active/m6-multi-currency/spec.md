# M6 — Multi-Currency Support Specification

**Status:** Draft (2026-05-29)  
**Source:** `temp.spec.md` — Multi-Currency Support  
**Depends on:** M5 (holding framework; bond holdings remain primary asset in M6)  
**Release:** Part of **v2.0.0** (declared after M7 ships)

## Problem Statement

v1 stores all monetary values as unitless numbers with no currency context — adequate for a single-currency bond portfolio. Supporting Brazilian fixed income (M7) and international bonds requires **ISO currencies**, **manual exchange-rate quotes**, **per-account currency configuration**, and **display-currency conversion** on Holdings and Home.

USD is the system **base currency** for quote storage. Users manage quotes manually; no market-data feeds.

## Goals

- [ ] System-defined currency catalog (9 ISO 4217 currencies) — read-only list page
- [ ] Currency quote CRUD (USD → target); one quote per currency per day
- [ ] Only currencies with ≥1 quote available for portfolio display/valuation
- [ ] Accounts configure one or more allowed currencies; holdings use account currencies
- [ ] Display-currency selector on Holdings and Home; converted values show target symbol
- [ ] Automated test coverage per TESTING.md

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| User CRUD on currency catalog | Spec: system-defined via DB script |
| Automatic quote retrieval / real-time rates | Spec out of scope |
| File-based quote import | Spec out of scope |
| Cross-rate quotes (EUR → BRL direct) | Base is USD; cross rates derived at display time |
| Historical portfolio charts in multiple currencies | Future Considerations |
| BRFI-specific UI | M7 |
| Authentication | Out of scope |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Base currency | **USD** fixed | temp.spec.md |
| Quote storage | **`currency_quotes`**: date, target_currency_id, rate (1 USD = X target) | Spec attributes |
| Quote uniqueness | **One row per (date, target_currency_id)** | Business rule |
| Quote date | **Calendar date** (YYYY-MM-DD), not timestamp | Daily rates |
| Display conversion | **Latest quote on or before as-of date** per target currency; default as-of = today | Practical solo use |
| Amount storage | **Native currency on holding** (integer cents); bonds get `currency_code` column | FR-MC-004 |
| Existing bonds migration | Default **`USD`** on all holdings; accounts default **USD only** | Backward compat |
| Account currencies | **`account_currencies`** junction (account_id, currency_code) | FR-MC-004 |
| Display currency persistence | **localStorage** key `displayCurrency` | Same pattern as no server prefs in v1 |
| Currencies route | **`/currencies`** list (read-only) | FR-MC-001 |
| Quotes route | **`/currencies/quotes`** management UI | FR-MC-002 |
| Portfolio API | Query param **`displayCurrency=USD`** on summary + holdings list aggregations | Server-side conversion |
| Unquoted currency | **Excluded** from selector; holdings in unquoted currency show native symbol only | FR-MC-003 |

---

## Supported Currencies (seed)

| Code | Name | Number | Symbol | Region |
| --- | --- | --- | --- | --- |
| ARS | Argentine Peso | 032 | $ | Argentina |
| AUD | Australian Dollar | 036 | $ | Australia |
| EUR | Euro | 978 | € | Europe |
| BRL | Brazilian Real | 986 | R$ | Brazil |
| CAD | Canadian Dollar | 124 | $ | Canada |
| CNY | Yuan Renminbi | 156 | ¥ | China |
| DKK | Danish Krone | 208 | kr | Denmark |
| GBP | Pound Sterling | 826 | £ | United Kingdom |
| USD | US Dollar | 840 | $ | United States |

---

## User Stories

### P1: Currency list (read-only) ⭐ MVP

**User Story**: As a user, I want to see all supported currencies so I know which units the system handles.

**Acceptance Criteria** (FR-MC-001):

1. WHEN I open `/currencies` THEN page SHALL list code, name, symbol, country/region
2. WHEN `GET /api/currencies` THEN response SHALL return all seeded currencies
3. WHEN user attempts create/update/delete currency via API THEN SHALL return **405** or route absent

**Requirement IDs**: M6-01, M6-02

---

### P1: Currency quote management ⭐ MVP

**User Story**: As a user, I want to enter daily exchange rates so portfolio values can convert to my chosen display currency.

**Acceptance Criteria** (FR-MC-002):

1. WHEN I open `/currencies/quotes` THEN I can create, edit, and delete quotes
2. WHEN I create a quote THEN fields are date, target currency, rate (base USD implicit)
3. WHEN duplicate date + target currency THEN API returns **409** or **400** validation error
4. WHEN quote deleted THEN currency may drop from display selector if no quotes remain

**Requirement IDs**: M6-03, M6-04, M6-05

---

### P1: Quote-gated display currencies ⭐ MVP

**User Story**: As a user, I only want to display portfolios in currencies that have exchange rates.

**Acceptance Criteria** (FR-MC-003):

1. WHEN building display-currency options THEN only currencies with ≥1 quote SHALL appear
2. WHEN USD selected THEN no conversion applied (rate 1)
3. WHEN target has quotes THEN conversion uses latest quote on or before as-of date

**Requirement IDs**: M6-06, M6-07

---

### P1: Account currency configuration ⭐ MVP

**User Story**: As a user, I want each account to allow specific currencies so holdings stay consistent with where they're held.

**Acceptance Criteria** (FR-MC-004):

1. WHEN creating/editing account THEN I can select one or more allowed currencies
2. WHEN account saved THEN at least one currency required (default USD)
3. WHEN creating bond holding THEN currency MUST be one of account's allowed currencies
4. WHEN invalid currency for account THEN API returns **400**

**Requirement IDs**: M6-08, M6-09, M6-10

---

### P2: Holdings display currency ⭐ MVP

**User Story**: As a user, I want to pick a display currency on the Holdings page.

**Acceptance Criteria** (FR-MC-005):

1. WHEN on `/holdings` THEN currency selector visible
2. WHEN selection changes THEN monetary columns convert and show target symbol
3. WHEN no quote for display currency THEN selector excludes that currency

**Requirement IDs**: M6-11, M6-12

---

### P2: Home display currency

**User Story**: As a user, I want Home dashboard totals in the same display currency as Holdings.

**Acceptance Criteria** (FR-MC-006):

1. WHEN on `/` THEN same selector behavior as Holdings
2. WHEN display currency changes on either page THEN both use same persisted preference

**Requirement IDs**: M6-13, M6-14

---

## Success Criteria

M6 complete when:

1. Currency catalog + quote CRUD API and UI work
2. Accounts and bond holdings enforce currency rules
3. Holdings + Home convert totals with selected display currency
4. `npm run lint && npm run test` passes
5. ROADMAP M6 marked complete; proceed to M7

---

## Requirement Traceability

| ID | FR | Summary |
| --- | --- | --- |
| M6-01 | MC-001 | Currency list page |
| M6-02 | MC-001 | GET /api/currencies |
| M6-03 | MC-002 | Quote create |
| M6-04 | MC-002 | Quote update/delete |
| M6-05 | MC-002 | Duplicate quote rejected |
| M6-06 | MC-003 | Quoted currencies only in selector |
| M6-07 | MC-003 | Conversion uses latest quote |
| M6-08 | MC-004 | Account multi-currency |
| M6-09 | MC-004 | ≥1 currency per account |
| M6-10 | MC-004 | Holding currency validation |
| M6-11 | MC-005 | Holdings currency selector |
| M6-12 | MC-005 | Converted values + symbol |
| M6-13 | MC-006 | Home currency selector |
| M6-14 | MC-006 | Shared display preference |
