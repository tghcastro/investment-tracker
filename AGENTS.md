# Agent map (Investment Tracker)

Short index for coding agents. Read only what your task needs — do not load the whole repo docs tree.

**Product:** Personal bond portfolio tracker (React SPA + Fastify API + SQLite). v1.0 bonds-only; M1–M4 shipped.

## Start here

| Task | Read first (in order) |
| --- | --- |
| Any change | [`.specs/project/STATE.md`](.specs/project/STATE.md) — current work, AD decisions, blockers |
| Scope / what not to build | [`.specs/project/PROJECT.md`](.specs/project/PROJECT.md) |
| Milestones / future work | [`.specs/project/ROADMAP.md`](.specs/project/ROADMAP.md) |
| New feature (M6.1+) | **Next:** [M6.1](../.specs/features/active/m6.1-multi-currency-follow-ups/spec.md) (execute). M7 deferred — [m7](../.specs/features/active/m7-brazilian-fixed-income/spec.md). M5–M6 in [`features/completed/`](../.specs/features/completed/); see [`.specs/index.md`](.specs/index.md) |

## Codebase (source of truth for implementation)

| Doc | Use when |
| --- | --- |
| [`.specs/codebase/ARCHITECTURE.md`](.specs/codebase/ARCHITECTURE.md) | Module boundaries, data flow |
| [`.specs/codebase/API-FIRST.md`](.specs/codebase/API-FIRST.md) | **Business rules in API only** — web UI rules; calc/forecast pattern |
| [`.specs/codebase/STRUCTURE.md`](.specs/codebase/STRUCTURE.md) | Repo layout, package paths |
| [`.specs/codebase/STACK.md`](.specs/codebase/STACK.md) | Node 22, workspaces, SQLite, Docker |
| [`.specs/codebase/CONVENTIONS.md`](.specs/codebase/CONVENTIONS.md) | Naming, imports, lint |
| [`.specs/codebase/TESTING.md`](.specs/codebase/TESTING.md) | Test commands, coverage gates |
| [`.specs/codebase/INTEGRATIONS.md`](.specs/codebase/INTEGRATIONS.md) | External services (v1: none) |
| [`.specs/codebase/CONCERNS.md`](.specs/codebase/CONCERNS.md) | Known risks and tech debt |

Full catalog and freshness: [`.specs/index.md`](.specs/index.md).

## Packages (quick paths)

| Package | Role |
| --- | --- |
| `packages/bonds-domain/` | Entities, validation, domain services |
| `packages/api/` | Fastify REST, SQLite repo, migrations |
| `packages/web/` | React + Vite SPA, `src/styles/tokens.css` from design tokens |

## UI / design

| Doc | Use when |
| --- | --- |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | **Start here** — components, routes, CSS conventions |
| [`DESIGN.md`](DESIGN.md) | Full token YAML (colors, typography, components) |
| [`.specs/features/completed/m1-scaffold/web-design.md`](.specs/features/completed/m1-scaffold/web-design.md) | Historical M1 page specs (archive) |

## Environment reference

| Doc | Use when |
| --- | --- |
| [`docs/references/node22-wsl.md`](docs/references/node22-wsl.md) | WSL + Node 22 commands (condensed) |
| [`.cursor/rules/wsl-shell.mdc`](.cursor/rules/wsl-shell.mdc) | Cursor always-on WSL rule |

## Environment (always apply)

- **Shell:** WSL Ubuntu — [`docs/references/node22-wsl.md`](docs/references/node22-wsl.md)
- **Node:** 22 (`.nvmrc`) — never run bare PowerShell `npm`/`git` on Windows host
- **Repo path in WSL:** `/mnt/d/workspace/investment-tracker`

## Run locally (minimal)

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd /mnt/d/workspace/investment-tracker && npm install
npm run test
npm run dev:web    # port 80 — see README.md for sudo
npm run dev:api    # port 3000
```

Human runbook (deploy, Docker, URLs): [`README.md`](README.md) — load only if the task needs ops detail.

## Not indexed by default (open explicitly if needed)

| Path | Why excluded |
| --- | --- |
| `.specs/features/completed/` | Shipped M1–M4 specs (~6.5k lines); use for archaeology or requirement IDs only |
| `README.md` | Long human onboarding |
| `bruno/` | Manual HTTP collection |
| `.cursor/JIRA-MCP.md` | Atlassian MCP setup |

Configured in [`.cursorignore`](.cursorignore).

## Jira

Project **INVTR** — setup: [`.cursor/JIRA-MCP.md`](.cursor/JIRA-MCP.md).

## Always update (same PR as the code)

Full matrix: [`docs/harness.md`](docs/harness.md#always-update-same-pr-as-the-code).

| If you changed… | Update |
| --- | --- |
| Scope, milestone, or AD-worthy decision | `.specs/project/STATE.md` (+ `PROJECT.md` / `ROADMAP.md` if scope shifted) |
| Packages, routes, modules, or DB schema | Matching `.specs/codebase/*.md` + **Last verified** in `.specs/index.md` |
| Tests or CI gates | `.specs/codebase/TESTING.md` |
| UI routes, forms, or token usage | `docs/FRONTEND.md`; new tokens → `DESIGN.md` |
| External service, env var, or deploy | `STACK.md` / `INTEGRATIONS.md`; human runbook → `README.md` |
| New risk or known limitation | `.specs/codebase/CONCERNS.md` |
| Shipped feature | Move `features/active/` → `completed/`; close todos in `STATE.md` |

**Every doc-touch PR:** `npm run check:docs`. **Rarely:** `AGENTS.md` (index only — link out, do not grow).

## Doc harness (maintenance)

- CI runs `check:docs` — see [`docs/harness.md`](docs/harness.md)
