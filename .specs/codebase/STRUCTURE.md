# Project Structure

**Root:** `/mnt/d/workspace/investment-tracker`
**Analyzed:** 2026-05-20
**Status:** Planning phase — no application packages or source trees yet.

## Directory Tree (observed, max 3 levels)

```
investment-tracker/
├── .agents/                 # Agent skill lock metadata
├── .claude/skills/          # Claude Code skills (tlc-spec-driven)
├── .cursor/
│   ├── rules/               # Cursor rules (e.g. WSL shell)
│   └── skills/              # Cursor skills (tlc-spec-driven)
├── .specs/
│   ├── codebase/            # Brownfield docs (this mapping)
│   └── project/             # PROJECT, ROADMAP, STATE
├── .vscode/                 # Editor settings (WSL terminal)
├── .windsurf/skills/        # Windsurf skills (tlc-spec-driven)
├── .gitignore
├── LICENSE
└── README.md
```

**Not present (planned for M1):** `apps/`, `packages/`, `src/`, `package.json`, `node_modules/`, `tsconfig.json`, test directories, CI config.

## Module Organization

### Project specifications

**Purpose:** Vision, roadmap, decisions, and feature specs for spec-driven development.
**Location:** `.specs/project/`, `.specs/features/` (features dir empty/not created yet)
**Key files:**

| File | Role |
| ---- | ---- |
| `PROJECT.md` | Vision, v1 scope, planned stack |
| `ROADMAP.md` | Milestones M1–M4 and future considerations |
| `STATE.md` | Architecture decisions, todos, blockers |

### Codebase documentation

**Purpose:** Brownfield analysis — stack, architecture, conventions (this mapping).
**Location:** `.specs/codebase/`
**Key files:** `STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`

### Agent / IDE configuration

**Purpose:** Development environment and AI workflow tooling — not runtime application code.
**Location:** `.cursor/`, `.vscode/`, `.claude/`, `.windsurf/`, `.agents/`
**Key files:**

| File | Role |
| ---- | ---- |
| `.cursor/rules/wsl-shell.mdc` | WSL command conventions for agents |
| `.vscode/settings.json` | Default terminal: Ubuntu (WSL) |

### Application code (planned — M1)

**Purpose:** Bond tracker API, web UI, domain logic, persistence.
**Location:** TBD — expected `apps/api`, `apps/web`, `packages/bonds` (or equivalent)
**Key files:** Not created yet.

## Where Things Live

### Bond holdings CRUD (planned)

- **UI/Interface:** `apps/web` — forms and list views (M2)
- **Business Logic:** `packages/bonds` — entities, validation, services (M1)
- **Data Access:** `packages/db` or ORM layer in API package — SQLite repositories (M1)
- **Configuration:** Root or per-package env — database path, API port (M1)

### Coupon income tracking (planned — M3)

- **UI/Interface:** `apps/web` — payment entry and income views
- **Business Logic:** `packages/bonds` — coupon payment entity and aggregation
- **Data Access:** Same SQLite schema as holdings
- **Configuration:** Shared with M1 persistence

### Portfolio summary (planned — M2)

- **UI/Interface:** `apps/web` — dashboard / maturity ladder
- **Business Logic:** `packages/bonds` — aggregation queries/services
- **Data Access:** Read via holding repositories
- **Configuration:** N/A

### Health check / API bootstrap (planned — M1)

- **UI/Interface:** N/A (API-only or minimal web shell)
- **Business Logic:** Minimal — liveness probe
- **Data Access:** Optional DB connectivity check
- **Configuration:** `apps/api` server config

## Special Directories

**`.specs/`**

- **Purpose:** Single source of truth for product and engineering planning outside application code.
- **Examples:** `project/STATE.md` (AD-001 bonds-only scope), `codebase/STACK.md`

**`.cursor/rules/`**

- **Purpose:** Persistent agent instructions for this repo.
- **Examples:** `wsl-shell.mdc`

**Skill directories (`.cursor/skills`, `.claude/skills`, `.windsurf/skills`)**

- **Purpose:** Installed tlc-spec-driven skill copies for different AI tools.
- **Examples:** `tlc-spec-driven/SKILL.md`, `references/brownfield-mapping.md`
- **Note:** Duplicated across three tool dirs — not part of deployable app.

## Git Tracking

**Committed (HEAD):** `README.md`, `LICENSE`, `.gitignore` only.

**Untracked locally (as of mapping):** `.specs/`, `.cursor/`, `.vscode/`, `.agents/`, `.claude/`, `.windsurf/`, modified `README.md`.

Structure will change significantly when M1 scaffold adds monorepo layout — update this doc after first implementation commit.
