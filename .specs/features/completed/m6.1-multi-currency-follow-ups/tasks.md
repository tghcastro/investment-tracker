# M6.1 Tasks — Multi-Currency Follow-Ups

**Design:** [design.md](./design.md)  
**Spec:** [spec.md](./spec.md)  
**Status:** Complete (2026-05-31)  
**Depends on:** M6 complete

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — FX domain & repo** | T1–T8 | Normalize rates, purchase-date maps, holding validation, per-holding conversion | `npm run test -w bonds-domain` + repo tests |
| **P2 — API routes & regression** | T9–T14 | Quote direction, holdings validation, fixture examples, deprecate holdings `asOfDate` | `npm run test -w api` |
| **P3 — Web UI** | T15–T22 | API-driven preview, render `converted*` fields only, quotes filters, docs | `npm run lint && npm run test` (no web FX math tests) |

**Suggested branches:** `m6.1-p1-fx-domain` → `m6.1-p2-api` → `m6.1-p3-web`

---

## Pre-approval validation

### Granularity check

| Task | Atomic? | Notes |
| --- | --- | --- |
| T1–T22 | ✅ | One deliverable each (fn, route group, component, or test suite) |

### Diagram ↔ dependencies

| Task | Depends on | Diagram edge |
| --- | --- | --- |
| T1 | — | root |
| T2 | T1 | T1→T2 |
| T3 | T1 | T1→T3 |
| T4 | T2, T3 | T2,T3→T4 |
| T5 | T4 | T4→T5 |
| T6 | T4 | T4→T6 |
| T7 | T5, T6 | T5,T6→T7 |
| T8 | T7 | T7→T8 |
| T9 | T5 | T5→T9 |
| T10 | T6, T7 | T6,T7→T10 |
| T11 | T7 | T7→T11 |
| T12 | T9–T11 | routes→T12 |
| T13 | T12 | T12→T13 |
| T14 | T13 | T13→T14 |
| T15 | T10 | T10→T15 |
| T16 | T15 | T15→T16 |
| T17 | T7 | T7→T17 |
| T18 | T17 | T17→T18 |
| T19 | T18 | T19 |
| T20 | T13 | T13→T20 |
| T21 | T16–T20 | UI→T21 |
| T22 | T21 | T21→T22 |

### Test co-location (TESTING.md)

| Task | Layer | Tests in task? |
| --- | --- | --- |
| T1–T4 | bonds-domain unit | ✅ |
| T5–T8 | api repo integration | ✅ |
| T9–T14 | api routes integration | ✅ (T12–T14 dedicated) |
| T15–T20 | web unit (RTL) | ✅ |
| T21–T22 | full gate / docs | gate only |

---

## Task Breakdown

### T1 [P1]: Domain — `normalizeUsdToTargetRate` + `rateDirection` schema

**Requirement:** M6.1-01, M6.1-02  
**Where:** `packages/bonds-domain/src/currency.ts`, `validators.ts`  
**Depends on:** —  
**Done when:** Unit tests cover USD→target passthrough and EUR→USD invert (0.85 from 1.17647)  
**Tests:** Extend `currency.test.ts`  
**Gate:** `npm run test -w bonds-domain`  
**Commit:** `feat(domain): normalize exchange rate direction`

---

### T2 [P1]: Domain — `hasApplicableQuote` helper

**Requirement:** M6.1-03, M6.1-06  
**Where:** `packages/bonds-domain/src/currency.ts`  
**Depends on:** T1  
**Done when:** USD returns true; missing history returns false; on/before date passes  
**Tests:** `currency.test.ts`  
**Gate:** `npm run test -w bonds-domain`

---

### T3 [P1]: Domain — document `buildQuoteRateMapForHolding` alias / export

**Requirement:** M6.1-03  
**Where:** `packages/bonds-domain/src/currency.ts`, `index.ts`  
**Depends on:** T1  
**Done when:** Public export used by API; fixture table tests pass  
**Tests:** Add spec fixture cases (8 rows from spec.md)  
**Gate:** `npm run test -w bonds-domain`

---

### T4 [P1]: Domain — holding quote validation function

**Requirement:** M6.1-06, M6.1-07  
**Where:** `packages/bonds-domain/src/validators.ts` or `currency.ts`  
**Depends on:** T2, T3  
**Done when:** `validateHoldingExchangeRate(currencyCode, purchaseDate, quoteHistory)` exported  
**Tests:** unit cases from spec validation table  
**Gate:** `npm run test -w bonds-domain`

---

### T5 [P1]: Repo — normalize rate on quote insert/update

**Requirement:** M6.1-01, M6.1-02  
**Where:** `packages/api/src/repo.ts`  
**Depends on:** T4  
**Done when:** Stored rate always USD→target regardless of input direction  
**Tests:** `repo.test.ts` quote CRUD cases  
**Gate:** `npm run test -w api`

