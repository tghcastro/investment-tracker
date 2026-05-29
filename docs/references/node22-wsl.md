# Node 22 + WSL (agents)

Short reference for running commands in this repo on **Windows + WSL Ubuntu**. Full human runbook: [`README.md`](../../README.md). Cursor rule: [`.cursor/rules/wsl-shell.mdc`](../../.cursor/rules/wsl-shell.mdc).

## Requirements

| Item | Value |
| --- | --- |
| Distro | Ubuntu (see `.vscode/settings.json` if different) |
| Node | **22.x** from `.nvmrc` |
| Repo path (WSL) | `/mnt/d/workspace/investment-tracker` |

## Shell tool pattern (Cursor agents)

Do **not** run bare `git`, `npm`, or `node` in PowerShell.

```bash
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker && <command>'
```

Escape inner single quotes in `<command>` as `'\''`.

Examples:

```bash
# git
wsl -d Ubuntu -e bash -lc 'cd /mnt/d/workspace/investment-tracker && git status'

# tests
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker && npm test'

# lint
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker && npm run lint'
```

## Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `crypto.hash is not a function` / Vite Node error | Node 18 (system or sudo without nvm) | `nvm use 22`; use `npm run dev:web` not raw `sudo npm` |
| `better-sqlite3` crash after install | Node version mismatch at install time | `nvm use 22 && npm rebuild better-sqlite3` |
| Port 80 permission denied | Privileged port on Linux | `npm run dev:web:sudo` (keeps nvm Node 22) |

## Dev commands (after `npm install`)

| Task | Command |
| --- | --- |
| API :3000 | `npm run dev:api` |
| Web :80 | `npm run dev:web` |
| All tests | `npm run test` |
| Lint | `npm run lint` |
| API DB setup | `cd packages/api && npm run migrate && npm run seed` |

## Paths

- Use `/mnt/d/...` in WSL, not `D:\...` in bash commands.
- Windows path `d:\workspace\investment-tracker` is the same repo via `/mnt/d/workspace/investment-tracker`.
