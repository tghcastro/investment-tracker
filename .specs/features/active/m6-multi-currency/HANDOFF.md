# M6 Handoff — Multi-Currency (2026-05-29)

**Branch:** `m6-multi-currency` (off `main`, uncommitted)  
**Goal:** M6 all phases — schema, API, web UI, tests, docs, PR  
**Status:** ~95% code done; gate not green; no commits yet

---

## Done

### P1 — Schema & domain
- Migration `packages/api/src/migrations/005_multi_currency.sql`
  - `currencies` (9 ISO seeds), `currency_quotes`, `account_currencies`, `bond_holdings.currency_code`
  - Backfill: all accounts → USD junction; holdings default USD
- `packages/bonds-domain/src/currency.ts` — FX helpers + unit tests
- `Account.currencyCodes`, `BondHolding.currencyCode` in domain types/validators

### P2 — API
- Repo: currency/quote CRUD, account currencies, holding validation, `displayCurrency` on summary + holdings list
- Routes:
  - `GET /api/currencies`, `GET /api/currencies/available`
  - CRUD `/api/currency-quotes`
  - Accounts accept `currencyCodes`; holdings accept `currencyCode`
  - `?displayCurrency=` on `/api/portfolio/summary` and `/api/holdings`
- **API tests:** 123 pass (incl. new `M6 multi-currency routes` block in `routes.test.ts`)

### P3 — Web
- `DisplayCurrencyProvider` + localStorage `displayCurrency`
- `CurrencySelector` on Home + Holdings
- Pages: `/currencies`, `/currencies/quotes`
- `AccountForm` multi-currency checkboxes; `HoldingForm` currency select
- TopNav: **Currencies** link
- Updated `HoldingsTable`, `format.ts`, `types/api.ts`

---

## Not done (finish list)

| # | Task | Notes |
| --- | --- | --- |
| 1 | **Fix 1 failing web test** | Last run: 85 pass / 1 fail. Likely `app.test.tsx` — `/accounts/new` now fetches `GET /api/currencies`; mock missing → AccountForm gets empty `currencyOptions`. Also mock `/api/currencies/available` for App shell if needed. |
| 2 | **Optional:** update `topNav.test.tsx` / `app.test.tsx` for Currencies nav link | Add `expect(link Currencies href=/currencies)` if desired |
| 3 | **Docs** (same PR per harness) | `STATE.md`, `ROADMAP.md` M6 complete, `docs/FRONTEND.md` routes, `.specs/codebase/*` if schema/API changed, `.specs/index.md` Last verified |
| 4 | **Move spec** | `features/active/m6-multi-currency/` → `completed/` after ship gate |
| 5 | **Commits** (user asked for context commits) | Suggested split below |
| 6 | **Push + PR** | `git push -u origin m6-multi-currency` → `gh pr create` |

---

## Verify

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd /mnt/d/workspace/investment-tracker

npm run test -w bonds-domain          # 49 pass
npm run test -w @investment-tracker/api   # 123 pass
npm run test -w @investment-tracker/web   # fix 1 fail first
npm run lint && npm run test          # full gate
npm run check:docs                    # after doc edits
```

**Debug web failure:**
```bash
cd packages/web && npx vitest run --run --reporter=verbose 2>&1 | tee /tmp/web-test.log
grep -E "FAIL|×|AssertionError" /tmp/web-test.log
```

**Quick fix sketch (`app.test.tsx` useApi mock):**
```ts
if (url === '/api/currencies') {
  return { data: [{ code: 'USD', number: '840', name: 'US Dollar', symbol: '$', region: 'US' }], loading: false, error: undefined };
}
if (url === '/api/currencies/available') {
  return { data: [{ code: 'USD', ... }], loading: false, error: undefined };
}
```

---

## Suggested commits

1. `feat(api): M6 schema, FX domain, repo, routes`
2. `feat(web): M6 currency UI and display conversion`
3. `test: M6 coverage and web test fixes`
4. `docs: mark M6 multi-currency complete`

---

## Key files (new)

```
packages/api/src/migrations/005_multi_currency.sql
packages/bonds-domain/src/currency.ts
packages/api/src/routes/currencies/list.ts
packages/api/src/routes/currency-quotes/crud.ts
packages/web/src/contexts/DisplayCurrencyContext.tsx
packages/web/src/components/CurrencySelector.tsx
packages/web/src/pages/Currencies.tsx
packages/web/src/pages/CurrencyQuotes.tsx
packages/web/__tests__/currencies.test.tsx
packages/web/__tests__/testUtils/currencyMocks.ts
```

## Key files (modified)

```
packages/api/src/schema.ts, repo.ts, server.ts
packages/bonds-domain/src/types.ts, validators.ts
packages/web/src/App.tsx, Home.tsx, Holdings.tsx
packages/web/src/components/AccountForm.tsx, HoldingForm.tsx, HoldingsTable.tsx, TopNav.tsx
packages/api/__tests__/routes.test.ts
```

---

## Product behavior (locked)

- Base currency **USD**; quotes = 1 USD = rate × target
- Display selector = USD always + currencies with ≥1 quote
- Account ≥1 currency; holding currency must be in account set
- Conversion: native → USD → display; missing quote → native symbol only
- Preference: localStorage `displayCurrency`

---

## Untracked / don't commit blindly

- `temp.spec.md` — source draft; skip unless user wants it
- `.specs/features/active/m7-brazilian-fixed-income/` — out of scope for M6 PR

---

## PR title/body draft

**Title:** `feat: M6 multi-currency support`

**Body:**
- Currency catalog + manual quote CRUD
- Account multi-currency + holding validation
- Home/Holdings display-currency conversion
- Migration 005; backward compat USD defaults

**Test plan:** API 123 tests; web full suite; manual `/currencies`, `/currencies/quotes`, add BRL quote → selector → converted totals

---

## Next milestone

M7 Brazilian fixed income — after M6 PR merged.
