# Documentation harness

Mechanical guardrails so agent-facing docs stay aligned with code ([Harness engineering](https://openai.com/index/harness-engineering/) — map not manual, enforce in CI).

## Commands

| Command | When |
| --- | --- |
| `npm run check:docs` | Before PRs that touch `.specs/`, `docs/`, `AGENTS.md`, or architecture |
| `npm run lint` | Every commit |
| `npm run test` | Before merge |

CI (`.github/workflows/ci.yml`) runs all three on push/PR to `main`.

## What `check:docs` validates

- `AGENTS.md` exists and stays ≤ 120 lines
- `.cursorignore` excludes `.specs/features/completed/`
- `.specs/index.md` has no **Stale** rows for `.specs/codebase/*`
- Active codebase docs contain no pre-scaffold phrases when `packages/api` exists
- `STRUCTURE.md` / `INTEGRATIONS.md` reference `packages/api`
- Agent docs do not link to `.specs/features/m1-…` without `completed/`

Failures print check ids and exit 1. Fix the doc or the code, then update **Last verified** in [`.specs/index.md`](../.specs/index.md).

## Always update (same PR as the code)

Agents must keep the **map** in sync with `packages/`. Do not finish a PR without the rows that apply below.

| If you changed… | Always update | Do not update unless asked |
| --- | --- | --- |
| **Decision** (scope, AD, blocker, milestone status) | [`.specs/project/STATE.md`](../.specs/project/STATE.md) | Archived `features/completed/*` |
| **v1 scope / vision** | [`PROJECT.md`](../.specs/project/PROJECT.md) | `AGENTS.md` (index only) |
| **Roadmap / future work** | [`ROADMAP.md`](../.specs/project/ROADMAP.md) | |
| **New package, folder, or route file** | [`STRUCTURE.md`](../.specs/codebase/STRUCTURE.md) | |
| **Layer boundaries, data flow, API areas** | [`ARCHITECTURE.md`](../.specs/codebase/ARCHITECTURE.md) | |
| **Dependencies, Node, Docker, ports, env vars** | [`STACK.md`](../.specs/codebase/STACK.md) | |
| **Naming, lint, import style, API conventions** | [`CONVENTIONS.md`](../.specs/codebase/CONVENTIONS.md) | |
| **Test commands, coverage, new test layer** | [`TESTING.md`](../.specs/codebase/TESTING.md) | |
| **Third-party API, persistence, backup** | [`INTEGRATIONS.md`](../.specs/codebase/INTEGRATIONS.md) | |
| **Tech debt, security, known bugs** | [`CONCERNS.md`](../.specs/codebase/CONCERNS.md) | |
| **React routes, components, CSS patterns** | [`FRONTEND.md`](./FRONTEND.md) | |
| **Design tokens (colors, type scale)** | [`DESIGN.md`](../DESIGN.md) + `packages/web/src/styles/tokens.css` | |
| **How to run / deploy (human)** | [`README.md`](../README.md) | |
| **Any of the above docs** | [`.specs/index.md`](../.specs/index.md) — **Last verified** date, status **Active** | |
| **Active feature spec** (M5+) | `.specs/features/active/<feature>/` (`spec`, `design`, `tasks`) | |
| **Feature shipped** | `git mv` → `features/completed/`; todos + AD in `STATE.md` | |

### Minimum before opening a PR

1. `npm run lint`
2. `npm run test` (if code changed)
3. `npm run check:docs` (if any row in the table applied)
4. Confirm no new links to `.specs/features/m*` without `completed/`

### Usually skip

- **`.specs/features/completed/`** — frozen; copy decisions to `STATE.md` instead
- **`AGENTS.md`** — only when the entry map changes (new doc path, new package); keep ≤ 120 lines
- **`bruno/`**, **`.cursor/JIRA-MCP.md`** — human/MCP setup only

## Doc gardening (recurring)

Run after each shipped milestone or any large refactor:

1. **Archive** feature specs: `git mv .specs/features/active/<name> .specs/features/completed/<name>`
2. **Refresh** `.specs/codebase/*.md` from real `packages/` layout (or ask an agent with codebase map)
3. **Bump** `.specs/index.md` dates and set status **Active**
4. **Copy** new AD-* decisions into `.specs/project/STATE.md` (archive specs are not indexed)
5. **Run** `npm run check:docs && npm run test`
6. **Open PR** titled `docs: garden after <milestone>`

### Agent prompt (copy/paste)

```text
Doc gardening: run npm run check:docs, fix failures, refresh any stale
.specs/codebase/*.md against packages/, update .specs/index.md dates.
Do not load .specs/features/completed/ unless I name a requirement ID.
```

## Adding a new feature (M5+)

1. Create `.specs/features/active/<feature>/` (`spec.md`, `design.md`, `tasks.md`)
2. Keep `AGENTS.md` as index only — link to active spec, not inline requirements
3. On ship → move to `completed/` and run gardening checklist above

## Ownership

| Area | Source of truth |
| --- | --- |
| Product scope | `.specs/project/PROJECT.md`, `STATE.md` |
| Code layout | `packages/` + `.specs/codebase/STRUCTURE.md` |
| UI tokens | `DESIGN.md` + `docs/FRONTEND.md` |
| Agent entry | `AGENTS.md` |

When docs and code disagree, **code wins** — update docs in the same PR as the code change when possible.
