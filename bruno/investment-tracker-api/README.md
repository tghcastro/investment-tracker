# Investment Tracker API — Bruno Collection

Manual HTTP tests for the local Fastify API (`http://localhost:3000`).

## Prerequisites

- [Bruno](https://www.usebruno.com/) installed
- Node.js **22** (`nvm use 22` in WSL)
- API running (see below)

## Start the API

From repo root (WSL):

```bash
source ~/.nvm/nvm.sh && nvm use 22
cd /mnt/d/workspace/investment-tracker

# First time: DB + fixtures
cd packages/api && npm run migrate && npm run seed

# Dev server (port 3000)
npm run dev
# or from root: npm run dev:api
```

## Open in Bruno

1. **Open Collection** → select folder `bruno/investment-tracker-api`
2. Environment: **local** (`baseUrl`, `accountId`, `holdingId`)

## Suggested manual flow

| Step | Request | Notes |
|------|---------|--------|
| 1 | Health → **Health** | Expect `200` `{ "status": "ok" }` |
| 2 | Accounts → **Create Account** | Sets env `accountId` from response |
| 3 | Holdings → **Create Holding** | Uses `{{accountId}}`; sets env `holdingId` |
| 4 | Holdings → **Get Holding by ID** | Uses `{{holdingId}}` |
| 5 | Holdings → **List Holdings** | All holdings |
| 6 | Holdings → **List Holdings (maturityAfter)** | Filtered list |

Optional error checks: invalid account name, invalid holding dates, bad `maturityAfter`, invalid holding id.

## Request notes

- **accountId / holdingId**: positive integer **strings** (`"1"`), not UUIDs
- **POST /api/holdings `couponRate`**: annual **percent** (e.g. `4.25` = 4.25%). Response on create also uses percent
- **GET** holdings (list / by id): `couponRate` is stored decimal in DB (e.g. `0.0425`) — known inconsistency vs POST response

## Environment variables

| Var | Default | Set by |
|-----|---------|--------|
| `baseUrl` | `http://localhost:3000` | `environments/local.bru` |
| `accountId` | `1` | Create Account script, or seed data |
| `holdingId` | `1` | Create Holding script |

After `npm run seed`, fixture accounts/holdings often start at id `1`.
