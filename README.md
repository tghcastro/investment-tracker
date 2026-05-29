# Investment Tracker

Personal portfolio tracker (web + Node/TypeScript API). Product scope, milestones, and decisions live in **[`.specs/`](.specs/)** — treat that as source of truth; this README covers how to run and deploy the app.

## Documentation

Start here for **what** we're building and **what's next**:

| Doc | Purpose |
| --- | --- |
| [.specs/project/PROJECT.md](.specs/project/PROJECT.md) | Vision, v1 scope, constraints |
| [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) | Milestones (M1–M4) and future work |
| [.specs/project/STATE.md](.specs/project/STATE.md) | Current work, decisions, todos, blockers |

**Agents:** start at [`AGENTS.md`](AGENTS.md). Doc catalog: [`.specs/index.md`](.specs/index.md).

Feature specs: active work in [`.specs/features/active/`](.specs/features/active/); shipped M1–M4 in [`.specs/features/completed/`](.specs/features/completed/).

Codebase reference (stack, architecture, testing):

| Doc | Purpose |
| --- | --- |
| [.specs/codebase/STACK.md](.specs/codebase/STACK.md) | Runtime, packages, deploy |
| [.specs/codebase/ARCHITECTURE.md](.specs/codebase/ARCHITECTURE.md) | Module boundaries |
| [.specs/codebase/TESTING.md](.specs/codebase/TESTING.md) | Test strategy and commands |
| [.specs/codebase/STRUCTURE.md](.specs/codebase/STRUCTURE.md) | Repo layout |

Full index: [`.specs/codebase/`](.specs/codebase/)

## Development setup (WSL)

**Runtime:** Node.js 22 (see `.nvmrc`). Stack details: [.specs/codebase/STACK.md](.specs/codebase/STACK.md).

```bash
cd /mnt/d/workspace/investment-tracker   # or your clone path
source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22
npm install
npm rebuild better-sqlite3             # after any Node version switch
cd packages/api && npm run test -- --run
```

Use the same Node version for `npm install` and `npm test` (avoids native module crashes).

## Web app

The dev server listens on **port 80** so URLs are simple (`http://localhost/...`).

### Start

**Requires Node.js 22** (see `.nvmrc`). If you see `crypto.hash is not a function` or a Vite Node version error, your shell is on Node 18 — run `nvm use 22` first.

From the repo root (WSL):

```bash
cd /mnt/d/workspace/investment-tracker
npm run dev:web
```

`dev:web` loads nvm, switches to Node 22, checks the version, then starts Vite.

On Linux/WSL, port 80 needs elevated privileges. **Do not** run bare `sudo npm run dev` — sudo drops nvm and uses system Node 18. Use:

```bash
npm run dev:web:sudo
```

That keeps Node 22 from nvm while binding to port 80.

Manual equivalent:

```bash
source ~/.nvm/nvm.sh && nvm use 22
node -v   # must be v22.12+
npm run dev -w @investment-tracker/web
```

### Navigation

| Page | URL |
| --- | --- |
| Home | http://localhost/ |
| Holdings | http://localhost/holdings |
| Accounts | http://localhost/accounts |

Use the top nav in the app, or open these links directly.

When running the Vite dev server (`npm run dev:web`) or the local Docker stack (`make start`), a red **DEV** badge appears next to the app title. Production Hub images and `make start-prod` do not show it.

### API + CORS

Start the API on port 3000 (`npm run dev:api`). The web app fetches `http://localhost:3000` (see `packages/web/.env.example`).

CORS allows browser requests from:

- `http://localhost` and `http://127.0.0.1` (web dev on port 80)
- `http://localhost:5173` and `http://127.0.0.1:5173` (Vite fallback if port 80 is unavailable)
- `http://localhost:3001` (legacy)

Use the same host for the web app and API (both `localhost` or both `127.0.0.1`). Override when starting the API: `CORS_ORIGINS=http://localhost,http://127.0.0.1 npm run dev:api`

## Docker (local)

Run the full stack (API + web) in containers built from source. SQLite data persists in `./data/` (gitignored). This is for local Docker testing — not production deploy.

**Requires:** Docker Engine and Docker Compose v2 (`docker compose`).

From the repo root (WSL):

```bash
make build    # build api + web images
make start    # start in background (web on http://localhost/)
make ps       # container status
make logs     # follow logs
make stop     # stop and remove containers
```

