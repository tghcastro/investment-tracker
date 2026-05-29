# Jira MCP (project INVTR)

## Setup

1. Copy credentials (once):
   ```bash
   cp .cursor/jira.env.example .cursor/jira.env
   ```
2. Edit `.cursor/jira.env`:
   - `ATLASSIAN_USER_EMAIL` — same email you use to log in at [tghcastro.atlassian.net](https://tghcastro.atlassian.net)
   - `ATLASSIAN_API_TOKEN` — from [API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
3. **Cursor:** reload window or restart MCP (Settings → MCP → `jira-invtr`).
4. Test in terminal:
   ```bash
   set -a && source .cursor/jira.env && set +a
   npx -y @aashari/mcp-server-atlassian-jira get --path "/rest/api/3/myself"
   ```
   Expect JSON with your display name, not `401`.

## Config files

| File | Committed | Purpose |
| --- | --- | --- |
| `.cursor/mcp.json` | Yes | MCP server definition (no secrets) |
| `.cursor/jira.env.example` | Yes | Template |
| `.cursor/jira.env` | **No** (gitignored) | Site, email, token |

## Project

- **Site:** `tghcastro` → `https://tghcastro.atlassian.net`
- **Project key:** `INVTR`
- **Board:** [INVTR board 1](https://tghcastro.atlassian.net/jira/software/projects/INVTR/boards/1)

## Create M2 phases in Jira

Ask Cursor (with MCP enabled):

> In project INVTR, create Epic "M2 — Bond holdings & accounts" and three Stories: P1 Backend API (T1–T17), P2 Web CRUD (T18–T25), P3 Web polish (T26–T29). Link to repo spec `.specs/features/completed/m2-core/tasks.md`.

## Security

- Never commit `.cursor/jira.env`.
- If the token was shared in chat or logs, **revoke it** and create a new one.
