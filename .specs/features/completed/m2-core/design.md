# M2 Design

**Spec**: `.specs/features/completed/m2-core/spec.md`  
**Status**: Approved (spec 2026-05-21)  
**Scope**: Large — full design + task breakdown required before Execute

---

## Architecture Overview

M2 extends the M1 modular monorepo without new packages. Same flow: **Web → Fastify API → bonds-domain validators → repo → SQLite**.

```
┌─────────────────────────────────────────────────────────────────┐
│  React SPA (web) — forms, filters, confirm dialogs              │
│  useApi (GET) + useApiMutation (POST/PATCH/DELETE)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Fastify API — new routes + extended list queries               │
│  Shared toApiBondHolding (coupon % on all holding responses)    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  bonds-domain — update schemas, archive rules, ConflictError    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SQLite — migration 002: accounts.archived_at                   │
└─────────────────────────────────────────────────────────────────┘
```

**P3 decision (M2-23):** No separate read-only holding detail page. `/holdings/:id` is the **edit form** (serves as detail). Row actions: **Edit** → same route; optional future click-through deferred.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| Route registration pattern | `packages/api/src/routes/**` | One `register*` fn per file; wire in `server.ts` |
| `createBondHoldingSchema` | `bonds-domain/validators.ts` | Base for `updateBondHoldingSchema` (`.partial()` + id param) |
| `toApiBondHolding` / coupon %↔decimal | `holdings/post.ts`, `get-by-id.ts` | Extract to `routes/holdings/serialize.ts`; use on **all** holding responses (fixes M1 list returning decimal) |
| `validationErrorBody`, `NotFoundError` | `middleware/errors.ts` | Reuse; add `ConflictError` → 409 |
| `RepoError` + `mapRepoError` | `repo.ts`, `errors.ts` | Add codes: `ARCHIVED_ACCOUNT`, `HAS_COUPON_PAYMENTS` |
| UI primitives | `packages/web/src/components/ui/` | `Button`, `PageHeader`, `EmptyState`, `ErrorBanner` |
| `HoldingsTable` | `components/HoldingsTable.tsx` | Add row actions (Edit/Delete), archived account badge |
| `useApi` | `hooks/useApi.ts` | Unchanged for GET |
| `formatCurrency`, `formatDate`, `formatCouponRate` | `utils/format.ts` | Forms + tables |
| web-design.md Forms | `.specs/features/completed/m1-scaffold/web-design.md` | `TextInput`, labels, `semantic-down` errors |

### Integration Points

- **API ← domain:** New Zod schemas for PATCH bodies; archive has no body
- **Repo ← schema:** `archivedAt` column; filter `WHERE archived_at IS NULL` by default
- **Web ← API:** Mutation hook parses `{ code, message, fields }` errors for forms

---

## Schema Migration

**File:** `packages/api/src/migrations/002_accounts_archived_at.sql`

```sql
ALTER TABLE `accounts` ADD COLUMN `archived_at` integer;
```

**Drizzle** (`schema.ts`):

```ts
archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
```

Nullable; `NULL` = active. No backfill — existing rows stay active.

Run via existing `migrate.ts` / Drizzle journal pattern from M1.

---

## Domain Layer (`packages/bonds-domain`)

### Type changes

```ts
export interface Account {
  // ...existing
  archivedAt?: Date;
}
```

### New validators

| Schema | Purpose |
| --- | --- |
| `updateAccountSchema` | `name` (min 1), optional `description` — same rules as create |
| `updateBondHoldingSchema` | `createBondHoldingSchema.partial()` — all fields optional on PATCH |
| `archiveAccountSchema` | Empty body; route-level only |

### New error (optional export)

`ConflictError` can live in **api** middleware only (like `NotFoundError`) — repo throws `RepoError('HAS_COUPON_PAYMENTS', ...)`.

### Tests

Extend `validators.test.ts` for update schemas and partial PATCH edge cases (maturity ≤ purchase when both sent).

---

## Repo Layer (`packages/api/src/repo.ts`)

### New / updated methods

| Method | Behavior |
| --- | --- |
| `listAccounts({ includeArchived?: boolean })` | Default `includeArchived=false` → `WHERE archived_at IS NULL` |
| `getAccount(id)` | Unchanged; returns archived accounts too |
| `updateAccount(id, { name, description? })` | Sets `updated_at`; works on archived (description only if archived — enforced in route) |
| `archiveAccount(id)` | Sets `archived_at = now`; idempotent if already archived |
| `isAccountArchived(id)` | Helper for POST/PATCH holding guards |
| `updateBondHolding(id, partial)` | Updates fields + `updated_at` |
| `deleteBondHolding(id)` | If `listCouponPaymentsByHolding(id).length > 0` → `RepoError('HAS_COUPON_PAYMENTS')`; else hard delete |
| `listBondHoldingsFiltered({ accountId?, maturityAfter? })` | Compose existing filters; empty array if account missing |
| `getPortfolioSummary()` | See response shape below |

