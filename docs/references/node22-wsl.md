# Node 22 + WSL (agents)

Short reference for running commands in this repo on **Windows + WSL Ubuntu**. Full human runbook: [`README.md`](../../README.md). Cursor rule: [`.cursor/rules/wsl-shell.mdc`](../../.cursor/rules/wsl-shell.mdc).

## Requirements

| Item | Value |
| --- | --- |
| Distro | Ubuntu (see `.vscode/settings.json` if different) |
| Node | **22.x** from `.nvmrc` |
| Repo path (WSL) | `/mnt/d/workspace/investment-tracker` |

## Detect environment (Cursor agents)

The Shell tool keeps **one persistent session** per chat. Check once:

| Signal | You are in | Command style |
| --- | --- | --- |
| `uname -s` = `Linux`, paths `/mnt/d/...` | WSL already | Direct commands (below) |
| PowerShell, `D:\...` paths, `wsl.exe` works | Windows host | `wsl -d Ubuntu -e bash -lc '...'` wrapper |

Do **not** wrap with `wsl` when already inside WSL — nested `wsl` fails, burns tokens, and RTK preToolUse hooks miss `npm`/`git` behind the wrapper.

## Session bootstrap (first shell command)

Run **once** when starting an agent session (or when `node -v` is not 22.x):

```bash
source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker
```

## Subsequent commands — already in WSL (default for Cursor)

After bootstrap, run tools directly — no prefix:

```bash
git status
npm test
npm run lint
```

Re-bootstrap only if the session was reset or `node -v` is wrong.

**RTK:** Run tools directly (`npm`, `git`, `vitest`) so hooks can compress output. Avoid hiding them inside `wsl ... bash -lc`.

## Windows PowerShell host only

Do **not** run bare `git`, `npm`, or `node` in PowerShell.

Bootstrap once:

```bash
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker'
```

One-off non-persistent commands need bootstrap in the same invocation:

```bash
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker && <command>'
```

Escape inner single quotes in `<command>` as `'\''`.

Examples:

```bash
wsl -d Ubuntu -e bash -lc 'source ~/.nvm/nvm.sh && nvm use 22 && cd /mnt/d/workspace/investment-tracker && npm test'
```

## Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `command not found: wsl` | Already in WSL; nested wrapper | Run commands directly |
| `crypto.hash is not a function` / Vite Node error | Node 18 (system or sudo without nvm) | Re-run bootstrap; use `npm run dev:web` not raw `sudo npm` |
| `better-sqlite3` crash after install | Node version mismatch at install time | Bootstrap then `npm rebuild better-sqlite3` |
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
