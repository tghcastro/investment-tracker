# M4 Tasks — v1 Polish (Backup/Restore & UX)

**Design**: `.specs/features/m4-v1-polish/design.md`  
**Spec**: `.specs/features/m4-v1-polish/spec.md`  
**Status**: P3 complete (2026-05-28) — M4 ready for v1.0.0 release

---

## 3-Phase Split (work packages)

Use **3 PRs or 3 sessions**. Each phase has its own gate; later phases depend on earlier ones.

| Phase | Tasks | Scope | Gate (done when) |
| --- | --- | --- | --- |
| **P1 — Backup API** | T1–T13 | DB lifecycle, appState, getRepo refactor, system module, 3 routes, API tests | `npm run test -w @investment-tracker/api` |
| **P2 — Settings UI** | T14–T18 | Types, `/settings` page, TopNav, download/restore flows, web tests | `npm run test -w @investment-tracker/web` |
| **P3 — UX + ship** | T19–T23 | Loading/table/focus polish, Docker APP_VERSION, full gate, v1.0.0 | `npm run lint && npm run test` |

**Suggested branch names:** `m4-p1-backup-api` → `m4-p2-settings` → `m4-p3-ship` (merge to `main` in order).

---

## Execution Plan

### P1 — Backup API (T1–T13)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
                              ├─→ T8  [P]
                              ├─→ T9  [P]
                              └─→ T10 [P]
              T8–T10 → T11 → T12 → T13
```

**P1 deliverable:** Full M4 system REST API. Web can call info/backup/restore; no settings UI yet.

**P1 manual smoke (optional):** `curl /api/system/info`; download backup; restore round-trip via curl multipart.

---

### P2 — Settings UI (T14–T18)

```
T13 (P1 done) → T14 → T15 → T16 → T17 → T18
```

**P2 deliverable:** User can view system info and download/restore backup from `/settings`.

---

### P3 — UX + ship (T19–T23)

```
T18 (P2 done) → T19 → T20 → T21 → T22 → T23
                     └ T20 [P] ─┘
