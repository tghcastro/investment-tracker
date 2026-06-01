# M6 Tasks — Multi-Currency Support

**Design**: `.specs/features/active/m6-multi-currency/design.md`  
**Spec**: `.specs/features/active/m6-multi-currency/spec.md`  
**Status**: Complete  
**Depends on**: M5 complete

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — Schema & FX domain** | T1–T7 | Currencies, quotes, account junction, FX helpers | domain + api unit tests |
| **P2 — API & account integration** | T8–T16 | Currency/quote routes, account + bond currency | `npm run test -w @investment-tracker/api` |
| **P3 — Web UI** | T17–T24 | Pages, selector, forms, Home/Holdings | `npm run lint && npm run test` |

**Suggested branches:** `m6-p1-schema-fx` → `m6-p2-api` → `m6-p3-web`

---

## Task Breakdown

### T1 [P1]: Schema — `currencies` + seed migration

**Requirement**: M6-02  
**Where**: `schema.ts`, migrations  
**Commit**: `feat(api): currencies table and seed`

---

### T2 [P1]: Schema — `currency_quotes`

**Requirement**: M6-03  
**Depends on**: T1  
**Commit**: `feat(api): currency_quotes table`

---

### T3 [P1]: Schema — `account_currencies` + bond `currency_code`

**Requirement**: M6-08, M6-10  
**Depends on**: T1  
**Commit**: `feat(api): account currencies and bond currency_code`

---

### T4 [P1]: Domain — FX conversion module

**Requirement**: M6-07  
**Where**: `packages/bonds-domain/src/currency.ts`, unit tests  
**Commit**: `feat(domain): currency conversion helpers`

---

### T5 [P1]: Repo — currency + quote CRUD

**Requirement**: M6-03–M6-05  
**Depends on**: T2  
**Commit**: `feat(api): repo currency quotes`

---

### T6 [P1]: Repo — account currencies + validation

**Requirement**: M6-08–M6-10  
**Depends on**: T3  
**Commit**: `feat(api): repo account currency junction`

---

### T7 [P1]: Repo — latest quote lookup + available currencies

**Requirement**: M6-06  
**Depends on**: T5  
**Commit**: `feat(api): quoted currency availability`

---

### T8 [P2]: Routes — GET currencies + available

**Requirement**: M6-01, M6-02, M6-06  
**Depends on**: T5, T7  
**Commit**: `feat(api): GET /api/currencies`

---

### T9 [P2]: Routes — currency quotes CRUD

**Requirement**: M6-03–M6-05  
**Depends on**: T5  
**Commit**: `feat(api): currency quote CRUD routes`

---

### T10 [P2]: Routes — accounts currencyCodes on create/update

**Requirement**: M6-08, M6-09  
**Depends on**: T6  
**Commit**: `feat(api): account currency configuration`

---

### T11 [P2]: Routes — bond holding currencyCode

**Requirement**: M6-10  
**Depends on**: T6  
**Commit**: `feat(api): bond holding currency validation`

---

### T12 [P2]: Routes — portfolio summary displayCurrency

**Requirement**: M6-07, M6-12  
**Depends on**: T4, T7  
**Commit**: `feat(api): portfolio summary display currency`

---

### T13 [P2]: Routes — holdings list displayCurrency

**Requirement**: M6-11, M6-12  
**Depends on**: T4, T7  
**Commit**: `feat(api): holdings display currency conversion`

---

### T14 [P2]: API integration tests — quotes + validation

**Depends on**: T8–T13  
**Commit**: `test(api): M6 multi-currency coverage`

---

### T15 [P2]: API regression gate

**Depends on**: T14  
**Gate**: `npm run test -w @investment-tracker/api`

---

### T16 [P2]: Bruno collection entries (optional)

**Where**: `bruno/`  
**Commit**: `docs(bruno): currency and quote requests`

---

### T17 [P3]: Web — types + DisplayCurrencyProvider

**Requirement**: M6-13, M6-14  
**Commit**: `feat(web): display currency context`

---

### T18 [P3]: Web — CurrencySelector component

**Requirement**: M6-11, M6-13  
**Commit**: `feat(web): currency selector`

---

### T19 [P3]: Web — `/currencies` read-only page

**Requirement**: M6-01  
**Commit**: `feat(web): currencies list page`

---

### T20 [P3]: Web — `/currencies/quotes` CRUD page

**Requirement**: M6-03–M6-05  
**Commit**: `feat(web): currency quotes management`

---

### T21 [P3]: Web — AccountForm multi-currency

**Requirement**: M6-08  
**Commit**: `feat(web): account currency selection`

---

### T22 [P3]: Web — HoldingForm currency + Holdings/Home selector

**Requirement**: M6-10–M6-14  
**Commit**: `feat(web): holding currency and display conversion UI`

---

### T23 [P3]: Web tests + TopNav links

**Commit**: `test(web): M6 currency UI`

---

### T24 [P3]: M6 gate

**Gate**: `npm run lint && npm run test`  
**Commit**: `docs: mark M6 multi-currency complete`
