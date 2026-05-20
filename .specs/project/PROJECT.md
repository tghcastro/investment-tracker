# Investment Tracker

**Vision:** A web-based personal investment tracker that consolidates portfolios spread across brokers and spreadsheets into one clear view.
**For:** Individual investors (starting with you) who manage holdings in many places and need a single source of truth.
**Solves:** Fragmented portfolio data, manual spreadsheet upkeep, and lack of unified visibility across accounts and asset types.

## Goals

- **v1:** Replace spreadsheet-based bond tracking with a reliable web app for recording holdings, key bond terms, and coupon income.
- **Long term:** Support multiple asset classes, multi-account aggregation, performance analytics, and net-worth history in one modular platform.
- **Quality bar:** A user can see all bond positions and upcoming/matured cash flows without maintaining parallel spreadsheets.

## Tech Stack

**Core:**

- Platform: Web application + REST backend API
- Backend: Node.js + TypeScript
- Frontend: React (SPA consuming the API); UI follows [`DESIGN.md`](../DESIGN.md) (institutional / Coinbase-inspired tokens — see `.specs/features/m1-scaffold/web-design.md`)
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

## Constraints

- **Timeline:** No fixed deadline — iterative delivery
- **Technical:** Node + TypeScript; modular boundaries between bond domain, persistence, and API/UI layers
- **Resources:** Solo/small-team build; prefer simple deploy and low operational cost for early versions
- **Data:** Manual entry only for v1; CSV import may follow in M4

## Domain Note: Bonds

Bonds represent money borrowed by an issuer (government or company) from investors. v1 treats each position as a contractual claim: principal at maturity, periodic coupon payments, and issuer/credit identity — not as generic “securities” shared with equities.