```

**P3 deliverable:** M4 complete per spec Success Criteria — UX polish, v1.0.0 release artifacts.

---

## Phase ↔ Task Index

| Task | Phase |
| --- | --- |
| T1–T13 | P1 |
| T14–T18 | P2 |
| T19–T23 | P3 |

---

## Diagram–Definition Cross-Check

| Task | Phase | Depends on (doc) | In execution diagram? | Match |
| --- | --- | --- | --- | --- |
| T1 | P1 | None | P1 start | ✅ |
| T2 | P1 | T1 | P1 chain | ✅ |
| T3 | P1 | T2 | P1 chain | ✅ |
| T4–T7 | P1 | T3 chain | P1 chain | ✅ |
| T8–T10 | P1 | T7 | P1 fan-out | ✅ |
| T11–T13 | P1 | T8–T10 | P1 merge | ✅ |
| T14 | P2 | T13 | P2 start | ✅ |
| T15–T18 | P2 | P2 chain | P2 diagram | ✅ |
| T19–T23 | P3 | T18 chain | P3 diagram | ✅ |

---

## Test Co-location Validation

| Task | Code layer | TESTING.md type | Tests in same task? | Parallel `[P]`? |
| --- | --- | --- | --- | --- |
| T1 | api db helpers | unit ✅ | ✅ db.test.ts or system unit | — |
| T2 | api appState | unit ✅ | ✅ appState.test.ts | — |
| T3 | api routes refactor | integration ✅ | Regression via T13 routes.test.ts | No |
| T4–T7 | api system | unit/integration ✅ | T12–T13 system.test.ts | No (shared temp DB dir) |
| T8–T10 | api routes | integration ✅ | T13 | Impl [P]; tests in T13 |
| T11 | server wiring | none | N/A | No |
| T12 | api system | integration ✅ | ✅ system.test.ts partial | No |
| T13 | api all | integration ✅ | ✅ system + routes regression | No |
| T14 | web types | none | — | — |
| T15–T17 | web page/components | unit ✅ | ✅ settings.test.tsx | Yes where independent |
| T18 | web nav/router | unit ✅ | ✅ topNav + app tests | — |
| T19–T21 | web polish | unit ✅ | Extend existing RTL tests | T20 [P] with T19 |
| T22 | docker/release | none | Manual smoke | — |
| T23 | all packages | full gate | `npm run test` | No |

**E2E (Playwright/Cypress):** None — per spec out of scope.

---

## Task Breakdown

### T1 [P1]: DB lifecycle helpers

**What**: `getDatabaseDirectory`, `closeDatabase`, `checkpointWal`; export from `db.ts`  
**Where**: `packages/api/src/db.ts`, `packages/api/__tests__/db.test.ts` (or co-locate in system tests)  
**Depends on**: None  
**Reuses**: Existing `dbPath`, `createConnection`, drizzle `$client`  
**Requirement**: M4-05, M4-08

**Done when**:

- [ ] WAL checkpoint runs before backup path uses live file
- [ ] `closeDatabase` closes underlying better-sqlite3 handle safely
- [ ] `getDatabaseDirectory` resolves dirname of `dbPath`
- [ ] Unit tests for checkpoint/close (in-memory or temp file)
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `feat(api): add database lifecycle helpers for backup`

---

### T2 [P1]: `appState.ts` — mutable db + repo

**What**: `createAppState(initialDb)` with `getDb`, `getRepo`, `reconnect`  
**Where**: `packages/api/src/appState.ts`, `packages/api/__tests__/appState.test.ts`  
**Depends on**: T1  
**Reuses**: T1 `closeDatabase`, `createConnection`, `createRepo`  
**Requirement**: M4-08

**Done when**:

- [ ] `reconnect()` closes old handle and creates fresh repo
- [ ] Subsequent `getRepo()` returns new instance after reconnect
- [ ] Tests: insert row → reconnect → new repo sees same file data
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `feat(api): add AppState for database reconnect`

---

### T3 [P1]: Route handlers use `getRepo` factory

**What**: Change all `register*(app, repo: Repo)` to `register*(app, getRepo: () => Repo)`; handlers call `getRepo()` at start  
**Where**: `packages/api/src/routes/**/*.ts`, `packages/api/src/server.ts`, `packages/api/__tests__/routes.test.ts`  
**Depends on**: T2  
**Reuses**: Existing route logic unchanged  
**Requirement**: M4-08 (prerequisite)

**Done when**:

- [ ] All 19 existing route modules updated (accounts, holdings, coupon-payments, portfolio)
- [ ] `createServer` passes `() => state.getRepo()` from `createAppState`
- [ ] Existing route integration tests pass unchanged
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: integration (regression)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `refactor(api): route handlers use getRepo factory`

---

### T4 [P1]: System — `version.ts` + `metadata.ts`

**What**: `getAppVersion()` from `APP_VERSION`; read/write `.last-backup.json` beside DB dir  
**Where**: `packages/api/src/system/version.ts`, `packages/api/src/system/metadata.ts`, tests  
**Depends on**: T1  
**Requirement**: M4-02, M4-06

**Done when**:

- [ ] Missing env → version `"dev"`
- [ ] `readLastBackupAt` returns null when file absent
- [ ] `writeLastBackupAt` atomic write; round-trip parse
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `feat(api): system version and backup metadata`

---

### T5 [P1]: System — `validateSqlite.ts`

**What**: Magic header check; temp-open + required tables; migrate-on-temp for schema compatibility  
**Where**: `packages/api/src/system/validateSqlite.ts`, tests  
**Depends on**: T1  
**Reuses**: `migrate` pattern from `migrate.ts`  
**Requirement**: M4-10

**Done when**:

- [ ] Non-SQLite buffer rejected
- [ ] Valid backup from app passes validation
- [ ] Random bytes → false / throw
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `feat(api): sqlite backup validation helpers`

---

### T6 [P1]: System — `backup.ts`

**What**: `createBackupStream(state)` — checkpoint, better-sqlite3 backup to temp, readable stream, filename  
**Where**: `packages/api/src/system/backup.ts`, tests  
**Depends on**: T2, T4  
**Requirement**: M4-05, M4-06

**Done when**:

- [ ] Stream starts with SQLite magic bytes
- [ ] Live DB unchanged after backup
- [ ] Filename matches `investment-tracker-backup-*.db` pattern
- [ ] `npm run build -w @investment-tracker/api` passes

**Tests**: integration (T13)  
**Gate**: Build

---

### T7 [P1]: System — `restore.ts`

**What**: `restoreDatabaseFromUpload(state, buffer)` — mutex, pre-copy, validate, replace, reconnect, migrate  
**Where**: `packages/api/src/system/restore.ts`, tests  
**Depends on**: T2, T5  
**Requirement**: M4-07, M4-08, M4-10

**Done when**:

- [ ] Round-trip: seed → export bytes → mutate → restore → data matches backup
- [ ] Concurrent restore → 409
- [ ] Pre-restore copy written to `.pre-restore-*.db`
- [ ] `getRepo()` after restore serves restored rows
- [ ] `npm run build -w @investment-tracker/api` passes

**Tests**: integration (T13)  
**Gate**: Build

---

### T8 [P1]: GET `/api/system/info` [P]

**What**: Return `{ version, databasePath, lastBackupAt }`  
**Where**: `packages/api/src/routes/system/info.ts`  
**Depends on**: T4  
**Requirement**: M4-02

**Done when**:

- [ ] 200 JSON shape per spec
- [ ] `databasePath` is resolved absolute path
- [ ] Registered in server (or T11)

**Tests**: integration (T13)  
**Gate**: Build

---

### T9 [P1]: GET `/api/system/backup` [P]

**What**: Stream backup; on successful send, `writeLastBackupAt`  
**Where**: `packages/api/src/routes/system/backup.ts`  
**Depends on**: T6  
**Requirement**: M4-05, M4-06

**Done when**:

- [ ] `Content-Type: application/octet-stream`
- [ ] `Content-Disposition: attachment`
- [ ] Subsequent info shows updated `lastBackupAt`

**Tests**: integration (T13)  
**Gate**: Build

---

### T10 [P1]: POST `/api/system/restore` [P]

**What**: Multipart field `file`; call restore; return `{ restoredAt }`  
**Where**: `packages/api/src/routes/system/restore.ts`  
**Depends on**: T7  
**Reuses**: `@fastify/multipart`  
**Requirement**: M4-07, M4-09, M4-10

**Done when**:

- [ ] Valid upload → 200
- [ ] Missing/wrong field → 400
- [ ] Invalid file → 400 `VALIDATION_ERROR`
- [ ] Oversize → 413

**Tests**: integration (T13)  
**Gate**: Build

---

### T11 [P1]: Multipart + register system routes in `server.ts`

**What**: Add `@fastify/multipart` with `RESTORE_MAX_BYTES` (default 32MB); wire info/backup/restore; pass `AppState` to system routes  
**Where**: `packages/api/package.json`, `packages/api/src/server.ts`  
**Depends on**: T8–T10  
**Requirement**: — (wiring)

**Done when**:

- [ ] `@fastify/multipart` installed
- [ ] All three system routes registered
- [ ] Server starts; `npm run build -w @investment-tracker/api` passes

**Tests**: none  
**Gate**: `npm run build -w @investment-tracker/api`

**Commit**: `feat(api): register system backup and restore routes`

---

### T12 [P1]: System module unit tests

**What**: Complete unit coverage for metadata, validateSqlite, version edge cases  
**Where**: `packages/api/__tests__/system/` or co-located under `src/system/`  
**Depends on**: T11  
**Requirement**: M4-02, M4-10

**Done when**:

- [ ] Metadata corrupt file → null, no throw
- [ ] validateSqlite rejects short buffer
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: unit  
**Gate**: `npm run test -w @investment-tracker/api`

---

### T13 [P1]: API integration tests — system + regression

**What**: `system.test.ts` — info, backup magic, metadata update, restore round-trip, 400/413/409; routes.test.ts — CRUD after restore  
**Where**: `packages/api/__tests__/system.test.ts`, extend `routes.test.ts` if needed  
**Depends on**: T12  
**Requirement**: M4-02–M4-10, M4-17 (API portion)

**Done when**:

- [ ] Temp-file `DATABASE_URL` fixture (not `:memory:`)
- [ ] Backup → delete holding → restore → holding back
- [ ] Portfolio summary + income endpoints work post-restore
- [ ] `npm run test -w @investment-tracker/api` passes

**Tests**: integration (co-located)  
**Gate**: `npm run test -w @investment-tracker/api`

**Commit**: `test(api): M4 system backup and restore tests`

---

### T14 [P2]: Web — API types for M4

**What**: Add `ApiSystemInfo`, `ApiRestoreResult` to `types/api.ts`  
**Where**: `packages/web/src/types/api.ts`  
**Depends on**: T13  
**Requirement**: — (types)

**Done when**:

- [ ] Types match API JSON from design
- [ ] `npm run build -w @investment-tracker/web` passes

**Tests**: none  
**Gate**: `npm run build -w @investment-tracker/web`

**Commit**: `feat(web): add M4 system API types`

---

### T15 [P2]: Web — `Settings.tsx` + CSS

**What**: System info metric cards; Download backup button; hidden file input + Restore; loading/error states  
**Where**: `packages/web/src/pages/Settings.tsx`, `Settings.css`  
**Depends on**: T14  
**Reuses**: `PageHeader`, `cb-home__metric-card`, `ErrorBanner`, `ConfirmDialog`, `useApi`  
**Requirement**: M4-01, M4-04, M4-07

**Done when**:

- [ ] Fetches `/api/system/info` on mount
- [ ] Last backup shows "Never" when null
- [ ] Download uses fetch + blob + anchor download
- [ ] Refetch info after successful backup
- [ ] Restore: file picker → ConfirmDialog → FormData POST → `window.location.href = '/'`
- [ ] Buttons disabled while in flight

**Tests**: unit (T17)  
**Gate**: Build

**Commit**: `feat(web): settings page with backup and restore`

---

### T16 [P2]: Web — `formatDateTime` util (if needed)

**What**: Format `lastBackupAt` ISO for display; or extend `format.ts`  
**Where**: `packages/web/src/utils/format.ts`  
**Depends on**: T15  
**Requirement**: M4-01

**Done when**:

- [ ] Settings shows human-readable datetime for last backup
- [ ] Existing format tests pass

**Tests**: unit (extend format tests if present)  
**Gate**: `npm run test -w @investment-tracker/web`

**Commit**: `feat(web): formatDateTime for settings display`

---

### T17 [P2]: Web — `settings.test.tsx`

**What**: RTL tests: info render, Never state, download fetch, restore confirm + POST  
**Where**: `packages/web/__tests__/settings.test.tsx`  
**Depends on**: T15  
**Requirement**: M4-01, M4-04, M4-07

**Done when**:

- [ ] Mock fetch for info, backup blob, restore POST
- [ ] ConfirmDialog interaction for restore
- [ ] `npm run test -w @investment-tracker/web` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/web`

