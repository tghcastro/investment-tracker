# M4 — v1 Polish (Backup/Restore & UX) Specification

**Status:** Approved (2026-05-23)

## Problem Statement

M1–M3 deliver a complete bonds-only workflow: accounts, holdings, coupon payments, and income views. Users running Docker or local deploys still have no in-app way to inspect system state or protect their SQLite file — a single volume misconfiguration or accidental delete loses all data. Remaining UX gaps (inconsistent loading patterns, mobile table layout, form error focus) keep the app from feeling production-ready. M4 closes the v1 loop: backup/restore for data safety, a settings page for transparency, targeted UX polish, then a declared **v1.0.0** release for bonds-only scope.

## Goals

- [ ] Users can download a SQLite backup of their portfolio data from the web UI
- [ ] Users can restore from a previously downloaded backup file with explicit confirmation
- [ ] Users can view app version, database path, and last successful backup time on a settings page
- [ ] Remaining UX polish (loading states, responsive tables, form validation UX) is applied consistently across M1–M3 pages
- [ ] All new API endpoints and settings UI have automated test coverage per TESTING.md
- [ ] Milestone completes with a declared v1.0.0 release (bonds-only scope per PROJECT.md)

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| CSV / spreadsheet import | Future Considerations (AD-008); was removed from M4 |
| Cloud backup (S3, Google Drive, etc.) | Local file download/upload only; no external integrations |
| Scheduled / automatic backups | Manual trigger sufficient for solo v1; cron deferred |
| Incremental or partial restore (single table) | Full-database replace only; keeps restore simple and safe |
| Encryption at rest for backup files | User manages downloaded file security |
| Multi-user auth, roles, audit log | Out of v1 scope (PROJECT.md) |
| Database migration to PostgreSQL | AD-003; SQLite remains v1 persistence |
| New bond/coupon features (YTM, accrual, bulk import) | Future Considerations |
| E2E browser tests (Playwright) | TESTING.md marks E2E optional; unit + integration sufficient |
| Mobile-native apps | Responsive web only |

---

## Product Decisions (locked for design)

These resolve gray areas without a separate discuss phase:

| Decision | Choice | Rationale |
| --- | --- | --- |
| Settings route | **`/settings`** + TopNav **Settings** link | Standard location for system info and backup |
| System info source | **API** `GET /api/system/info` | Same pattern as portfolio summary; web stays thin |
| App version display | **`APP_VERSION` env** at runtime, fallback `"dev"` | Release script / Docker build inject tag (e.g. `0.2.0`); no runtime git access |
| Database path display | Resolved **`DATABASE_URL`** path (display-only string) | Matches `packages/api/src/db.ts`; helps Docker users verify mount |
| Last backup timestamp | **Server-side metadata file** beside DB (e.g. `{dataDir}/.last-backup.json`) | Survives page refresh; not stored inside SQLite (restore would wipe it) |
| Backup trigger | **Manual** — user clicks **Download backup** | ROADMAP M4; no background jobs |
| Backup mechanism | **SQLite file snapshot** via API stream | WAL checkpoint + read file; or `better-sqlite3` backup API — design chooses safest |
| Backup filename | `investment-tracker-backup-YYYY-MM-DDTHH-mm-ssZ.db` | Sortable, recognizable in downloads folder |
| Restore input | **Multipart file upload** `POST /api/system/restore` | Browser `<input type="file" accept=".db,application/x-sqlite3">` |
| Restore scope | **Full database replace** | All accounts, holdings, payments replaced atomically |
| Pre-restore safety | **Auto-copy current DB** to `{dataDir}/.pre-restore-{timestamp}.db` before replace | One-click undo path for operator; not exposed in UI v1 |
| Restore validation | Reject non-SQLite files (magic header `SQLite format 3`) | Prevent corrupt uploads |
| Restore confirmation | **Web ConfirmDialog** with explicit destructive copy; type-to-confirm **not** required | Solo user; strong dialog sufficient for v1 |
| Post-restore behavior | **API reconnects** to new DB file in-process; web **full page reload** | User sees restored data immediately without manual restart |
| Restore during traffic | **Single-user assumed** — brief write lock acceptable | v1 local/Docker deploy; no multi-tenant concurrency |
| Max upload size | **32 MB** default (configurable env) | Reasonable for bond-only SQLite; reject 413 above limit |
| Backup auth | **None** (same as all v1 endpoints) | Document local-only / reverse-proxy recommendation |
| UX polish scope | **Audit-driven checklist** — only gaps vs M1–M3 pages | ROADMAP: "remaining gaps only"; no redesign |
| Loading states | **Skeleton or `aria-busy` panels** matching Home/Holdings patterns | Replace plain "Loading…" text where inconsistent |
| Responsive tables | **Stack/card layout ≤639px** for Income + CouponPayments tables | HoldingsTable already card-based; align others |
| Form validation UX | **Focus first invalid field** on failed client submit | Improves keyboard/a11y; apply to HoldingForm, AccountForm, CouponPaymentForm |
| v1 declaration | **Git tag `v1.0.0`** + release script after M4 gate | ROADMAP target: declared v1 for bonds-only |

