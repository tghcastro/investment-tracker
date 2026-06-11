# Roadmap

**Current Milestone:** M10 — Navigation & Tools shell  
**Status:** M5–M9 shipped — **v1.1.0** released 2026-06-06  
**Latest shipped:** [m9-dashboard](../features/completed/m9-dashboard/spec.md)  
**Next:** M10 → **v1.2.0** (per-milestone releases — AD-011)

---

## M1 — Platform & bond domain foundation

**Goal:** Runnable modular Node/TypeScript API and web shell with persistence and a bond holding model — no full UI polish required.
**Target:** First bond can be created and retrieved via API (and minimal UI or API client).
**Status:** Complete

### Features

**Project scaffold** — DONE

- Monorepo or package layout (API, web, shared types)
- Dev tooling: TypeScript, lint, test runner
- Health check and API bootstrap

**Bond domain model** — DONE

- Entities: Account (manual broker label), BondHolding, CouponPayment (or scheduled cash flow)
- Validation for dates, rates, face value, maturity after purchase
- Repository/service layer isolated from HTTP

**Persistence** — DONE

- Schema/migrations for accounts, holdings, coupon payments
- Seed or fixture data for local development

---

## M2 — Bond holdings & accounts (v1 core)

**Goal:** Users can manage all bond positions and group them by account without spreadsheets.
**Target:** Complete CRUD for holdings and accounts in the web UI.
**Status:** Complete

### Features

**Account management** — DONE

- Create, rename, archive manual accounts (broker/custodian labels)

**Bond holding CRUD** — DONE

- Add/edit/delete holdings with issuer, identifiers, face value, coupon terms, maturity, purchase details
- List and filter holdings by account, maturity window, issuer

**Bond portfolio summary** — DONE

- Aggregated face value and cost basis by account and total
- Maturity ladder (upcoming maturities)

---

## M3 — Coupon income & cash flows

**Goal:** Track coupon payments against holdings and see income history.
**Target:** Record payments and view per-holding and portfolio-level income.
**Status:** Complete

### Features

**Coupon payment tracking** — DONE

- Record payment date, amount, link to holding
- Optional schedule hints from coupon rate and frequency (user-confirmed)

**Income views** — DONE

- History by period and by holding
- Simple upcoming coupon expectations (calculated from terms, not market data)

---

## M4 — v1 polish

**Goal:** Reliable day-to-day use for bond-only portfolios; users can inspect system state and back up or restore their data.
**Target:** Declared v1 release for bonds-only scope.
**Status:** Complete

### Features

**Backup & system info** — DONE

- Settings page: app version, database location (from config), last backup timestamp
- Trigger backup → download SQLite snapshot (browser file download)
- Restore from a previously downloaded backup file

**UX polish** — DONE

- Form validation focus UX, responsive income/payment tables, loading skeletons (M1/M2 already ship core empty states)

---

## M5 — Holdings framework

**Goal:** Support multiple investment categories through a common holdings framework so new asset types can be added without major architectural changes.
**Target:** Every holding belongs to a Holding Type; bonds remain fully functional under the framework; navigation and reporting organized by type.
**Status:** Complete — [spec](../features/completed/m5-holdings-framework/spec.md) · [design](../features/completed/m5-holdings-framework/design.md) · [tasks](../features/completed/m5-holdings-framework/tasks.md)

### Features

**Holding Type model** — DONE

- Holding Type entity: initial types **Bond** and **Brazilian Fixed Income**
- Every holding belongs to exactly one Holding Type
- New types added via DB script (no management UI)
- Future types anticipated: Stock, ETF, Mutual Fund, REIT, Cryptocurrency, Cash, custom

**Navigation & reporting by type** — DONE

- Holdings menu displays supported Holding Types
- Filter holdings by Holding Type
- New types addable without redesigning navigation

---

## M6 — Multi-currency support

**Goal:** Support investments and accounts across multiple currencies with USD as the system base currency; portfolio calculations displayable in any quoted currency.
**Target:** Currency list, manual exchange-rate management, account currency configuration, and currency selector on Holdings and Home.
**Status:** Complete — [spec](../features/completed/m6-multi-currency/spec.md) · [design](../features/completed/m6-multi-currency/design.md) · [tasks](../features/completed/m6-multi-currency/tasks.md)

### Features

**Currency catalog** — DONE

- System-defined currencies (ISO 4217): ARS, AUD, EUR, BRL, CAD, CNY, DKK, GBP, USD
- Read-only list page: code, name, symbol, country/region
- New currencies added via DB script only (no user CRUD)

**Currency quotes** — DONE

- Daily exchange rates (base USD → target currency)
- Create, update, delete quotes; one quote per currency per day
- Only currencies with at least one quote available for valuation/display

**Account & portfolio currency** — DONE