**Commit**: `test(web): settings page tests`

---

### T18 [P2]: Web — TopNav + App route

**What**: Add Settings nav item; `/settings` route; update topNav + app tests  
**Where**: `TopNav.tsx`, `App.tsx`, `__tests__/topNav.test.tsx`, `__tests__/app.test.tsx`  
**Depends on**: T17  
**Requirement**: M4-03

**Done when**:

- [ ] TopNav **Settings** → `/settings`
- [ ] App route resolves Settings heading
- [ ] `npm run test -w @investment-tracker/web` passes

**Tests**: unit (co-located)  
**Gate**: `npm run test -w @investment-tracker/web`

**Commit**: `feat(web): settings navigation and route`

---

### T19 [P3]: Web — `focusFirstFieldError` + forms

**What**: Shared util; wire into HoldingForm, AccountForm, CouponPaymentForm (client + server errors)  
**Where**: `utils/focusFirstFieldError.ts`, three form components, form tests  
**Depends on**: T18  
**Requirement**: M4-15, M4-16

**Field order (ids)**:

- HoldingForm: `holding-account`, `holding-issuer`, `holding-face-value`, `holding-coupon-rate`, `holding-purchase-date`, `holding-maturity-date`, …
- AccountForm: `account-name`, `account-description`
- CouponPaymentForm: `payment-date`, `payment-amount`

