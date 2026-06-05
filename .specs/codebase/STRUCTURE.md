# Project Structure

**Root:** `/mnt/d/workspace/investment-tracker` (WSL) or `d:\workspace\investment-tracker` (Windows)  
**Analyzed:** 2026-06-05

## Top-level layout

```
investment-tracker/
├── AGENTS.md                 # Agent entry map
├── DESIGN.md                 # UI design tokens (YAML)
├── README.md                 # Human runbook (excluded from default agent index)
├── .cursorignore
├── .cursor/rules/            # WSL shell, caveman (always applied in Cursor)
├── .nvmrc                    # 22
├── package.json              # workspaces root scripts
├── eslint.config.mjs
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── docs/                     # Agent-friendly reference docs
│   ├── FRONTEND.md
│   └── references/
│       └── node22-wsl.md
├── .specs/
│   ├── index.md
│   ├── project/              # PROJECT, ROADMAP, STATE
│   ├── codebase/             # This directory
│   └── features/
│       ├── active/           # Next feature specs
│       └── completed/        # M1–M9 archived specs
├── packages/
│   ├── bonds-domain/
│   ├── api/
│   └── web/
├── scripts/                  # dev-web, lint, release, node check
├── docker/
│   ├── api/
│   └── web/
└── bruno/                    # Manual API collection (human)
```

## `packages/bonds-domain`

```
bonds-domain/
├── src/
│   ├── index.ts          # re-exports
│   ├── types.ts          # Account, BondHolding, BrFiHolding, CouponPayment, enums
│   ├── validators.ts     # Zod bond create/update schemas
│   ├── brFi.ts           # BRFI Zod schemas + indexing validation
│   ├── marketIndicator.ts # Indicator types, latest-value, indexing validation
│   ├── dashboardForecast.ts # Yearly income/principal forecasts, event merge
│   ├── currency.ts       # FX conversion helpers (USD base)
│   └── couponSchedule.ts # estimated dates, expected amounts
├── __tests__/
├── package.json
└── tsconfig.json
```

Built to `dist/` before API tests (`pretest` in api).

## `packages/api`

```
api/
├── src/
│   ├── index.ts              # startServer entry
│   ├── server.ts             # Fastify app + route registration
│   ├── db.ts                 # Drizzle + better-sqlite3
│   ├── schema.ts             # Drizzle table definitions
│   ├── repo.ts               # Repo class (all SQL)
│   ├── appState.ts           # DB path, repo lifecycle (backup/restore)
│   ├── middleware/errors.ts
│   ├── migrations/           # SQL files + run.ts
│   ├── routes/
│   │   ├── accounts/
│   │   ├── currencies/       # GET catalog + available
│   │   ├── currency-quotes/  # quote CRUD
│   │   ├── holding-types/
│   │   ├── holdings/
│   │   ├── br-fi-holdings/
│   │   ├── market-indicators/ # CRUD + nested values + latest
│   │   ├── dashboard/        # GET /api/dashboard aggregate
│   │   ├── coupon-payments/
│   │   ├── portfolio/
│   │   └── system/           # info, backup, restore
│   ├── system/               # backup/restore implementation
│   └── fixtures/seed.ts
├── __tests__/
├── data.db                   # local dev DB (gitignored typical)
└── package.json
```

## `packages/web`

```
web/
├── src/
│   ├── App.tsx               # React Router routes
│   ├── styles/
│   │   ├── tokens.css        # --cb-* from DESIGN.md
│   │   └── global.css
│   ├── components/
│   │   ├── ui/               # Button, TopNav, PageHeader, EmptyState, ErrorBanner
│   │   ├── forms/            # TextInput, FormField, FormDialog, Select
│   │   └── …                 # HoldingForm, BrFiForm, tables, etc.
│   ├── contexts/             # DisplayCurrencyProvider
│   ├── pages/                # Home, Holdings, BrFiHoldings, MarketIndicators, Accounts, Income, Currencies, Settings, forms
│   ├── hooks/                # useApi, useApiMutation
│   ├── types/api.ts
│   └── utils/
├── __tests__/
├── index.html
└── vite.config.ts            # port 80
```

## Specs and agent docs

| Path | Role |
| --- | --- |
| `.specs/project/PROJECT.md` | Vision, v1 scope |
| `.specs/project/ROADMAP.md` | Milestones |
| `.specs/project/STATE.md` | AD-* decisions, todos |
| `.specs/features/active/` | New feature work |
| `.specs/features/completed/` | Shipped M1–M9 (archived) |

## Config / CI

- **Editor:** `.vscode/settings.json` (WSL terminal profile)
- **Lint:** root `eslint.config.mjs` targets all three `src/` trees via `scripts/lint-monorepo.mjs`
- **No `.github/workflows` in repo** (as of 2026-05-29) — run `npm run lint` and `npm run test` locally before merge
