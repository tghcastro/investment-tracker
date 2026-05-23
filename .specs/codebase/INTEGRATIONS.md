# External Integrations

**Analyzed:** 2026-05-20
**Status:** No external service integrations exist in code. v1 scope is **manual entry only** — by design, not omission.

## Summary

| Category | v1 Status | Notes |
| -------- | --------- | ----- |
| Market data / pricing | **Out of scope** | AD-005 — user-entered bond terms |
| Broker / custodian APIs | **Out of scope** | Manual account labels only |
| Authentication (OAuth, SSO) | **Out of scope** | Single-user / local use assumed |
| Payment processing | **N/A** | Tracker only, not transactions |
| Email / notifications | **None planned** | Not in ROADMAP M1–M4 |
| Cloud storage | **None** | SQLite local file |
| Background jobs / queues | **None planned** | Synchronous CRUD sufficient for v1 |

## Persistence (local — planned)

**Service:** SQLite (embedded database file)
**Purpose:** Store accounts, bond holdings, coupon payments locally with minimal ops overhead.
**Implementation:** Planned ORM layer (Drizzle or Prisma) — not yet in codebase.
**Configuration:** Database file path via environment variable or config (TBD at M1) — e.g. `DATABASE_URL=file:./data/investment-tracker.db`
**Authentication:** N/A (file-system access)

## API Integrations

### Internal REST API (planned)

**Purpose:** Web SPA communicates with backend for all CRUD and summary data.
**Location:** `apps/api` (planned)
**Authentication:** None in v1
**Key endpoints (planned from ROADMAP):**

| Endpoint area | Purpose | Milestone |
| ------------- | ------- | --------- |
| `GET /health` | Liveness / bootstrap check | M1 |
| `/accounts` | Manual broker/custodian labels CRUD | M2 |
| `/holdings` | Bond holding CRUD | M1–M2 |
| `/coupon-payments` | Coupon income records | M3 |
| `/portfolio/summary` | Aggregations, maturity ladder | M2 |

**Client:** React SPA in `apps/web` via fetch/axios (TBD).

## Webhooks

**None** — no inbound webhook handlers planned for v1.

## Background Jobs

**Queue system:** None planned.
**Location:** N/A
**Jobs:** N/A

Coupon schedule hints (M3) are described as calculated from user-entered terms at request time, not via scheduled jobs.

## Future Integrations (deferred — not implemented)

Documented in `.specs/project/ROADMAP.md` **Future Considerations** and `.specs/project/STATE.md` **Deferred Ideas**:

### Broker adapter interface

**Purpose:** OAuth/API sync per broker for holdings reconciliation.
**Status:** Deferred — interface sketched as idea only (`Broker adapter interface for future sync`).
**Implementation:** None.

### Market data providers

**Purpose:** Live bond pricing, yield-to-maturity.
**Status:** Out of scope v1; listed under Future Considerations.
**Implementation:** None.

### Import data (Future Considerations)

**Purpose:** Migrate from spreadsheets — file upload/parsing, not external API.
**Status:** Deferred — listed under ROADMAP Future Considerations (not M4).
**Implementation:** None.

### Database backup & restore (M4 — local, not external)

**Purpose:** Download SQLite snapshot and restore from backup; system info page (version, DB path, last backup time).
**Status:** PLANNED M4 — server streams local DB file; no cloud storage integration.
**Implementation:** None.

## Development Tool Integrations (observed)

### WSL (Windows Subsystem for Linux)

**Purpose:** Consistent dev shell for Node tooling on Windows.
**Location:** `.vscode/settings.json`, `.cursor/rules/wsl-shell.mdc`
**Configuration:** Default terminal profile `Ubuntu (WSL)`

### Git / GitHub

**Purpose:** Version control; remote `origin/main` configured.
**Location:** `.git/`
**Authentication:** User environment (not in repo)

### Docker Hub (observed)

**Service:** Docker Hub — `tghcastro/investment-tracker`
**Purpose:** Published api/web container images for deployable releases.
**Tags:** `api-<version>`, `web-<version>` (e.g. `api-0.1.1`, `web-0.1.1`).
**Build/push:** `scripts/investment-tracker-release.sh` or `make release TAG=<version>` (requires `docker login`).
**Configuration:** `DOCKER_IMAGE` env var overrides Hub repository name.

### GitHub Releases (observed)

**Service:** GitHub Releases on `tghcastro/investment-tracker`
**Purpose:** Versioned release notes tied to git tags; documents Docker image refs per release.
**Creation:** Same release script via `gh release create` (requires `gh auth login`).
**Configuration:** `GH_RELEASE=0` skips; `GH_RELEASE_DRAFT=1`, `GH_RELEASE_GENERATE_NOTES=1`, `GH_RELEASE_NOTES` / `GH_RELEASE_NOTES_FILE` customize notes.

## Security Notes for Future Integrations

When broker or market-data integrations are added:

- Store OAuth tokens encrypted at rest
- Never commit API keys — use environment variables
- Separate integration adapters from domain core (per AD-002 modular intent)

No secrets or `.env` files present in repository (good).

---

_Re-map when M1 adds SQLite connection and API server; add sections per new external service._