---

### T6 [P1]: Repo — `assertApplicableQuote` on bond insert/update

**Requirement:** M6.1-06, M6.1-07  
**Where:** `packages/api/src/repo.ts`  
**Depends on:** T4  
**Done when:** Non-USD without quote throws; USD succeeds  
**Tests:** `repo.test.ts`  
**Gate:** `npm run test -w api`

---

### T7 [P1]: Repo — always attach `convertedFaceValue` + `convertedCurrency`

**Requirement:** M6.1-03, M6.1-04, M6.1-05, M6.1-16  
**Where:** `packages/api/src/repo.ts` (`listBondHoldingsFiltered`, `getPortfolioSummary`, types)  
**Depends on:** T5, T6  
**Done when:**
- Valuation runs **even when** `displayCurrency` omitted (default **USD**)
- No early-return skipping USD display
- Each row has `convertedFaceValue`, `convertedCurrency`; `conversionError` when quote missing
- All 8 spec fixture rows match; BRL→EUR indirect cases pass  
**Tests:** `repo.test.ts` `m6.1 conversion fixtures` + default-USD-without-query case  
**Gate:** `npm run test -w api`  
**Commit:** `fix(api): value holdings at purchase-date FX rates`

---

### T8 [P1]: P1 gate — domain + repo

**Requirement:** —  
**Depends on:** T7  
**Done when:** `npm run test -w bonds-domain && npm run test -w api` green  
**Gate:** full package tests for domain + api repo suites

---

### T9 [P2]: Routes — currency quote `rateDirection` on POST/PATCH

**Requirement:** M6.1-01, M6.1-02  
**Where:** `packages/api/src/routes/currency-quotes/crud.ts`  
**Depends on:** T5  
**Done when:** API accepts optional `rateDirection`; persisted rate normalized  
**Tests:** `routes.test.ts` invert case  
**Gate:** `npm run test -w api`

---

### T10 [P2]: Routes — holdings POST/PATCH exchange-rate errors

**Requirement:** M6.1-06, M6.1-09  
**Where:** `packages/api/src/routes/holdings/post.ts`, patch route  
**Depends on:** T6, T7  
**Done when:** 400 `EXCHANGE_RATE_REQUIRED` with fields; success when quote exists  
**Tests:** `routes.test.ts` table from spec  
**Gate:** `npm run test -w api`

---

### T11 [P2]: Routes — holdings list default `displayCurrency=USD`, remove `asOfDate`

**Requirement:** M6.1-05, M6.1-16  
**Where:** `packages/api/src/routes/holdings/list.ts`, `get-by-id.ts`, `serialize.ts`  
**Depends on:** T7  
**Done when:**
- `GET /api/holdings` without query returns `convertedCurrency: 'USD'` and correct `convertedFaceValue`
- `asOfDate` query removed or ignored with deprecation comment
- Response type documents `convertedFaceValue`, `convertedCurrency`, `conversionError`  
**Tests:** `routes.test.ts`  
**Gate:** `npm run test -w api`

---

### T11b [P2]: Route — `GET /api/fx/convert` preview

**Requirement:** M6.1-08, M6.1-09, M6.1-16  
**Where:** `packages/api/src/routes/fx/convert.ts`, register in `server.ts`  
**Depends on:** T7  
**Done when:** Preview matches repo conversion for fixture rows; 200 + `conversionError` when quote missing  
**Tests:** `routes.test.ts`  
**Gate:** `npm run test -w api`  
**Commit:** `feat(api): FX convert preview for holding form`

---

### T12 [P2]: API integration — full calculation fixture suite

**Requirement:** M6.1-03–M6.1-05 (fixtures)  
**Depends on:** T9–T11  
**Done when:** All 8 holdings × display currency expectations from spec pass via HTTP  
**Tests:** `routes.test.ts`  
**Gate:** `npm run test -w api`  
**Commit:** `test(api): M6.1 purchase-date conversion fixtures`

---

### T13 [P2]: API — portfolio summary purchase-date totals

**Requirement:** M6.1-05  
**Depends on:** T7  
**Done when:** Summary `displayTotalFaceValue` uses per-holding rates  
**Tests:** `routes.test.ts` multi-currency seed  
**Gate:** `npm run test -w api`

---

### T14 [P2]: P2 gate — `npm run test -w api`

**Depends on:** T12, T13  
**Gate:** `npm run test -w api`

---

### T15 [P3]: Web — HoldingForm calls `/api/fx/convert` (no local math)

**Requirement:** M6.1-08, M6.1-09, M6.1-16  
**Where:** `packages/web/src/components/HoldingForm.tsx`  
**Depends on:** T11b  
**Done when:**
- Debounced preview fetch; read-only USD field shows API `convertedFaceValue`
- Submit disabled when `conversionError` (mock API in tests)
- **No** `bonds-domain` / `fx.ts` conversion helpers  
**Tests:** `HoldingForm.test.tsx` (mock `fetch` / `useApi`)  
**Gate:** `npm run test -w web`

