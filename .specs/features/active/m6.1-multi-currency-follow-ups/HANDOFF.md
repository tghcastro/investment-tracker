# M6.1 + API-first — Agent handoff (2026-05-31)

**Stop here.** New agent: read this file first, then [spec.md](./spec.md), [design.md](./design.md), [tasks.md](./tasks.md), [API-FIRST.md](../../codebase/API-FIRST.md).

## Branch / git

- User branch at session start: `m6-multi-currency` (ahead 1 of origin).
- **Uncommitted work** from last session (verify with `git status`):
  - M6.1 specs (`spec.md`, `design.md`, `tasks.md`, this file)
  - Project docs (`STATE.md`, `ROADMAP.md`, `API-FIRST.md`, `ARCHITECTURE.md`, etc.)
  - **Code:** `expectedCouponAmountCents` on holding API + web `CouponPaymentsSection` (no `bonds-domain` runtime in web except `import type`)

## What was decided

### AD-010 — API-first business rules (whole project)

- **Domain + API:** calculations, forecasts, FX, coupon estimates, aggregates.
- **Web:** UI only (render JSON, refetch, enable/disable, format). No `bonds-domain` runtime imports for math.
- Canonical: [`.specs/codebase/API-FIRST.md`](../../codebase/API-FIRST.md)

### M6.1 scope (not coded yet except coupon field)

| Topic | Target |
| --- | --- |
| FX | Purchase-date rates; normalize inverted quotes; `convertedFaceValue` + `convertedCurrency` on **every** list/detail (default `displayCurrency=USD`) |
| Form preview | `GET /api/fx/convert` (P2) — web must not compute |
| Holdings UI | Render API fields; no `displayFaceValue ?? faceValue` |
| Interest type | **Deferred to M7** |

Source requirements: repo root `new-requirements.md`.

## Implemented in last session (coupon estimate)

**Done — verify tests before commit:**

| File | Change |
| --- | --- |
| `packages/api/src/routes/holdings/serialize.ts` | `computeExpectedCouponAmountCents`, field on `toApiBondHolding` |
| `packages/api/__tests__/holdings/serialize.test.ts` | New unit tests |
| `packages/api/__tests__/routes.test.ts` | GET holding expects `expectedCouponAmountCents: 425` |
| `packages/web/src/types/api.ts` | `expectedCouponAmountCents: number \| null` |
| `packages/web/src/components/CouponPaymentsSection.tsx` | Uses `holding.expectedCouponAmountCents`; removed `bonds-domain` import |
| Web test fixtures | Added field to mock holdings |

**Gate commands (WSL, Node 22):**

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd /mnt/d/workspace/investment-tracker
npm run test -w @investment-tracker/api   # passed 126 tests at handoff
npm run test -w @investment-tracker/web   # interrupted — re-run before commit
npm run lint
```

## M6.1 execution order (not started)

**Branch suggestion:** `m6.1-p1-fx-domain`

| Phase | Tasks | Gate |
| --- | --- | --- |
| **P1** | T1–T8 domain + repo | `bonds-domain` + `api` tests |
| **P2** | T9–T14 routes + `GET /api/fx/convert` | `api` tests |
| **P3** | T15–T22 web render-only | `lint` + full `npm run test` |

**P1 critical fix (T7):** `listBondHoldingsFiltered` currently **skips conversion when `displayCurrency === 'USD'`** — wrong; must always attach `converted*` when param omitted (default USD). See [tasks.md](./tasks.md) T7.

## Known web debt (AD-010)

| File | Issue |
| --- | --- |
| `HoldingsTable.tsx` | Still uses `displayFaceValue ?? faceValue` — fix in M6.1 P3 |
| `HoldingForm.tsx` | `couponRate <= 1` heuristic on edit — API returns percent; simplify when touching form |

## Docs touched

- `.specs/features/active/m6.1-multi-currency-follow-ups/` — spec, design, tasks, HANDOFF
- `.specs/project/STATE.md`, `ROADMAP.md`
- `.specs/codebase/API-FIRST.md`, `ARCHITECTURE.md`, `CONCERNS.md`, `CONVENTIONS.md`
- `docs/FRONTEND.md`, `AGENTS.md`, `.specs/index.md`
- `.specs/features/active/m7-brazilian-fixed-income/spec.md` — depends on M6.1; interest type goal

## Do not

- Commit unless user asks.
- Implement M7 before M6.1 ships.
- Add FX/coupon math to `packages/web`.

## User prefs

- Caveman ultra mode in `.cursor/rules` (terse replies).
- WSL + Node 22 for shell (see `.cursor/rules/wsl-shell.mdc`).
- API-first: lists return original + converted; web UI rules only.
