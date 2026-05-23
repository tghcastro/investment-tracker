# Tech Stack

**Analyzed:** 2026-05-20
**Status:** Pre-scaffold — no dependency manifests or application code exist yet. Stack below is **planned** (from `.specs/project/PROJECT.md`, `.specs/project/STATE.md`) unless marked *observed*.

## Core

- **Platform:** Web application + REST backend API (planned)
- **Language:** TypeScript (planned)
- **Runtime:** Node.js (planned; version TBD at M1 scaffold)
- **Package manager:** TBD at M1 (likely npm or pnpm for monorepo)
- **Architecture:** Modular monorepo or multi-package layout — `api`, `web`, shared types/domain (planned, AD-002)

## Frontend (planned)

- **UI Framework:** React (SPA consuming REST API) — AD-004
- **Styling:** TBD at M1 scaffold
- **State Management:** TBD (likely React hooks + fetch/API client initially)
- **Form Handling:** TBD (likely React-controlled forms + server-side validation)

## Backend (planned)

- **API Style:** REST (default; tRPC listed as open question in STATE.md)
- **Database:** SQLite (local file) — AD-003
- **ORM / query layer:** TBD (candidates noted in PROJECT.md: Drizzle or Prisma)
- **Validation:** TBD (Zod mentioned as candidate)
- **HTTP framework:** TBD (Fastify mentioned as candidate)
- **Authentication:** None in v1 scope (multi-user explicitly out of scope)

## Testing (planned — not yet present)

- **Unit:** TBD at M1 (Vitest or Jest expected)
- **Integration:** TBD at M1 (API + SQLite in-memory or temp file)
- **E2E:** TBD (optional for M1; Playwright/Cypress candidate for M2+)
- **Coverage:** TBD

## External Services

- **Market data:** None in v1 — manual entry only (AD-005)
- **Broker sync:** None in v1
- **Hosting / deploy:** Docker Compose (local) + Docker Hub (`tghcastro/investment-tracker`); release script → git tag + GitHub release (AD-007)

## Development Tools

- **IDE terminal:** WSL Ubuntu (*observed* — `.vscode/settings.json`)
- **Spec workflow:** tlc-spec-driven skill (`.cursor/skills/`, `.claude/skills/`)
- **Version control:** Git (*observed*)
- **License:** Apache 2.0 (*observed* — `LICENSE`)
- **Containers:** Docker + Compose (`docker-compose.yml`, `docker/`); release via `scripts/investment-tracker-release.sh` (*observed*)

## Observed Artifacts (no app stack yet)

| Artifact | Notes |
| -------- | ----- |
| `README.md` | Describes intended stack; links to `.specs/project/` |
| `.gitignore` | Gradle/Java patterns only — **mismatch** with planned Node/TS stack (see CONCERNS.md) |
| Git tracked files | `README.md`, `LICENSE`, `.gitignore` only (commit `6799fc0`) |
| Dependency manifests | **None** — no `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, etc. |

## Next Stack Decisions (M1)

Resolve during M1 specify/implement:

1. Monorepo tool (npm workspaces vs pnpm vs Turborepo)
2. API framework (Fastify vs Express vs other)
3. ORM (Drizzle vs Prisma) with SQLite
4. Validation library (Zod vs alternatives)
5. Test runner and lint/format toolchain (ESLint, Prettier, Vitest/Jest)