- Accounts define allowed currencies for their holdings
- Holdings restricted to account-configured currencies
- Display-currency selector on Holdings and Home; values converted with selected currency symbol

**Out of scope (M6):** Currency creation/editing by users, automatic quote retrieval, file import, real-time rates

---

## M6.1 — Multi-currency follow-ups

**Goal:** Deterministic FX: normalized quote storage, purchase-date valuation, holding validation, and Holdings/Quotes UI parity with API.  
**Target:** Close gaps from `new-requirements.md` (BRL conversion bug, historical rates, form USD preview, dual-line holdings display).  
**Status:** Shipped (2026-05-31) — [spec](../features/completed/m6.1-multi-currency-follow-ups/spec.md) · [design](../features/completed/m6.1-multi-currency-follow-ups/design.md) · [tasks](../features/completed/m6.1-multi-currency-follow-ups/tasks.md)

### Features

**FX correctness (P1–P2)** — PLANNED

- Normalize inverted rates on quote write (`target-to-usd` → stored USD→target)
- Value each holding at **purchase-date** applicable rate (never future quotes)
- **API lists always return** `faceValue`/`currencyCode` + `convertedFaceValue`/`convertedCurrency` (`displayCurrency` optional, default USD)
- Reject non-USD holdings without on/before-purchase quote (`EXCHANGE_RATE_REQUIRED`)
- Regression fixtures: EUR/BRL/USD matrix from requirements doc

**Holdings & quotes UI (P3)** — PLANNED

- **Web: UI rules only** — no client-side FX (AD-010)
- Holding form: USD preview via `GET /api/fx/convert` (interest type → M7)
- Holdings table: render API converted + original lines; metric tooltips
- Currency quotes: date range + currency filters; symbol beside code

**Out of scope (M6.1):** Auto quotes, compound-interest modeling, BRFI (M7)

---

## M7 — Brazilian fixed income

**Goal:** Support Brazilian fixed-income investments as a dedicated Holding Type, distinct from international bonds.
**Target:** Full CRUD for common Brazilian products with indexing configuration; accounts may hold both bonds and Brazilian fixed income.
**Status:** Complete (2026-06-05) — [spec](../features/completed/m7-brazilian-fixed-income/spec.md) · [design](../features/completed/m7-brazilian-fixed-income/design.md) · [tasks](../features/completed/m7-brazilian-fixed-income/tasks.md)

### Features

**Brazilian Fixed Income holdings** — DONE

- Products: LCI, LCA, Tesouro Direto, CRI, CRA
- Fields: name, product type, indexing type, purchase/maturity dates, invested amount, account, currency (inherited from account)
- No face value, ISIN, or CUSIP

**Indexing configuration** — DONE

- CDI Percentage (e.g. 105% CDI)
- IPCA + Spread (e.g. IPCA + 6.5%)
- SELIC
- Pre-Fixed (e.g. 12.5% fixed rate)

**Account & navigation integration** — DONE

- Accounts support multiple Holding Types (Bond + Brazilian Fixed Income)
- Portfolio summary and Home totals include BRFI invested amounts (display currency via M6)
- Navigation organized by Holding Type (M5 submenu)

**Out of scope (M7):** Broker integrations, automatic/file imports, additional Holding Types beyond BRFI, **v2.0.0 tag** (deferred)

---

## M8 — Market indicators

**Goal:** Store manual historical values for benchmarks (CDI, SELIC, IPCA, stock indexes) and link index-linked BRFI holdings to indicators for downstream forecasts.  
**Target:** Indicator + value CRUD (API + web); BRFI requires indicator reference for CDI/IPCA/SELIC indexing; latest value endpoint for calculations.  
**Status:** Complete (2026-06-05) — [spec](../features/completed/m8-market-indicators/spec.md) · [design](../features/completed/m8-market-indicators/design.md) · [tasks](../features/completed/m8-market-indicators/tasks.md)  
**Depends on:** M7  
**Release:** **v2.0.0** (with M5–M7, M9)

### Features

**Indicator catalog & values** — DONE

- CRUD market indicators (Interest Rate, Inflation, Stock Index categories)
- CRUD dated values; one value per indicator per day; latest value for API
- Seed: CDI, SELIC, IPCA, CPI, IBOV, S&P 500, Nasdaq 100

**BRFI integration** — DONE

- Index-linked BRFI holdings reference a market indicator (required for CDI/IPCA/SELIC)
- API embeds indicator summary + latest value on BRFI responses

**Out of scope (M8):** Auto feeds, file import, bond indicator links, dashboard forecasts (M9)

---

## M9 — Dashboard