### Archive guard on writes

`insertBondHolding` / `updateBondHolding` (when `accountId` present): if target account `archivedAt` set → `RepoError('ARCHIVED_ACCOUNT', ...)`.

### Portfolio summary (repo or dedicated module)

Computed in SQL/TS from all holdings (no account filter):

```ts
type PortfolioSummary = {
  totalFaceValue: number;           // sum faceValue (cents)
  positionCount: number;
  nextMaturityDate: string | null;  // ISO date YYYY-MM-DD
  totalCostBasis: number;           // sum purchasePrice where defined
  holdingsWithCostBasis: number;
  holdingsMissingCostBasis: number;
  maturityLadder: Array<{
    holdingId: string;
    issuer: string;
    maturityDate: string;
    faceValue: number;
  }>;  // max 5, maturity ascending
};
```

---

## API Layer

### Error handling additions

| Condition | Status | Body |
| --- | --- | --- |
| Holding delete with coupons | 409 | `{ code: 'CONFLICT', message: '...M3...' }` |
| POST/PATCH holding → archived account | 400 | `{ code: 'ARCHIVED_ACCOUNT', message: '...' }` |
| PATCH archived account name | 400 | `{ code: 'VALIDATION_ERROR', message: 'Cannot rename archived account' }` |

Add `ConflictError` class or map `RepoError('HAS_COUPON_PAYMENTS')` → 409 in `mapRepoError`.

### Shared holding serialization

**New:** `packages/api/src/routes/holdings/serialize.ts`

- `couponRatePercentToDecimal` / `couponRateDecimalToPercent`
- `toApiBondHolding(holding: BondHolding): BondHolding`

Apply in: `post`, `get-by-id`, `list`, `patch` (new).

### Routes (new files)

| File | Method | Path | Notes |
| --- | --- | --- | --- |
| `accounts/get-by-id.ts` | GET | `/api/accounts/:id` | 404 if missing |
| `accounts/patch.ts` | PATCH | `/api/accounts/:id` | Block name change if archived |
| `accounts/archive.ts` | PATCH | `/api/accounts/:id/archive` | Sets `archivedAt` |
| `holdings/patch.ts` | PATCH | `/api/holdings/:id` | Partial body; coupon % in, decimal in DB |
| `holdings/delete.ts` | DELETE | `/api/holdings/:id` | 204; 409 if coupons |
| `portfolio/summary.ts` | GET | `/api/portfolio/summary` | JSON per shape above |

### Routes (modify)

| File | Change |
| --- | --- |
| `accounts/list.ts` | Query `includeArchived` (default `false`); parse boolean |
| `holdings/list.ts` | Query `accountId` + existing `maturityAfter`; both combinable; `toApiBondHolding` on each row |
| `holdings/post.ts` | Reject archived `accountId` before insert |
| `server.ts` | Register all new routes |

### Query param contract

| Param | Endpoint | Values |
| --- | --- | --- |
| `includeArchived` | GET `/api/accounts` | `true` / absent (false) |
| `accountId` | GET `/api/holdings` | Positive int string |
| `maturityAfter` | GET `/api/holdings` | `YYYY-MM-DD` (existing) |

### Integration tests (`routes.test.ts`)

Add cases per spec edge cases: archive, filter, 409 delete, 400 archived account on POST, portfolio summary empty/populated.

---

## Web Layer

### New hook: `useApiMutation`

**File:** `packages/web/src/hooks/useApiMutation.ts`

```ts
type MutationResult<T> = {
  mutate: (body?: unknown) => Promise<T>;
  loading: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]> | null;
};
```

- Methods: POST, PATCH, DELETE
- Parses 400 `fields` for form display
- Parses 409/404 `message` for banners/dialogs
- Base URL: same as `useApi` (`VITE_API_URL`)

### Form components

**Dir:** `packages/web/src/components/forms/`

| Component | Props | Styling |
| --- | --- | --- |
| `FormField` | `label`, `error?`, `children` | `caption-strong` label; `semantic-down` error |
| `TextInput` | standard input + `error` state | web-design.md: 48px, hairline, focus ring |
| `Select` | `options`, `value`, `onChange` | Same height/border as TextInput |
| `ConfirmDialog` | `open`, `title`, `message`, `onConfirm`, `onCancel` | Modal overlay; `button-secondary-light` + destructive confirm |

**CSS:** `forms.css` importing tokens only.

### Pages

| Route | Component | Data |
| --- | --- | --- |
| `/holdings/new` | `HoldingFormPage` (mode=create) | GET active accounts; POST on submit |
| `/holdings/:id` | `HoldingFormPage` (mode=edit) | GET holding + accounts; PATCH; Delete + confirm |
| `/accounts/new` | `AccountFormPage` (mode=create) | POST |
| `/accounts/:id` | `AccountFormPage` (mode=edit) | GET account; PATCH; Archive + confirm |

