# M8 Tasks — Market Indicators

**Design**: `.specs/features/active/m8-market-indicators/design.md`  
**Spec**: `.specs/features/active/m8-market-indicators/spec.md`  
**Status**: Approved — ready to execute  
**Depends on**: M7 complete  
**Release**: Part of **v2.0.0** (M9 follows; tag after M9)

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — Domain & API** | T1–T13 | Schema, domain, repo, routes, BRFI link | `npm run test -w @investment-tracker/api` |
| **P2 — Web UI** | T14–T20 | Indicators pages, BRFI picker, nav | `npm run test -w @investment-tracker/web` |
| **P3 — Docs & ship** | T21–T23 | Codebase docs, spec archive, monorepo gate | `npm run lint && npm run test && npm run check:docs` |

**Suggested branches:** `m8-p1-api` → `m8-p2-web` → `m8-p3-ship`

---

## Task Breakdown

### T1 [P1]: Domain — indicator types and Zod schemas

**Requirement**: M8-02, M8-03, M8-09, M8-10  
**Where**: `packages/bonds-domain/src/marketIndicator.ts`, `index.ts`, `__tests__/marketIndicator.test.ts`  
**What**: `INDICATOR_CATEGORIES`, create/update indicator schemas, create/update value schemas; slug uppercase normalize in schema  
**Done when**: Domain tests pass for valid/invalid payloads  
**Commit**: `feat(domain): market indicator validators`

---

### T2 [P1]: Domain — latest value + indexing validation

**Requirement**: M8-12, M8-15  
**Depends on**: T1  
**Where**: `marketIndicator.ts`, tests  
**What**: `resolveLatestIndicatorValue`, `requiredIndicatorCategory`, `validateMarketIndicatorForIndexing`, `DEFAULT_INDICATOR_SLUG_BY_INDEXING`  
**Done when**: Unit tests cover empty values, future dates, as-of date, category mismatch matrix  
**Commit**: `feat(domain): indicator latest value and indexing rules`

---

### T3 [P1]: Schema — `market_indicators` + seed

**Requirement**: M8-01, M8-05  
**Where**: `schema.ts`, `migrations/007_market_indicators.sql`  
**What**: Table + seed CDI, SELIC, IPCA, CPI, IBOV, SP500, NDX100 with `is_system = 1`  
**Done when**: Migration runs on fresh and existing DB  
**Commit**: `feat(api): market_indicators schema and seed`

---

### T4 [P1]: Schema — `market_indicator_values`

**Requirement**: M8-08, M8-10  
**Depends on**: T3  
**Where**: `schema.ts`, same migration file  
**What**: Values table + unique `(indicator_id, value_date)`  
**Commit**: `feat(api): market_indicator_values schema`

---

### T5 [P1]: Schema — BRFI `market_indicator_id` + backfill

**Requirement**: M8-13, M8-14, M8-17  
**Depends on**: T3  
**Where**: `schema.ts`, migration  
**What**: Nullable FK; backfill CDI/IPCA/SELIC from seed slugs  
**Commit**: `feat(api): br_fi market_indicator_id column`

---

### T6 [P1]: Repo — indicator CRUD

**Requirement**: M8-01–M8-07  
**Depends on**: T3  
**Where**: `repo.ts`, `__tests__/repo.test.ts`  
**What**: list (with latestValue + valueCount), get, insert, update (system vs custom rules), delete (system block, BRFI reference check)  
**Commit**: `feat(api): repo market indicators`

---

### T7 [P1]: Repo — indicator values CRUD

**Requirement**: M8-08–M8-12  
**Depends on**: T4, T6  
**Where**: `repo.ts`, tests  
**What**: list by indicator (date DESC, optional range), insert, update, delete, duplicate date handling  
**Commit**: `feat(api): repo indicator values`

---

### T8 [P1]: Routes — indicator list + get

**Requirement**: M8-01, M8-12, M8-16  
**Depends on**: T6  
**Where**: `routes/market-indicators/list.ts`, `get-by-id.ts`, `server.ts`  
**What**: GET list with optional `category`; GET by id; 404 handling  
**Commit**: `feat(api): GET market indicators routes`

---

### T9 [P1]: Routes — indicator POST/PATCH/DELETE