---

## User Stories

### P1: View System Info ⭐ MVP

**User Story**: As a bond investor self-hosting the app, I want to see version and database location so that I can verify my deployment is correct.

**Why P1**: Transparency before backup/restore; supports Docker troubleshooting (AD-007).

**Acceptance Criteria**:

1. WHEN I open `/settings` THEN the page SHALL fetch `GET /api/system/info` and display **App version**, **Database path**, and **Last backup** (formatted datetime or "Never")
2. WHEN `lastBackupAt` is null THEN the UI SHALL show **Never** (not an error)
3. WHEN the API is unreachable THEN the page SHALL show ErrorBanner per existing web patterns
4. WHEN TopNav renders THEN it SHALL include a **Settings** link to `/settings`
5. WHEN `GET /api/system/info` succeeds THEN response SHALL include `{ version, databasePath, lastBackupAt }` where `lastBackupAt` is ISO 8601 string or `null`

**Independent Test**: Open Settings → see version string and DB path matching API env.

**Requirement IDs**: M4-01, M4-02, M4-03

---

### P1: Download Database Backup ⭐ MVP

**User Story**: As a bond investor, I want to download a backup of my data so that I can recover if the server disk fails or I misconfigure Docker volumes.

**Why P1**: Core M4 value; Docker prod explicitly warns about `./data` loss (docker-compose.prod.yml).

**Acceptance Criteria**:

1. WHEN I click **Download backup** on `/settings` THEN the browser SHALL receive a file download of the current SQLite database
2. WHEN backup succeeds THEN the API SHALL update `lastBackupAt` in server metadata and subsequent `GET /api/system/info` SHALL reflect the new time
3. WHEN backup is triggered THEN `GET /api/system/backup` SHALL return `200` with `Content-Type: application/octet-stream` and `Content-Disposition: attachment` with a timestamped filename
4. WHEN backup is in progress THEN the button SHALL show loading/disabled state and prevent double-submit
5. WHEN backup fails (e.g. DB unreadable) THEN the API SHALL return 500 with JSON error body per M1 error middleware and the UI SHALL show ErrorBanner
6. WHEN backup completes THEN existing portfolio data SHALL remain unchanged (read-only operation)

**Independent Test**: Record holdings → download backup → verify file opens as SQLite with expected row counts (manual or integration test).

**Requirement IDs**: M4-04, M4-05, M4-06

---

### P1: Restore Database from Backup ⭐ MVP

**User Story**: As a bond investor, I want to restore from a backup file so that I can recover my portfolio after data loss or a bad edit session.

**Why P1**: Backup without restore does not satisfy data safety; pairs with download.

**Acceptance Criteria**:

1. WHEN I select a valid `.db` backup file and confirm restore THEN the system SHALL POST `/api/system/restore` (multipart) and replace the active database with the uploaded file
2. WHEN restore succeeds THEN the API SHALL return `200` with `{ restoredAt, previousBackupPath? }` (previousBackupPath optional — path to auto pre-restore copy)
3. WHEN restore succeeds THEN the web app SHALL reload (or navigate to Home) so all views reflect restored data
4. WHEN I initiate restore THEN the UI SHALL show a **ConfirmDialog** stating that current data will be **permanently replaced**
5. WHEN uploaded file is not valid SQLite THEN the API SHALL return `400` with `VALIDATION_ERROR` and the UI SHALL show the error without modifying the live database
6. WHEN upload exceeds max size THEN the API SHALL return `413`
7. WHEN restore completes THEN `GET /api/system/info` and all CRUD endpoints SHALL serve data from the restored database (no stale connection)
8. WHEN restore fails mid-operation THEN the pre-restore auto-copy SHALL remain on disk for operator recovery (implementation detail; not UI)

**Independent Test**: Backup → delete holding via UI → restore backup → holding reappears.

**Requirement IDs**: M4-07, M4-08, M4-09, M4-10

---

### P2: Consistent Loading States

**User Story**: As a user, I want pages to show consistent loading feedback so that I know data is fetching and the app feels responsive.

**Why P2**: ROADMAP UX polish; several M3 sections use text-only loading.

