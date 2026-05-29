# External Integrations

**Analyzed:** 2026-05-29  
**Status:** No third-party product APIs in v1. Internal REST + SQLite + Docker/GitHub tooling are implemented.

## Summary

| Category | v1 Status | Notes |
| -------- | --------- | ----- |
| Market data / pricing | **Out of scope** | AD-005 — user-entered bond terms |
| Broker / custodian APIs | **Out of scope** | Manual account labels only |
| Authentication (OAuth, SSO) | **Out of scope** | Single-user / local use assumed |
| Payment processing | **N/A** | Tracker only, not transactions |
| Email / notifications | **None** | Not in ROADMAP M1–M4 |
| Cloud backup | **None** | M4 backup is local file download/upload only |
| Background jobs / queues | **None** | Synchronous CRUD; coupon hints computed on read |

## Persistence (local — implemented)

**Service:** SQLite file via `better-sqlite3`  
**Location:** `packages/api` — Drizzle schema in `src/schema.ts`, connection in `src/db.ts`  
**Configuration:** `DATABASE_URL` (default `packages/api/data.db`)  
**Migrations:** `packages/api/src/migrations/*.sql` + `npm run migrate`  
**Authentication:** N/A (filesystem access to DB file)

## Internal REST API (implemented)

**Purpose:** Web SPA CRUD and portfolio aggregates  
**Location:** `packages/api` (Fastify 5)  
**Client:** `packages/web` — `useApi` / `useApiMutation` → `/api/*` (proxied in Docker/nginx)

| Area | Examples |
| --- | --- |
| Health | `GET /health` |
| Accounts / holdings / coupons | CRUD under `/api/accounts`, `/api/holdings`, `/api/coupon-payments` |
| Portfolio | `/api/portfolio/summary`, `income-summary`, `upcoming-coupons` |
| System | `/api/system/info`, backup download, restore upload |

No inbound webhooks. No job queue.

## M4 backup / restore (local only)

**Purpose:** User downloads SQLite snapshot and restores from file (settings page).  
**Implementation:** `packages/api/src/routes/system/`, `src/system/backup.ts` — not S3/Drive.  
**Status:** Shipped (v1.0).

## Future integrations (deferred)

Per [ROADMAP.md](../project/ROADMAP.md) and [STATE.md](../project/STATE.md):

- Broker OAuth adapters (modular package behind repo)
- Market data pricing APIs
- Spreadsheet import (CSV) — deferred from M4

When adding any external API: env-based secrets, adapter package, update this file and [CONCERNS.md](./CONCERNS.md).

## Development / release tooling (observed)

| Tool | Purpose | Config |
| --- | --- | --- |
| WSL Ubuntu | Node 22 dev shell | `.cursor/rules/wsl-shell.mdc`, `docs/references/node22-wsl.md` |
| Docker Hub | `tghcastro/investment-tracker` images | `docker/`, `make release` |
| GitHub Releases | Tags + release notes | `scripts/investment-tracker-release.sh` |
| Jira (optional) | INVTR project | `.cursor/JIRA-MCP.md` (not indexed by default) |
| Bruno | Manual HTTP tests | `bruno/investment-tracker-api/` (human) |

No API keys or `.env` committed. Use `.cursor/jira.env` locally for Jira MCP only.