**Requirement**: M8-02–M8-07  
**Depends on**: T6  
**Where**: `routes/market-indicators/post.ts`, `patch.ts`, `delete.ts`  
**Commit**: `feat(api): market indicator write routes`

---

### T10 [P1]: Routes — nested values CRUD + latest

**Requirement**: M8-08–M8-12  
**Depends on**: T7, T8  
**Where**: `routes/market-indicators/values/*.ts`, `latest.ts`  
**What**: Full value CRUD under `/:id/values`; GET `/:id/latest`  
**Commit**: `feat(api): indicator values routes`

---

### T11 [P1]: BRFI — marketIndicatorId validation + response embed

**Requirement**: M8-13–M8-16  
**Depends on**: T2, T5, T6  
**Where**: `bonds-domain/brFi.ts`, `repo.ts`, `routes/br-fi-holdings/*`, `toApiBrFiHolding` helper  
**What**: Extend create/update schemas; repo validates FK + category; list/detail embed `marketIndicator` with `latestValue`  
**Commit**: `feat(api): br-fi market indicator reference`

---

### T12 [P1]: API integration tests

**Requirement**: M8-01–M8-16  
**Depends on**: T8–T11  
**Where**: `__tests__/routes.test.ts`  
**What**: Indicator CRUD, value uniqueness, latest endpoint, BRFI with/without indicator, delete conflict  
**Commit**: `test(api): market indicators integration`

---

### T13 [P1]: API regression gate

**Gate**: `npm run test -w @investment-tracker/api`

---

### T14 [P2]: Web — API types

**Requirement**: M8-16, M8-21  
**Where**: `packages/web/src/types/api.ts`  
**Commit**: `feat(web): market indicator API types`

---

### T15 [P2]: Web — routes in App.tsx

**Requirement**: M8-18, M8-19  
**Where**: `App.tsx`  
**Commit**: `feat(web): market indicators routes`

---

### T16 [P2]: MarketIndicators list page

**Requirement**: M8-18, M8-22, M8-23  
**Depends on**: T14, T15  
**Where**: `pages/MarketIndicators.tsx`, CSS  
**What**: Table from GET list; empty state (manual entry, no feeds); links to detail  
**Commit**: `feat(web): market indicators list page`

---

### T17 [P2]: MarketIndicatorDetail page — values CRUD

**Requirement**: M8-19  
**Depends on**: T16  
**Where**: `pages/MarketIndicatorDetail.tsx` — mirror CurrencyQuotes patterns  
**Commit**: `feat(web): market indicator detail and values`

---

### T18 [P2]: BrFiForm — indicator picker

**Requirement**: M8-17, M8-20, M8-21  
**Depends on**: T14  
**Where**: `BrFiForm.tsx`, `IndexingFields.tsx`  
**What**: Fetch `GET /api/market-indicators?category=...` when indexing requires; pass `marketIndicatorId` in POST/PATCH; default select row where `slug` matches API-provided default from list (first match on slug field in response, not hardcoded category map)  
**Commit**: `feat(web): br-fi market indicator picker`

---

### T19 [P2]: TopNav — Market Indicators link

**Requirement**: M8-22  
**Where**: `TopNav.tsx`, `topNav.test.tsx`  
**Commit**: `feat(web): TopNav market indicators`

---

### T20 [P2]: Web tests

**Requirement**: M8-18–M8-21  
**Where**: `__tests__/marketIndicators.test.tsx`, update `brFiHoldings.test.tsx`  
**Commit**: `test(web): market indicators UI`

---

### T21 [P3]: Codebase docs

**Where**: `STRUCTURE.md`, `docs/FRONTEND.md`, `API-FIRST.md` (M8 row → shipped)  
**Commit**: `docs: M8 market indicators routes and structure`

---

### T22 [P3]: Archive M8 spec + update STATE/ROADMAP/index

**Move**: `active/m8-market-indicators/` → `completed/`  
**Update**: STATE todos, ROADMAP M8 status, `.specs/index.md`  
**Commit**: `docs: complete M8 move spec to completed`

---

### T23 [P3]: Full monorepo gate

**Gate**: `npm run lint && npm run test && npm run check:docs`

---

## Post-ship

- M9 design/tasks can start (depends on M8 latest value API)
- v2.0.0 tag remains blocked until M9 (AD-009)