---

### T16 [P3]: Web — API types for `converted*` fields

**Requirement:** M6.1-16  
**Where:** `packages/web/src/types/api.ts`  
**Depends on:** T11  
**Done when:** `ApiBondHolding` uses `convertedFaceValue`, `convertedCurrency`, `conversionError?`; remove client-side optional `displayFaceValue` fallback types  
**Tests:** typecheck via `npm run build -w web`  
**Gate:** `npm run build -w web`

---

### T17 [P3]: Web — HoldingsTable renders API fields only

**Requirement:** M6.1-10, M6.1-11, M6.1-16  
**Where:** `packages/web/src/components/HoldingsTable.tsx`, CSS  
**Depends on:** T16  
**Done when:**
- Primary: `convertedFaceValue` + `convertedCurrency` (placeholder if null)
- Secondary: `faceValue` + `currencyCode`
- **Removed:** `displayFaceValue ?? faceValue` and `showConverted` logic  
**Tests:** `holdings.test.tsx` with fixture JSON from API shape  
**Gate:** `npm run test -w web`

---

### T18 [P3]: Web — HoldingsTable tooltips

**Requirement:** M6.1-12  
**Where:** `packages/web/src/components/HoldingsTable.tsx`  
**Depends on:** T17  
**Done when:** `title` on metric cells per spec labels  
**Tests:** `holdings.test.tsx` attribute assertions  
**Gate:** `npm run test -w web`

---

### T19 [P3]: Web — Holdings page refetch-only on currency change

**Requirement:** M6.1-10, M6.1-16  
**Where:** `packages/web/src/pages/Holdings.tsx`, `DisplayCurrencyContext`  
**Depends on:** T18  
**Done when:** Selector only changes `displayCurrency` query param and refetches — no local recalculation  
**Tests:** `holdings.test.tsx` asserts fetch URL, not converted numbers  
**Gate:** `npm run test -w web`

---

### T20 [P3]: Web — CurrencyQuotes filters + symbol display

**Requirement:** M6.1-13, M6.1-14  
**Where:** `packages/web/src/pages/CurrencyQuotes.tsx`, CSS  
**Depends on:** T13  
**Done when:** Filter UI drives query params; rows show `EUR (€)`  
**Tests:** `currencies.test.tsx` or new quotes test  
**Gate:** `npm run test -w web`

---

### T21 [P3]: Web — optional quote direction on form (advanced)

**Requirement:** M6.1-02 (UI parity)  
**Where:** `CurrencyQuotes.tsx`  
**Depends on:** T15, T20  
**Done when:** Toggle or select `USD → currency` / `currency → USD` sends `rateDirection`  
**Tests:** mutation payload assertion  
**Gate:** `npm run test -w web`

---

### T22 [P3]: Docs + ship gate

**Requirement:** —  
**Where:** `docs/FRONTEND.md`, `.specs/codebase/CONCERNS.md` (close BRL FX note if present)  
**Depends on:** T21  
**Done when:** `npm run lint && npm run test && npm run check:docs` pass  
**Gate:** full CI commands

---

## Parallel execution notes

| Parallel group | Tasks | Constraint |
| --- | --- | --- |
| P1 start | T2 + T3 after T1 | both need T1 only |
| P1 join | T7 after T5 + T6 | sequential repo |
| P2 | T9 + T10 + T11 after P1 gate | share test DB — not `[P]` |
| P3 | T17 + T20 after P2 | web tests parallel-safe |

---

## Traceability

| Requirement | Tasks |
| --- | --- |
| M6.1-01 | T1, T5, T9 |
| M6.1-02 | T1, T5, T9, T21 |
| M6.1-03 | T3, T7, T12 |
| M6.1-04 | T7, T12 |
| M6.1-05 | T7, T11, T12, T13 |
| M6.1-06 | T4, T6, T10 |
| M6.1-07 | T4, T6, T10 |
| M6.1-08 | T11b, T15 |
| M6.1-09 | T10, T11b, T15 |
| M6.1-10 | T17, T19 |
| M6.1-11 | T17 |
| M6.1-12 | T18 |
| M6.1-13 | T20 |
| M6.1-14 | T20 |
| M6.1-16 | T7, T11, T11b, T15, T16, T17, T19 |

---

## Execute checklist (for agents)

1. Read [spec.md](./spec.md) + [design.md](./design.md)
2. Run P1 tasks T1→T8 on branch `m6.1-p1-fx-domain`
3. Run P2 tasks T9→T14 on `m6.1-p2-api`
4. Run P3 tasks T15→T22 on `m6.1-p3-web`
5. Update `.specs/project/STATE.md` todos; move folder to `completed/` when shipped