**Acceptance Criteria**:

1. WHEN CouponPaymentsSection loads payments THEN it SHALL show skeleton or `aria-busy` panel matching HoldingsTableSkeleton style (not plain text only)
2. WHEN Income page refetches after period change THEN summary cards SHALL show loading state without flashing stale totals as final values (skeleton or dimmed prior data with `aria-busy`)
3. WHEN HoldingFormPage loads holding + accounts THEN existing `aria-busy` behavior SHALL remain (no regression)
4. WHEN any updated loading UI renders THEN it SHALL use DESIGN.md tokens (no new color/spacing inventing)

**Independent Test**: Throttle network → open holding edit → see skeleton/panel loading for coupon payments section.

**Requirement IDs**: M4-11, M4-12

---

### P2: Responsive Data Tables

**User Story**: As a mobile user, I want income and payment tables to remain readable on narrow screens so that I can review data on a phone.

**Why P2**: ROADMAP explicitly calls out responsive tables; Income/CouponPayments use grid tables.

**Acceptance Criteria**:

1. WHEN viewport width ≤639px THEN Income **By holding** and **All payments** tables SHALL stack rows as cards (header row hidden, labels visible per cell) — same breakpoint pattern as existing Income.css mobile rules
2. WHEN viewport width ≤639px THEN CouponPaymentsTable SHALL stack rows readably (date, amount, actions visible without horizontal scroll)
3. WHEN viewport width >639px THEN desktop table layout SHALL remain unchanged from current behavior
4. WHEN HoldingsTable renders on mobile THEN existing card layout SHALL not regress

**Independent Test**: Resize to 375px width → Income and coupon payment tables remain usable.

**Requirement IDs**: M4-13, M4-14

---

### P2: Form Validation Focus

**User Story**: As a keyboard user, I want the first invalid field focused after submit so that I can fix errors quickly.

**Why P2**: ROADMAP form validation UX; low-cost a11y win across existing forms.

**Acceptance Criteria**:

1. WHEN I submit HoldingForm with client validation errors THEN focus SHALL move to the first field with an error
2. WHEN I submit AccountForm with client validation errors THEN focus SHALL move to the first field with an error
3. WHEN I submit CouponPaymentForm with client validation errors THEN focus SHALL move to the first field with an error
4. WHEN server field errors arrive after submit THEN focus SHALL move to the first server-error field if client validation passed
5. WHEN validation passes THEN focus behavior SHALL be unchanged (no regression)

**Independent Test**: Submit empty holding form → focus lands on first required empty input.

**Requirement IDs**: M4-15, M4-16

---

### P3: v1 Ship Gate ⭐ MVP

**User Story**: As the maintainer, I want M4 to complete with full regression coverage and a v1 release tag so that bonds-only scope is officially shippable.

**Why P3**: ROADMAP declares M4 as v1 milestone.

**Acceptance Criteria**:

1. WHEN M4 implementation is complete THEN `npm run lint && npm run test` SHALL pass across bonds-domain, api, and web
2. WHEN manual UAT runs THEN backup → restore → verify holdings/income flow SHALL succeed on local dev and Docker compose
3. WHEN v1 ships THEN git tag **`v1.0.0`** SHALL be created via release script (or documented manual step) with Docker images `api-1.0.0` / `web-1.0.0`
4. WHEN M4 completes THEN M1–M3 CRUD, portfolio summary, and income views SHALL show no regressions in automated tests

**Independent Test**: Full test suite green + manual backup/restore UAT checklist signed off.

**Requirement IDs**: M4-17, M4-18, M4-19

---

## API Endpoints (M4)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/system/info` | Version, database path, last backup timestamp |
| GET | `/api/system/backup` | Stream SQLite snapshot as file download |
| POST | `/api/system/restore` | Multipart upload; replace database after validation |

All endpoints follow existing error middleware (`VALIDATION_ERROR`, `INTERNAL_ERROR`). No new auth layer.

### GET `/api/system/info` — response shape

```json
{
  "version": "0.2.0",
  "databasePath": "/data/data.db",
  "lastBackupAt": "2026-05-23T14:30:00.000Z"
}
```

`lastBackupAt` is `null` when no backup has been taken on this server instance.

### POST `/api/system/restore` — request

- `Content-Type: multipart/form-data`
- Field name: **`file`** (single file part)
- Max size: 32 MB (default; override via env e.g. `RESTORE_MAX_BYTES`)

Success `200`:

```json
{
  "restoredAt": "2026-05-23T15:00:00.000Z"
}
```

---

## Web Routes (M4)

| Route | Purpose |
| --- | --- |
| `/settings` | System info cards, Download backup, Restore from file |

