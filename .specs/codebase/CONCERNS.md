# Codebase Concerns

**Analysis date:** 2026-05-29  
**Status:** Post–v1.0 (M4 complete). Runtime app exists; items below are ongoing risks and debt.

## Documentation drift (mitigated)

| Issue | Status |
| --- | --- |
| `.specs/codebase/*` described empty repo while `packages/` was live | **Addressed 2026-05-29** — STACK, STRUCTURE, ARCHITECTURE, CONVENTIONS refreshed |
| Archived M1–M4 specs still large if indexed | **Mitigated** — `.cursorignore` + `AGENTS.md` map |

**Remaining:** None — `npm run check:docs` + GitHub Actions CI enforce freshness.

## Product / scope

| Concern | Impact | Mitigation |
| --- | --- | --- |
| No authentication | Single-user / trusted network assumed | Documented in PROJECT.md; do not expose API publicly without auth AD |
| Manual data only | Stale holdings vs reality | User responsibility (AD-005) |
| SQLite single file | Corruption/loss if volume misconfigured | M4 backup/restore + settings page |

## Technical

| Concern | Files | Notes |
| --- | --- | --- |
| Business rules in web (AD-010 drift) | `HoldingsTable.tsx` | Coupon estimate moved to API (2026-05-31); M6.1 fixes FX path — [API-FIRST.md](./API-FIRST.md) |
| No E2E tests | — | Unit + API integration only; browser flows manual |
| Web on port 80 | `vite.config.ts`, `dev-web.sh` | Requires sudo on Linux/WSL (`dev:web:sudo`); easy to run wrong Node without nvm |
| `couponRate` % vs DB decimal | API serializers, `repo.ts` | Easy agent mistake when adding fields — follow existing serializers |
| Restore upload size | `RESTORE_MAX_BYTES` | Default 32 MiB; large DBs need env tuning |
| CORS allowlist | `server.ts` | New dev origins need `CORS_ORIGINS` or code change |

## Ops / repo

| Concern | Notes |
| --- | --- |
| Release process is script-driven | `scripts/investment-tracker-release.sh` — human must run with correct tag |
| `.gitignore` history | Was Gradle-flavored early; verify no accidental ignores of `packages/api/data.db` patterns |
| DESIGN.md size (~570 lines) | Full token spec; agents doing small UI tweaks should use `docs/FRONTEND.md` first |

## Intentional simplifications (not debt)

- No market-data integrations (v1 scope).
- No multi-tenant DB.
- CSS-per-component instead of design-system package — acceptable for solo app scale.

## When planning changes

1. Check [STATE.md](../project/STATE.md) for AD-* before expanding scope.
2. Prefer extending `bonds-domain` + `repo.ts` over duplicating validation in web.
3. Re-run `npm run lint` and `npm run test` from WSL Node 22 before PR.