**Shared:** `HoldingForm.tsx`, `AccountForm.tsx` — controlled fields, client required checks, server `fieldErrors` merge.

**Empty states:**

- `/holdings/new` with zero active accounts → EmptyState + link `/accounts/new`
- Home empty → CTA links to `/holdings/new` (enabled)

### Holdings list updates (`Holdings.tsx`)

- Read `useSearchParams`: `accountId`, `maturityAfter` (date input)
- Build API URL: `/api/holdings?accountId=…&maturityAfter=…`
- Fetch `GET /api/accounts?includeArchived=true` for name map + archived badge
- Issuer filter: `useMemo` client filter on loaded rows
- Filter bar UI above table; EmptyState when filtered empty with "Clear filters"
- Account card link: `/holdings?accountId={id}`

### HoldingsTable updates

- Row actions: **Edit** (`/holdings/:id`), **Delete** (opens confirm → parent handles DELETE)
- Account label: append `(archived)` when `archivedAt` present on account

### Home updates

- Replace client-side metrics with `GET /api/portfolio/summary`
- Cards: face value, positions, next maturity, cost basis (+ footnote if `holdingsMissingCostBasis > 0`)
- **Maturity ladder** section: 5 rows from `maturityLadder`
- Empty CTA: enabled link to `/holdings/new`

### TopNav

- Enable **Add holding** → `<Link to="/holdings/new">`

### Accounts page

- CTA **Add account** → `/accounts/new`
- Card **View holdings** → `/holdings?accountId={id}`
- Card click or **Manage** → `/accounts/:id` (optional; or edit link on card)

### Router (`App.tsx`)

```tsx
<Route path="/holdings/new" element={<HoldingFormPage mode="create" />} />
<Route path="/holdings/:id" element={<HoldingFormPage mode="edit" />} />
<Route path="/accounts/new" element={<AccountFormPage mode="create" />} />
<Route path="/accounts/:id" element={<AccountFormPage mode="edit" />} />
```

Order: `/holdings/new` before `/holdings/:id` to avoid `:id` capturing `new`.

### Web types

Extend `ApiAccount` with `archivedAt?: string`. Add `ApiPortfolioSummary` in `types/api.ts`.

---

## Form Field Mapping (holding)

| Field | Input | API field | Notes |
| --- | --- | --- | --- |
| Account | Select | `accountId` | Active accounts only |
| Issuer | Text | `issuer` | Required |
| Face value | Number | `faceValue` | Cents; display with currency helper |
| Coupon rate | Number | `couponRate` | Percent 0–100 |
| Coupon frequency | Select | `couponFrequency` | enum |
| Maturity | date | `maturityDate` | ISO date string in JSON |
| Purchase | date | `purchaseDate` | |
| Purchase price | Number (optional) | `purchasePrice` | Cents |
| ISIN / CUSIP | Text (optional) | `isin`, `cusip` | |

Dates: `<input type="date">` → `YYYY-MM-DD` in JSON body (Zod `coerce.date`).

---

## Requirement Traceability (design mapping)

| ID | Design component |
| --- | --- |
| M2-01–03 | `HoldingFormPage` create + TopNav link |
| M2-04–06 | `HoldingFormPage` edit + GET/PATCH |
| M2-07–08 | Delete confirm + `holdings/delete.ts` |
| M2-09–10 | `AccountFormPage` create |
| M2-11–13 | `accounts/get-by-id`, `patch`, holdings name via accounts fetch |
| M2-14–16 | `archive.ts`, list filter, form select exclusion, badge |
| M2-17–19 | Holdings URL params + filter bar + client issuer |
| M2-20–22 | `portfolio/summary.ts` + Home ladder |
| M2-23 | **Deferred** — edit page only |

---

## M1 Fixes Bundled in M2

| Issue | Fix |
| --- | --- |
| GET `/api/holdings` returns coupon as decimal | Apply `toApiBondHolding` on list |
| TopNav / Home "Add holding" disabled | Enable with routes |
| Home computes metrics client-side | Switch to portfolio summary API |

---

## Testing Plan

| Layer | What to add |
| --- | --- |
| bonds-domain | `updateAccountSchema`, `updateBondHoldingSchema` tests |
| api repo | archive, delete 409, filtered list, portfolio summary |
| api routes | each new endpoint + regression on M1 routes |
| web | form submit validation, mutation error display, filter URL (RTL) |

Gate: `npm run test` + `npm run lint` before merge.

---

## Execution Order (preview for tasks.md)

1. Migration + schema + domain types/validators  
2. Repo methods + repo tests  
3. API serialize helper + routes + route tests  
4. `useApiMutation` + form primitives  
5. Holding forms + routes  
6. Account forms + archive  
7. Holdings filters + table actions  
8. Home + portfolio summary  
9. M1 regression pass + manual UAT checklist from spec Success Criteria

---

## Next Phase

**Tasks** → `.specs/features/completed/m2-core/tasks.md` with atomic tasks, verification criteria, and requirement IDs per task.