| Service | Image build | Notes |
| --- | --- | --- |
| `api` | `docker/api/Dockerfile` | Runs migrations on start; seeds fixtures locally; DB at `/data/data.db` |
| `web` | `docker/web/Dockerfile` | nginx on port 80; proxies `/api/` to the api service |

Manual equivalent:

```bash
docker compose build
docker compose up -d
```

Open http://localhost/ (same routes as dev: `/`, `/holdings`, `/accounts`).

## Docker (production)

Production uses pre-built Hub images and a **persistent data directory outside the repo** (see comments in [`docker-compose.prod.yml`](docker-compose.prod.yml)). Image tags are pinned in that file — update them when you release a new version.

```bash
export INVESTMENT_TRACKER_DATA_DIR=/var/lib/investment-tracker   # Linux
# export INVESTMENT_TRACKER_DATA_DIR=/mnt/d/investment-tracker-data   # WSL example

mkdir -p "$INVESTMENT_TRACKER_DATA_DIR/data"
make start-prod    # web on http://localhost/ (port 80)
make ps-prod
make logs-prod
make stop-prod
```

Production starts with an **empty database** (migrations only, no demo seed). If you previously ran prod against the same data directory, delete `$INVESTMENT_TRACKER_DATA_DIR/data/data.db` before restarting.

**WSL + Docker Desktop tip:** prefer a path inside the Linux filesystem (e.g. `$HOME/investment-tracker-data`) over `/mnt/d/...` for bind mounts — fewer mount glitches.

**Troubleshooting `docker-desktop-bind-mounts ... file exists`:** Docker Desktop can leave a stale bind-mount hash after a failed start. Fix:

```bash
make stop-prod
# replace HASH with the value from the error message
sudo umount /mnt/wsl/docker-desktop-bind-mounts/Ubuntu/HASH 2>/dev/null || true
sudo rm -rf /mnt/wsl/docker-desktop-bind-mounts/Ubuntu/HASH
make start-prod
```

If it keeps happening, restart Docker Desktop or switch `INVESTMENT_TRACKER_DATA_DIR` to `$HOME/investment-tracker-data`.

| | Local (`make start`) | Production (`make start-prod`) |
| --- | --- | --- |
| Images | Built from source | Hub images (tags in `docker-compose.prod.yml`) |
| Database | `./data/data.db` | `$INVESTMENT_TRACKER_DATA_DIR/data/data.db` |
| Fixture seed data | yes (demo accounts/holdings) | no — empty DB until you add data |
| DEV badge | yes | no |
| Use case | Try Docker locally | Real deploy; safe from repo deletes |

## Release (Docker Hub + GitHub)

Publish a versioned release: build/push container images, create a git tag, and open a GitHub release.

**Requires (WSL):**

- Clean git working tree (commit or stash first)
- `docker login` (Docker Hub)
- [GitHub CLI](https://cli.github.com/) — `gh auth login`

```bash
make release TAG=x.y.z
# or
./scripts/investment-tracker-release.sh x.y.z
```

From Windows:

```bash
wsl -d Ubuntu -e bash -lc 'cd /mnt/d/workspace/investment-tracker && make release TAG=x.y.z'
```

**What the release script does:**

1. Build `api` and `web` Docker images (`APP_VERSION` on the api image is set from the tag without the `v` prefix, e.g. `v1.0.0` → `1.0.0`, exposed via `GET /api/system/info`)
2. Create an annotated git tag and push to `origin`
3. Push images to Docker Hub:
   - `tghcastro/investment-tracker:api-<tag>`
   - `tghcastro/investment-tracker:web-<tag>`
4. Create a GitHub release (via `gh release create`) with Docker image refs in the notes

**Useful overrides:**

| Variable | Effect |
| --- | --- |
| `DOCKER_PUSH=0` | Build images only; skip Hub push |
| `GIT_TAG=0` | Skip git tag create/push |
| `GH_RELEASE=0` | Skip GitHub release |
| `GH_RELEASE_DRAFT=1` | Create a draft GitHub release |
| `GH_RELEASE_GENERATE_NOTES=1` | Append auto-generated PR/commit notes |
| `GH_RELEASE_NOTES` / `GH_RELEASE_NOTES_FILE` | Extra release notes |
| `SKIP_GIT_CLEAN=1` | Allow uncommitted changes (not recommended for releases) |
| `DOCKER_IMAGE=...` | Override Hub repository (default: `tghcastro/investment-tracker`) |

Dry-run build (no push, no tag):

```bash
DOCKER_PUSH=0 GIT_TAG=0 GH_RELEASE=0 ./scripts/investment-tracker-release.sh x.y.z
```