**Goal:** Consolidated portfolio dashboard with allocation, yearly income/principal forecasts, and unified upcoming events — replacing the minimal Home summary.  
**Target:** `GET /api/dashboard` with filters; Home UI shows all sections; BRFI index-linked interest uses M8 latest indicator values.  
**Status:** Complete (2026-06-05) — [spec](../features/completed/m9-dashboard/spec.md) · [design](../features/completed/m9-dashboard/design.md) · [tasks](../features/completed/m9-dashboard/tasks.md)  
**Depends on:** M5, M6, M7, M8  
**Release:** **v2.0.0** (with M5–M8)

### Features

**Dashboard API** — DONE

- Portfolio summary, allocation by type and account, projected income by year, principal forecast by year, upcoming events timeline
- Filters: account, holding type, date range; display currency (M6)

**Dashboard UI** — DONE

- Home (`/`) full dashboard; URL-persisted filters
- API-first — no client-side forecast math; web requests and passes query params only (AD-010)

**Out of scope (M9):** Daily BRFI accrual ledger, live bond pricing, chart library requirement, PDF export

---

## M10 — Navigation & Tools shell

**Goal:** Rename nav for clarity; introduce Tools hub; improve bulk data-entry UX with "continue creating".  
**Target:** **v1.2.0** — shippable without API changes.  
**Status:** Specified — [spec](../features/active/m10-navigation-tools/spec.md)  
**Depends on:** v1.1.0

### Features

**Navigation rename** — SPECIFIED

- TopNav **Reference** → **Configurations** (same routes: Currencies, Currency Quotes, Market Indicators)
- TopNav **Settings** → **Tools** → `/tools` (remove standalone `/settings` or redirect)

**Tools page** — SPECIFIED

- Card grid layout (pattern: Accounts page)
- First card: **Backup / Restore** (content moved from current Settings page)
- Card shows tool name + short description; click opens tool view

**Continue creating (UI only)** — SPECIFIED

- **Currency quotes** add modal (not new ISO codes): checkbox "Continue creating" (default off); on success keep modal open, clear value fields only
- Add coupon payment modal (bonds): same pattern
- Add interest payment modal (BRFI): same pattern
- No API changes

**Out of scope (M10):** New tools (DB picker, CSV, calculators), BRFI coupon math, user currency catalog CRUD

---

## M11 — BRFI coupon engine

**Goal:** Full coupon/interest rules for Brazilian fixed income per indexing type; projected coupons in API/dashboard.  
**Target:** **v1.3.0**  
**Status:** Planned  
**Depends on:** M7, M8 (indicators for index-linked calcs)

### Features

**Coupon calculation (domain + API)** — PLANNED

- **Pre-fixed:** fixed annual rate ÷ frequency × face (invested amount)
- **IPCA + Spread:** inflation-adjusted principal × real semiannual rate (historical IPCA accumulation)
- **CDI-linked:** accumulated CDI over coupon period × CDI percentage
- **SELIC-linked:** accumulated SELIC over coupon period × SELIC percentage
- Coupons as independent cash flows; principal unchanged until maturity
- Historical payments immutable; included in total return / dashboard forecasts

**BRFI holding model** — PLANNED

- New field: `couponFrequency` — same enum as bonds (`monthly` | `quarterly` | `semi-annual` | `annual`); UI labels **Mensal / Trimestral / Semestral / Anual**
- Migration `009_*`: additive column, default `annual` for existing rows (matches current yearly projection behaviour)
- API embeds `expectedInterestAmountCents` on BRFI GET responses
- Projected future coupons when rate data sufficient (M8 indicator **history** between coupon dates — see AD-012)

**Web** — PLANNED

- Interest payment section shows API estimate (AD-010); "continue creating" if not done in M10
- Dashboard/upcoming events use new API projections

**Baseline today:** BRFI interest payment CRUD exists; dashboard uses simplified annual `brFiAnnualInterestCents` + yearly dates — does **not** meet planned M11 semiannual/IPCA/CDI-period rules.

**Out of scope (M11):** Daily accrual ledger, broker feeds, bond coupon rule changes (bonds already covered in M3)

**Retrocompatibility:** Migration only adds `coupon_frequency` with default; existing BRFI rows + backups restore cleanly; no data rewrite.

---

## M13 — CSV import: currency quotes

**Goal:** Bulk import/update currency quotes from CSV via Tools.  
**Target:** **v1.4.0**  
**Status:** Planned  
**Depends on:** M10, M6

### Features

**CSV format** — PLANNED

- Columns: `date` (YYYY-MM-DD), `currency` (ISO code in DB), `value` (rate)
- All lines validated before any write; summary: total / created / updated

**API** — PLANNED

- `POST /api/tools/import/currency-quotes` (or similar) — transactional all-or-nothing

**Web** — PLANNED

- Tools card + upload UI + result summary

**Out of scope (M13):** New currency codes, automatic FX feeds

---

## M14 — CSV import: market indicators

