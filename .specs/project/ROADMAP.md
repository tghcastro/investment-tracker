# Roadmap

**Current Milestone:** M1 — Platform & bond domain foundation
**Status:** Planning

---

## M1 — Platform & bond domain foundation

**Goal:** Runnable modular Node/TypeScript API and web shell with persistence and a bond holding model — no full UI polish required.
**Target:** First bond can be created and retrieved via API (and minimal UI or API client).

### Features

**Project scaffold** — PLANNED

- Monorepo or package layout (API, web, shared types)
- Dev tooling: TypeScript, lint, test runner
- Health check and API bootstrap

**Bond domain model** — PLANNED

- Entities: Account (manual broker label), BondHolding, CouponPayment (or scheduled cash flow)
- Validation for dates, rates, face value, maturity after purchase
- Repository/service layer isolated from HTTP

**Persistence** — PLANNED

- Schema/migrations for accounts, holdings, coupon payments
- Seed or fixture data for local development

---

## M2 — Bond holdings & accounts (v1 core)

**Goal:** Users can manage all bond positions and group them by account without spreadsheets.
**Target:** Complete CRUD for holdings and accounts in the web UI.

### Features

**Account management** — PLANNED

- Create, rename, archive manual accounts (broker/custodian labels)

**Bond holding CRUD** — PLANNED

- Add/edit/delete holdings with issuer, identifiers, face value, coupon terms, maturity, purchase details
- List and filter holdings by account, maturity window, issuer

**Bond portfolio summary** — PLANNED

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

## M4 — v1 polish & import (optional before “v1 complete”)

**Goal:** Usable day-to-day for bond-only portfolios; reduce migration friction from sheets.
**Target:** Declared v1 release for bonds-only scope.

### Features

**CSV import** — PLANNED

- Import holdings and/or coupon rows from spreadsheet export templates

**UX polish** — PLANNED

- Empty states, validation errors, responsive layout
- Basic onboarding copy (what v1 does and does not do)

---

## Future Considerations

- Additional asset classes: equities, ETFs, cash — reuse modular domain pattern
- Multi-account broker sync (OAuth/API adapters per broker)
- Stock dividend tracker
- Net worth over time across all assets
- Live pricing and yield-to-maturity from market-data providers
- Multi-currency and FX
- Authentication and multi-user households
- Export and reporting for tax prep
