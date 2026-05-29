# Roadmap

**Current Milestone:** M6 — Multi-currency  
**Status:** M5 complete; M6 specified (v2.0.0 after M7)  
**Active specs:** [m6-multi-currency](../features/active/m6-multi-currency/spec.md) → [m7-brazilian-fixed-income](../features/active/m7-brazilian-fixed-income/spec.md)

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
**Status:** Complete — [spec](../features/active/m5-holdings-framework/spec.md) · [design](../features/active/m5-holdings-framework/design.md) · [tasks](../features/active/m5-holdings-framework/tasks.md)

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
**Status:** Specified — [spec](../features/active/m6-multi-currency/spec.md) · [design](../features/active/m6-multi-currency/design.md) · [tasks](../features/active/m6-multi-currency/tasks.md)

### Features

**Currency catalog** — PLANNED

- System-defined currencies (ISO 4217): ARS, AUD, EUR, BRL, CAD, CNY, DKK, GBP, USD
- Read-only list page: code, name, symbol, country/region
- New currencies added via DB script only (no user CRUD)

**Currency quotes** — PLANNED

- Daily exchange rates (base USD → target currency)
- Create, update, delete quotes; one quote per currency per day
- Only currencies with at least one quote available for valuation/display

**Account & portfolio currency** — PLANNED

- Accounts define allowed currencies for their holdings
- Holdings restricted to account-configured currencies
- Display-currency selector on Holdings and Home; values converted with selected currency symbol

**Out of scope (M6):** Currency creation/editing by users, automatic quote retrieval, file import, real-time rates

---

## M7 — Brazilian fixed income

**Goal:** Support Brazilian fixed-income investments as a dedicated Holding Type, distinct from international bonds.
**Target:** Full CRUD for common Brazilian products with indexing configuration; accounts may hold both bonds and Brazilian fixed income; **v2.0.0** release.
**Status:** Specified — [spec](../features/active/m7-brazilian-fixed-income/spec.md) · [design](../features/active/m7-brazilian-fixed-income/design.md) · [tasks](../features/active/m7-brazilian-fixed-income/tasks.md)

### Features

**Brazilian Fixed Income holdings** — PLANNED

- Products: LCI, LCA, Tesouro Direto, CRI, CRA
- Fields: name, product type, indexing type, purchase/maturity dates, invested amount, account, currency (inherited from account)
- No face value, ISIN, or CUSIP

**Indexing configuration** — PLANNED

- CDI Percentage (e.g. 105% CDI)
- IPCA + Spread (e.g. IPCA + 6.5%)
- SELIC
- Pre-Fixed (e.g. 12.5% fixed rate)

**Account & navigation integration** — PLANNED

- Accounts support multiple Holding Types (Bond + Brazilian Fixed Income)
- Architecture allows future types (stocks, ETFs, funds, REITs, crypto) without changing existing types
- Navigation organized by Holding Type (depends on M5)

**Out of scope (M7):** Broker integrations, automatic/file imports, additional Holding Types beyond BRFI

---

## Future Considerations

- Additional asset classes beyond M7: equities, ETFs, cash — extend Holding Type framework from M5
- Multi-account broker sync (OAuth/API adapters per broker)
- Stock dividend tracker
- Net worth over time across all assets
- Live pricing and yield-to-maturity from market-data providers
- Authentication and multi-user households
- Import data (spreadsheet/CSV)
- Export and reporting for tax prep
