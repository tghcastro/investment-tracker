# Roadmap

**Current Milestone:** M3 — Coupon income & cash flows
**Status:** Planning

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

### Features

**Coupon payment tracking** — PLANNED

- Record payment date, amount, link to holding
- Optional schedule hints from coupon rate and frequency (user-confirmed)

**Income views** — PLANNED

- History by period and by holding
- Simple upcoming coupon expectations (calculated from terms, not market data)

---

## M4 — v1 polish

**Goal:** Reliable day-to-day use for bond-only portfolios; users can inspect system state and back up or restore their data.
**Target:** Declared v1 release for bonds-only scope.
**Status:** Planned

### Features

**Backup & system info** — PLANNED

- Settings page: app version, database location (from config), last backup timestamp
- Trigger backup → download SQLite snapshot (browser file download)
- Restore from a previously downloaded backup file

**UX polish** — PLANNED

- Remaining gaps only: form validation UX, responsive tables, loading states (M1/M2 already ship core empty states)

---

## Future Considerations

- Additional asset classes: equities, ETFs, cash — reuse modular domain pattern
- Multi-account broker sync (OAuth/API adapters per broker)
- Stock dividend tracker
- Net worth over time across all assets
- Live pricing and yield-to-maturity from market-data providers
- Multi-currency and FX
- Authentication and multi-user households
- Import data
- Export and reporting for tax prep
