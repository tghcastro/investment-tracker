# Investment Tracker

**Vision:** A web-based personal investment tracker that consolidates portfolios spread across brokers and spreadsheets into one clear view.
**For:** Individual investors (starting with you) who manage holdings in many places and need a single source of truth.
**Solves:** Fragmented portfolio data, manual spreadsheet upkeep, and lack of unified visibility across accounts and asset types.

## Goals

- **v1:** Replace spreadsheet-based bond tracking with a reliable web app for recording holdings, key bond terms, and coupon income.
- **v2 (M5–M9):** Holdings framework, multi-currency, Brazilian fixed income, market indicators, and portfolio dashboard — M5–M8 **shipped in code** (2026-06-05); M9 spec draft; **v2.0.0** tag when M9 ships. Specs: [ROADMAP.md](ROADMAP.md).
- **Long term:** Additional asset classes, multi-account aggregation, performance analytics, and net-worth history in one modular platform.
- **Quality bar:** A user can see all bond positions and upcoming/matured cash flows without maintaining parallel spreadsheets.

## Tech Stack

**Core:**

- Platform: Web application + REST backend API
- Backend: Node.js + TypeScript
- Frontend: React (SPA consuming the API); UI follows [`DESIGN.md`](../../DESIGN.md) (institutional / Coinbase-inspired tokens — see `.specs/features/completed/m1-scaffold/web-design.md`)
- Architecture: Modular monorepo or packages (domain modules isolated from transport/UI)
- Database: SQLite (local file; suitable for solo use and low ops overhead)

**Key dependencies:** TBD at implementation (ORM with SQLite support, validation, API framework — e.g. Fastify + Zod, Drizzle/Prisma)

## Scope

**v1 includes (bonds only):**

- Bond holdings entered manually: issuer, identifier (ISIN/CUSIP optional), face value, coupon rate, payment frequency, maturity date, purchase date and price/yield
- Manual accounts (e.g. broker name) to group holdings — no live broker sync
- Coupon/interest payment records linked to holdings
- Bond portfolio summary: positions, cost basis, accrued/simple income view, maturity timeline
- Basic CRUD API and web UI for the above

**Explicitly out of scope (v1):**

- Stocks, ETFs, funds, crypto, cash, and other non-bond assets
- Live broker OAuth/API sync and automatic reconciliation
- Full personal net-worth dashboard across all asset types
- Stock dividend tracking
- Multi-user authentication and sharing
- Tax-lot accounting, wash sales, and tax reporting
- Market-data feeds and automated bond pricing (all bond data is user-entered in v1)
- Mobile-native apps (responsive web is sufficient)

**v2 adds (M5–M9, single v2.0.0 release):**

- Holding Type framework (Bond + Brazilian Fixed Income seed types)
- Multi-currency catalog, manual USD-based quotes, account currency config, display-currency on Home/Holdings
- Brazilian Fixed Income CRUD (LCI, LCA, Tesouro Direto, CRI, CRA) with CDI/IPCA/SELIC/pre-fixed indexing
- Market indicator catalog + manual historical values (CDI, SELIC, IPCA, indexes)
- BRFI index-linked holdings reference indicators; latest value via API
- Consolidated dashboard: allocation, yearly income/principal forecasts, upcoming events (evolves Home)
- **Business rules in API/domain only** — web requests and passes parameters ([API-FIRST.md](../codebase/API-FIRST.md), AD-010)

**Still out of scope (v2):**

- Stocks, ETFs, funds, crypto (future Holding Types only)
- Automatic FX/indicator feeds, broker sync, daily BRFI accrual ledger, live bond pricing
- Multi-user auth, tax reporting, mobile-native apps
- Stock/equity holding types (index indicators stored for future use)

## Constraints

- **Timeline:** No fixed deadline — iterative delivery
- **Technical:** Node + TypeScript; modular boundaries between bond domain, persistence, and API/UI layers
- **Resources:** Solo/small-team build; prefer simple deploy and low operational cost for early versions
- **Data:** Manual entry for v1 core; M4 adds database backup/restore and UX polish. M5–M7 extend asset types and currency support (manual quotes). Spreadsheet import deferred to Future Considerations.

## Domain Note: Bonds

Bonds represent money borrowed by an issuer (government or company) from investors. v1 treats each position as a contractual claim: principal at maturity, periodic coupon payments, and issuer/credit identity — not as generic “securities” shared with equities.