**Done when**:

- [ ] Invalid submit focuses first error field
- [ ] Server errors focus first field when client clean
- [ ] Existing form tests pass; add focus assertion where practical
- [ ] `npm run test -w @investment-tracker/web` passes

**Tests**: unit  
**Gate**: `npm run test -w @investment-tracker/web`

**Commit**: `feat(web): focus first invalid field on form errors`

---

### T20 [P3]: Web — loading polish (CouponPayments + Income) [P]

**What**: Skeleton panel for CouponPaymentsSection; Income refetch skeleton cards  
**Where**: `CouponPaymentsSection.tsx/css`, `Income.tsx/css`, tests  
**Depends on**: T18  
**Requirement**: M4-11, M4-12

**Done when**:

- [ ] No plain "Loading payments…" text only
- [ ] Income period change shows skeleton or aria-busy cards during refetch
- [ ] `npm run test -w @investment-tracker/web` passes

**Tests**: unit (extend couponPaymentsSection + income tests)  
**Gate**: `npm run test -w @investment-tracker/web`

**Commit**: `feat(web): consistent loading skeletons for payments and income`

---

### T21 [P3]: Web — responsive table polish

**What**: Mobile card stack for Income tables + CouponPaymentsTable at ≤639px  
**Where**: `Income.css`, `CouponPaymentsTable.css`, optional `data-label` spans  
**Depends on**: T18  
**Requirement**: M4-13, M4-14