**Goal:** Bulk import/update market indicator values from CSV via Tools.  
**Target:** **v1.5.0**  
**Status:** Planned  
**Depends on:** M10, M8

### Features

**CSV format** — PLANNED

- Columns: `date`, `slug` (indicator slug in DB), `value`
- Same validation and summary rules as M13

**API + Web** — PLANNED

- Import endpoint + Tools card (mirror M13 pattern)

**Note:** `next.spec.md` line "Currency code available in database only" under indicators is assumed **typo** → indicator slug must exist in DB.

**Out of scope (M14):** New indicator definitions, auto feeds

---

## M15 — Financial calculators (compound & simple interest)

**Goal:** Standalone simulation tools for compound and simple interest with chart + projection table.  
**Target:** **v1.6.0**  
**Status:** Planned  
**Depends on:** M10, M6 (display currency formatting)

### Features

**Compound Interest Calculator** — PLANNED

- Inputs: initial amount, periodic contribution, rate, rate frequency, period, period unit
- Outputs: final value, total invested, total interest, projection table, growth chart (FR-001–FR-009)
- Auto-recalc on input change; ≤1s for 100-year monthly sim (NFR-001)
- Decimal arithmetic in domain — not floating point for money (NFR-002)

**Simple Interest Calculator** — PLANNED

- Same UX shell; simple-interest formula instead of compound

**API-first (AD-010)** — PLANNED

- Calc logic in `bonds-domain`; API simulation endpoint(s); web renders only

**Out of scope (M15):** Persisted simulations, tax/fees/inflation modeling

---

## M16 — Million goal calculator

**Goal:** Target-amount planner — required monthly contribution or time-to-goal.  
**Target:** **v1.7.0**  
**Status:** Planned  
**Depends on:** M10, M15 (shared calc/chart infrastructure)

### Features

**Mode 1 — Required monthly contribution** — PLANNED

- Inputs: initial, target (default BRL 1M), rate, rate periodicity, investment period (years)
- Output: required monthly contribution + summary metrics

**Mode 2 — Time to reach goal** — PLANNED

- Inputs: initial, monthly contribution, target, rate
- Output: years + months to goal (month-by-month simulation)

**Outputs** — PLANNED

- Summary cards, annual evolution table, growth chart with target reference line
- Annual → monthly rate: `(1 + r_annual)^(1/12) - 1`

**API-first** — PLANNED

- Domain formulas + API endpoints; web presentation only

**Out of scope (M16):** Taxes, fees, inflation, volatility

---

## M12 — Database file picker *(ships last)*

**Goal:** User chooses which SQLite file the app uses — at startup and from Tools.  
**Target:** **v1.8.0**  
**Status:** Planned  
**Depends on:** M10 (Tools page)  
**Ship order:** After M16 (user decision 2026-06-06)

### Features

**Startup flow** — PLANNED

- Modal on **each new browser session** prompting database file selection (no server-side persist across API restarts — AD-012)
- Accept `.db` and backup files (same validation as restore)
- After load → Home; all data from chosen file

**Tools card** — PLANNED

- "Choose database file" tool on `/tools`
- Re-use `AppState.reconnect()` pattern from restore

**API** — PLANNED

- Endpoint to load/switch database file (upload-based; browser cannot pass host paths)
- Session-scoped active DB in API process memory only; new API process → user picks file again

**Deploy** — PLANNED

- Application feature (DEV + PROD); not a Docker-specific capability — works wherever api + web run

**Out of scope (M12):** Multi-user concurrent DB access, cloud-hosted DB, persisting chosen path to disk/env

**Retrocompatibility:** No schema change; any valid v1.x backup file loadable.

---

## Release map (post-v1.1.0)

| Order | Milestone | Version | Theme |
| --- | --- | --- | --- |
| 1 | M10 | **v1.2.0** | Nav + Tools shell + continue creating |
| 2 | M11 | **v1.3.0** | BRFI coupon engine |
| 3 | M13 | **v1.4.0** | CSV currency quotes |
| 4 | M14 | **v1.5.0** | CSV market indicators |
| 5 | M15 | **v1.6.0** | Compound + simple calculators |
| 6 | M16 | **v1.7.0** | Million goal calculator |
| 7 | M12 | **v1.8.0** | Database file picker |

**Cross-cutting:** All milestones use **additive SQLite migrations only**; backups from prior versions must restore and run forward migrations.

---

## Future Considerations

- Additional asset classes beyond M7: equities, ETFs, cash — extend Holding Type framework from M5
- Multi-account broker sync (OAuth/API adapters per broker)
- Stock dividend tracker
- Net worth over time across all assets
- Live pricing and yield-to-maturity from market-data providers
- Authentication and multi-user households
- Export and reporting for tax prep
- Yield-to-maturity / duration calculators (deferred idea)
