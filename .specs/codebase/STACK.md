# Tech Stack

**Analyzed:** 2026-05-29  
**Status:** Implemented in `packages/*` (npm workspaces monorepo).

## Core

| Layer | Choice | Where |
| --- | --- | --- |
| Runtime | Node.js **22** (`.nvmrc`, `engines` in root + web) | WSL Ubuntu for dev |
| Language | TypeScript **6.x** | All packages |
| Package manager | npm workspaces | Root `package.json` → `packages/*` |
| Persistence | SQLite file (`better-sqlite3` + Drizzle ORM) | `packages/api` |
| API | Fastify **5** REST | `packages/api/src` |
| Web | React **19** SPA, Vite **8**, React Router **7** | `packages/web` |
| Domain | `bonds-domain` package (Zod validators, types, coupon math) | `packages/bonds-domain` |

## Workspace packages

| Package | Name | Role |
| --- | --- | --- |
| `packages/bonds-domain` | `bonds-domain` | Shared types, Zod schemas, `couponSchedule` helpers — no I/O |
| `packages/api` | `@investment-tracker/api` | HTTP server, Drizzle schema, `Repo`, migrations, system backup/restore |
| `packages/web` | `@investment-tracker/web` | SPA, CSS tokens from `DESIGN.md`, fetch to API |

**Dependency rule:** `web` and `api` depend on `bonds-domain`; `bonds-domain` depends on nothing in-repo. `api` does not import `web`.

## Tooling (root)

| Tool | Version / notes | Command |
| --- | --- | --- |
| ESLint | flat config `eslint.config.mjs`, `@typescript-eslint` | `npm run lint` |
| Prettier | devDependency | (format on save in editor) |
| Vitest | **4.x** (root hoisted; per-package configs) | `npm run test` |
| TypeScript | `tsc` in api + bonds-domain; Vite handles web | `npm run build` in packages |

## Dev servers

| Service | Port | Command |
| --- | --- | --- |
| API | 3000 | `npm run dev:api` |
| Web (Vite) | **80** (`strictPort`) | `npm run dev:web` (Node 22 via `scripts/dev-web.sh`) |

Web uses `VITE_API_URL` (optional) for API base; default empty string = same-origin or proxy setup in deploy.

## Environment variables (API)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `packages/api/data.db` | SQLite file path |
| `CORS_ORIGINS` | localhost variants | Comma-separated allowed origins |
| `RESTORE_MAX_BYTES` | 32 MiB | Max upload for DB restore |
| `APP_VERSION` | unset | Injected in Docker build for `/api/system/info` |

## Docker / release

| Artifact | Location |
| --- | --- |
| Local compose | `docker-compose.yml` |
| Prod compose | `docker-compose.prod.yml` |
| Images | `docker/api/Dockerfile`, `docker/web/Dockerfile` (nginx → API proxy) |
| Release script | `scripts/investment-tracker-release.sh` |
| Makefile | `make build`, `make start`, `make release TAG=…` |

Hub images: `tghcastro/investment-tracker` tags `api-<version>`, `web-<version>` (see AD-007 in `STATE.md`).

## External services (v1)

None — manual bond data entry only. See [INTEGRATIONS.md](./INTEGRATIONS.md).

## Out of scope (v1)

- Auth / multi-user
- Market data or broker APIs
- PostgreSQL (SQLite only; migrate later if needed)