**Done when**:

- [ ] 375px viewport: tables readable without horizontal scroll
- [ ] Desktop layout unchanged
- [ ] HoldingsTable no regression

**Tests**: none (visual); optional RTL smoke at narrow width  
**Gate**: `npm run build -w @investment-tracker/web`

**Commit**: `feat(web): mobile responsive income and payment tables`

---

### T22 [P3]: Docker APP_VERSION + release script

**What**: `ARG APP_VERSION` in api Dockerfile; release script passes build-arg; document in README if needed  
**Where**: `docker/api/Dockerfile`, `scripts/investment-tracker-release.sh`  
**Depends on**: T13  
**Requirement**: M4-02, M4-19

**Done when**:

- [ ] Built api image reports tag via `GET /api/system/info`
- [ ] Release script passes stripped tag (no `v` prefix) as APP_VERSION
- [ ] `npm run build -w @investment-tracker/api` passes

**Tests**: manual docker smoke  
**Gate**: Build

**Commit**: `chore(docker): inject APP_VERSION at api image build`

---

### T23 [P3]: Full regression + v1.0.0 ship

**What**: Monorepo lint/test gate; manual UAT checklist; update `docker-compose.prod.yml` to 1.0.0; tag release (user-triggered)  
**Where**: — (verification + compose)  
**Depends on**: T19–T22  
**Requirement**: M4-17, M4-18, M4-19; all success criteria

**Done when**:

- [ ] `npm run lint && npm run test` — all packages green
- [ ] Manual UAT: backup → restore → holdings/income match; settings info correct; mobile spot-check
- [ ] `docker-compose.prod.yml` image tags updated to `1.0.0`
- [ ] ROADMAP M4 marked complete; STATE.md updated
- [ ] No Playwright required

**UAT checklist**:

1. Add holding + coupon payment
2. Settings → download backup
3. Delete payment or holding
4. Restore backup → data restored
5. Home + Income reflect restored data
6. Narrow viewport: Income + coupon payment tables usable

**Tests**: full gate  
**Gate**: `npm run lint && npm run test`

**Commit**: `chore(m4): complete v1 polish milestone`

---

## Requirement Traceability (task → req)

| Task | Requirement IDs |
| --- | --- |
| T1 | M4-05, M4-08 |
| T2 | M4-08 |
| T3 | M4-08 |
| T4 | M4-02, M4-06 |
| T5 | M4-10 |
| T6 | M4-05, M4-06 |
| T7 | M4-07, M4-08, M4-10 |
| T8 | M4-02 |
| T9 | M4-05, M4-06 |
| T10 | M4-07, M4-09, M4-10 |
| T13 | M4-02–M4-10, M4-17 |
| T15 | M4-01, M4-04, M4-07 |
| T16 | M4-01 |
| T17 | M4-01, M4-04, M4-07 |
| T18 | M4-03 |
| T19 | M4-15, M4-16 |
| T20 | M4-11, M4-12 |
| T21 | M4-13, M4-14 |
| T22 | M4-02, M4-19 |
| T23 | All success criteria |

---

## Parallel Execution Map

```
P1 API:  T1 → T2 → T3 → T4 → T5 → T6 → T7 ─┬ T8–T10 [P] → T11 → T12 → T13
                                            └ (merge)

P2 UI:   T14 → T15 → T16 → T17 → T18

P3 Ship: T19 → T20 [P] → T21 → T22 → T23
```

---

## Next Phase

**M4 complete** — user triggers v1.0.0 release via `scripts/investment-tracker-release.sh` (tag, GitHub release, Docker Hub push).
