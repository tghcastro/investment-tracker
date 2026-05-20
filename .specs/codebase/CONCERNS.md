# Codebase Concerns

**Analysis Date:** 2026-05-20

This is a **pre-scaffold greenfield** repository. Concerns below are evidence-backed risks for planning and M1 implementation — not runtime bugs.

## Missing Critical Features

**Application scaffold not started:**

- **Problem:** No `package.json`, source code, database schema, tests, or CI. Git HEAD contains only `README.md`, `LICENSE`, `.gitignore`.
- **Files:** Repository root — absence of `apps/`, `packages/`, `src/`
- **Current workaround:** Planning docs in `.specs/project/` define intent.
- **Blocks:** All M1 deliverables (API bootstrap, bond model, persistence).
- **Fix approach:** Execute M1 specify → implement per ROADMAP; re-run codebase mapping after first scaffold commit.

**Bond domain not implemented:**

- **Problem:** Entities (`Account`, `BondHolding`, `CouponPayment`) exist only in ROADMAP, not in code.
- **Files:** `.specs/project/ROADMAP.md` (planned); no TypeScript files
- **Blocks:** Any API or UI work.
- **Fix approach:** M1 bond domain model task.

## Tech Debt

**Stale `.gitignore` (Gradle/Java template):**

- **Issue:** `.gitignore` ignores Gradle build artifacts (`.gradle`, `**/build/`) but project targets Node.js + TypeScript + SQLite.
- **Files:** `.gitignore`
- **Why:** Likely copied from template or previous project idea; initial commit predates stack decisions in STATE.md.
- **Impact:** Missing ignores for `node_modules/`, `dist/`, `.env`, `*.db`, OS files — risk of accidental commits when scaffold lands.
- **Fix approach:** Replace or extend `.gitignore` at M1 with standard Node/TS patterns (`node_modules`, `dist`, `.env*`, `*.sqlite`, coverage output).

**Untracked project specs:**

- **Issue:** `.specs/project/` and `.specs/codebase/` are not in git (only README/LICENSE/.gitignore committed).
- **Files:** `.specs/**` (untracked per git status at mapping time)
- **Impact:** Vision, decisions (AD-001–AD-005), and brownfield docs could be lost if not committed.
- **Fix approach:** Commit `.specs/project/` and `.specs/codebase/` when ready; exclude duplicate skill copies if desired.

**Duplicated skill installations:**

- **Issue:** `tlc-spec-driven` skill copied to `.cursor/skills/`, `.claude/skills/`, and `.windsurf/skills/`.
- **Files:** Three parallel skill trees
- **Impact:** Drift if one copy is updated; repo bloat.
- **Fix approach:** Keep one canonical copy or gitignore agent dirs; document chosen tool in README.

## Test Coverage Gaps

**Entire codebase untested:**

- **What's not tested:** Everything — no source files, no test runner, no CI.
- **Risk:** First implementation may ship without test habits; domain validation bugs (dates, rates) could reach users.
- **Priority:** High — bond validation is core v1 value.
- **Difficulty to test:** Low once M1 scaffold exists; ROADMAP already lists validation requirements.
- **Fix approach:** Add Vitest/Jest with domain unit tests in same PR as bond validation logic; API integration tests for M1 create/retrieve flow.

## Open Architectural Decisions

**Unresolved choices may cause rework:**

- **Problem:** API style (REST vs tRPC), ORM (Drizzle vs Prisma), monorepo tool, and hosting model still open per STATE.md.
- **Files:** `.specs/project/STATE.md` (Open Questions, TBD in PROJECT.md)
- **Impact:** Scaffold structure depends on these; switching later is costly.
- **Fix approach:** Resolve during M1 specify feature; record new AD-* entries in STATE.md.

## Security Considerations

**No auth in v1 (accepted scope risk):**

- **Risk:** If deployed to network without auth, anyone with URL could read/write portfolio data.
- **Files:** N/A — not implemented
- **Current mitigation:** v1 assumes local/single-user; multi-user explicitly out of scope.
- **Recommendations:** Document deployment as local-only until auth added; bind API to localhost in dev; add auth before any public hosting.

**No `.env` or secrets handling yet:**

- **Risk:** Future API keys (broker sync) could be committed without established pattern.
- **Files:** No `.env.example` exists
- **Recommendations:** Add `.env.example` and document env vars at M1; ensure `.gitignore` covers `.env`.

## Scaling Limits

**SQLite single-file (planned — AD-003):**

- **Current capacity:** N/A — not deployed
- **Limit:** Concurrent writes, multi-instance hosting, large portfolio analytics at scale.
- **Symptoms at limit:** DB lock contention; cannot share state across multiple server instances without migration.
- **Scaling path:** Abstract repository layer now (planned); migrate to PostgreSQL if multi-user cloud hosting is chosen.

## Dependencies at Risk

**No dependencies locked yet:**

- **Risk:** Cannot audit for CVEs or deprecation — no `package-lock.json` / `pnpm-lock.yaml`.
- **Impact:** First `npm install` will establish dependency tree; choices should be intentional at M1.
- **Migration plan:** N/A — greenfield.

---

## Recommended Next Steps

1. **Specify M1** — `/tlc-spec-driven specify feature` for platform & bond domain foundation.
2. **Implement scaffold** — monorepo, TypeScript, SQLite, health check, first bond CRUD path.
3. **Fix `.gitignore`** — Node/TS/SQLite patterns before first `npm install`.
4. **Commit `.specs/`** — preserve decisions and this mapping.
5. **Re-map codebase** — refresh all seven docs once real code exists.

---

_Concerns audit: 2026-05-20_
_Update after M1 scaffold and when integrations are added._
