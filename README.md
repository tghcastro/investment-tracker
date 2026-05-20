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

## Next steps

1. **`/tlc-spec-driven specify feature`** — M1 platform & bond domain foundation
2. **Map codebase** — after scaffold exists
