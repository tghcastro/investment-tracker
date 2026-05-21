# Investment Tracker

Personal portfolio tracker (web + Node/TypeScript API) for investors who hold assets across many brokers and spreadsheets. Built with spec-driven development (see [.specs/](.specs/)).

**v1 focus:** Bond holdings and coupon income only.

## Project docs

| Doc | Purpose |
| --- | --- |
| [.specs/project/PROJECT.md](.specs/project/PROJECT.md) | Vision, goals, stack, scope |
| [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) | Milestones and features |
| [.specs/project/STATE.md](.specs/project/STATE.md) | Decisions, blockers, todos |

## Stack (v1)

- **Runtime:** Node.js 22 (see `.nvmrc`)
- **Backend:** TypeScript, REST API, SQLite (`better-sqlite3`)
- **Frontend:** React
- **Data:** Manual entry (no market feeds in v1)

## Development setup (WSL)

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

### API + CORS

Start the API on port 3000 (`npm run dev:api`). The web app fetches `http://localhost:3000` (see `packages/web/.env.example`).

CORS allows browser requests from:

- `http://localhost` (web dev on port 80)
- `http://localhost:3001` (legacy)

Override when starting the API: `CORS_ORIGINS=http://localhost,http://127.0.0.1 npm run dev:api`

## Next steps

1. **`/tlc-spec-driven specify feature`** — M1 platform & bond domain foundation
2. **Map codebase** — after scaffold exists