TopNav SHALL include **Settings** linking to `/settings`.

---

## Edge Cases

- WHEN database file does not exist yet (first boot before migrate) THEN backup SHALL still fail gracefully with 500/503 and clear message; info endpoint MAY show path with `lastBackupAt: null`
- WHEN user restores a backup from an **older schema version** THEN API SHALL run migrations on startup/entrypoint (existing migrate flow) — restore replaces file, next request or reconnect runs migrate
- WHEN user restores a backup from a **newer schema** than app THEN API SHALL return 400 with message to upgrade app (detect via `user_version` or migration journal check)
- WHEN WAL mode is active THEN backup SHALL produce a consistent readable snapshot (checkpoint before read)
- WHEN restore upload is empty or wrong field name THEN API SHALL return 400
- WHEN Docker volume is read-only THEN backup MAY succeed (read) but restore SHALL fail with 500 and message about writable volume
- WHEN concurrent API requests during restore THEN behavior is undefined for v1; restore SHOULD serialize (reject second restore with 409 while in progress)
- WHEN settings page loads on fresh install with seed data THEN version and path display normally; last backup shows **Never**

---

## UX Polish Audit (design input)

Design phase SHALL confirm this checklist against current UI; implement only items still failing:

| Area | Current state (M3) | M4 target |
| --- | --- | --- |
| Home loading | Skeleton cards | Keep; no change unless gap found |
| Holdings loading | HoldingsTableSkeleton | Keep |
| Accounts loading | AccountsSkeleton | Keep |
| Income loading | Summary skeleton | Extend to table sections on refetch (M4-12) |
| Coupon payments loading | Text "Loading payments…" | Skeleton panel (M4-11) |
| Income tables mobile | Partial `@media` rules | Complete card stack (M4-13) |
| CouponPaymentsTable mobile | Basic responsive CSS | Verify card stack (M4-14) |
| Form focus on error | Not implemented | Add to 3 forms (M4-15, M4-16) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| M4-01 | P1: System info page | Design | Mapped |
| M4-02 | P1: System info API | Design | Mapped |
| M4-03 | P1: TopNav Settings link | Design | Mapped |
| M4-04 | P1: Download backup (UI) | Design | Mapped |
| M4-05 | P1: Download backup (API stream) | Design | Mapped |
| M4-06 | P1: Update lastBackupAt | Design | Mapped |
| M4-07 | P1: Restore upload + confirm | Design | Mapped |
| M4-08 | P1: Restore API replace DB | Design | Mapped |
| M4-09 | P1: Post-restore reload | Design | Mapped |
| M4-10 | P1: Invalid file / size limits | Design | Mapped |
| M4-11 | P2: Coupon payments loading | Design | Mapped |
| M4-12 | P2: Income refetch loading | Design | Mapped |
| M4-13 | P2: Income tables mobile | Design | Mapped |
| M4-14 | P2: CouponPaymentsTable mobile | Design | Mapped |
| M4-15 | P2: Form focus (client errors) | Design | Mapped |
| M4-16 | P2: Form focus (server errors) | Design | Mapped |
| M4-17 | P3: Full test gate | Design | Mapped |
| M4-18 | P3: Manual backup/restore UAT | Design | Mapped |
| M4-19 | P3: v1.0.0 release | Design | Mapped |

**Coverage:** 19 total; 10 P1 (MVP backup/restore + settings); 6 P2 (UX polish); 3 P3 (ship)

---

## Success Criteria

- [ ] User can download a SQLite backup from `/settings` without CLI tools
- [ ] User can restore a prior backup and see holdings/income data match the backup
- [ ] Settings page shows version, database path, and last backup time
- [ ] Loading, mobile tables, and form focus polish applied per UX audit (no M1–M3 regressions)
- [ ] `npm run lint && npm run test` passes across all packages
- [ ] v1.0.0 tagged and released with updated prod compose image tags

---

## Suggested Phase Split (for tasks.md)

| Phase | Scope | Gate |
| --- | --- | --- |
| **P1 — Backup API** | System info + backup + restore endpoints, metadata file, API tests | `npm run test -w @investment-tracker/api` |
| **P2 — Settings UI** | `/settings` page, TopNav, download/restore flows, web tests | `npm run test -w @investment-tracker/web` |
| **P3 — UX + ship** | Loading/table/focus polish, full gate, UAT, v1.0.0 release | `npm run lint && npm run test` |

---

## Next Phase

**Review & approve spec** → **Design**: `.specs/features/completed/m4-v1-polish/design.md` → **Tasks**: `.specs/features/completed/m4-v1-polish/tasks.md` → **Execute**.
