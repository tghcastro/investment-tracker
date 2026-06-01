# Code Conventions

**Analyzed:** 2026-05-29  
**Status:** Observed in `packages/*` + enforced by ESLint.

## TypeScript

- **Modules:** ESM only (`"type": "module"` in package.json).
- **Imports:** Use `.js` extension in **API** relative imports (Node16/NodeNext resolution), e.g. `from './db.js'`.
- **Web:** Extensionless imports via Vite (`./App.tsx`).
- **Types:** Prefer `import type` for type-only imports where used.

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| React components | PascalCase file + export | `HoldingForm.tsx`, `TopNav.tsx` |
| Hooks | `use` prefix, camelCase file | `useApi.ts`, `useApiMutation.ts` |
| API route registrars | `registerPostAccount`, `registerListHoldings` | `routes/accounts/post.ts` |
| Repo methods | camelCase verbs | `createBondHolding`, `listCouponPayments` |
| DB columns (SQL) | snake_case | `face_value`, `coupon_rate` |
| Drizzle TS fields | camelCase in schema | `faceValue`, `couponRate` |
| CSS variables | `--cb-*` prefix | `--cb-primary`, `--cb-space-lg` |
| React class names | BEM-ish `cb-` block | `cb-app`, `cb-app__main` |

## File layout

- **Co-located tests:** `__tests__/*.test.ts` / `*.test.tsx` next to package root (not inside every `src/` folder).
- **One route concern per file** under `api/src/routes/<resource>/`.
- **CSS:** ComponentName.css beside ComponentName.tsx (no CSS-in-JS).

## ESLint

Root flat config (`eslint.config.mjs`):

- Targets: `packages/bonds-domain/src`, `packages/api/src`, `packages/web/src`
- `@typescript-eslint/no-unused-vars`: error; `_` prefix ignored for args/vars

Run: `npm run lint` from repo root.

## API conventions

- **IDs in URLs:** Positive integer strings without leading zeros (`"1"`, `"42"`) — matches Zod `positiveIntegerId` in `bonds-domain`.
- **Errors:** Thrown `RepoError` with `code` → mapped by `middleware/errors.ts` to HTTP status + JSON body.
- **Coupon rate:** Request/response **percent** at HTTP layer; DB stores decimal (document in serializers when touching holdings).

## Web conventions

- **API-first:** Do not import `bonds-domain` runtime functions in web. Computed values come from API responses or preview routes — see [API-FIRST.md](./API-FIRST.md).
- **Data fetching:** `useApi<T>(url)` for GET; `useApiMutation` for writes — no Redux/React Query in v1.
- **API base:** `import.meta.env.VITE_API_URL ?? ''` — production nginx proxies `/api/` to backend.
- **Forms:** `components/forms/TextInput`, `FormField`, `focusFirstFieldError` on validation failure.
- **Money display:** `utils/money.ts` for formatting; mono font class for numeric columns (`number-display`).

## Design / UI

- Source tokens: root `DESIGN.md` → `packages/web/src/styles/tokens.css`.
- Agent summary: `docs/FRONTEND.md`.
- Do not introduce Tailwind or a component library without an AD in `STATE.md`.

## Git / commits

- Conventional-style subjects common: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs:`.
- Milestone branches existed as `m4-p*`; harness/docs use topic branches like `harness/agent-docs`.

## When adding code

1. Domain validation → `bonds-domain` Zod first, then API route, then web form rules if needed.
2. New API route → register in `server.ts`, add integration test in `api/__tests__/routes.test.ts` or dedicated file.
3. New page → route in `App.tsx`, page under `pages/`, tests in `web/__tests__/`.
