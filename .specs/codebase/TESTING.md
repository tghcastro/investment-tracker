# Testing

**Test Framework**: Vitest  
**Runner**: `npm run test` (all packages), `npm run test -w [pkg]` (single package)  
**Coverage target**: Unit 80%+, integration coverage for repo + API layers

---

## Test Coverage Matrix

| Code Layer | Test Type | Required | Parallel-Safe | Gate Check |
|---|---|---|---|---|
| Domain entities & validators (bonds-domain) | Unit | ✅ Yes | ✅ Yes | `npm run test -w bonds-domain` |
| Repo query layer (api/src/repo.ts) | Integration (in-memory SQLite) | ✅ Yes | ✅ Yes | `npm run test -w api` |
| API route handlers (api/src/routes/*.ts) | Integration (Fastify + test DB) | ✅ Yes | ⚠️ Sequential | `npm run test -w api` |
| Error middleware | Integration (Fastify test) | ✅ Yes | ✅ Yes | `npm run test -w api` |
| React components (web/src/pages/*.tsx) | Unit (React Testing Library) | ✅ Yes | ✅ Yes | `npm run test -w web` |
| useApi hook (web/src/hooks/*.ts) | Unit + mock fetch | ✅ Yes | ✅ Yes | `npm run test -w web` |
| E2E (browser flow) | E2E (Playwright/Cypress) | ❌ No (M2+) | - | - |

---

## Parallelism Assessment

- **Unit tests** (domain, components): Parallel-Safe ✅ (no shared state, mocked deps)
- **Integration tests** (repo layer, API routes): Sequential ⚠️ (test DB isolation needed; run all tests in same worker but in series)
- **Test execution strategy**: 
  - All unit tests in bonds-domain → parallel OK
  - All unit tests in web → parallel OK
  - All integration tests in api → sequential (single test DB file)
  - Run `npm run test` across all packages → Vitest handles isolation; tests within a package are sequential if they share DB, parallel across packages

---

## Gate Check Commands

| Command | What | When |
|---------|------|------|
| `npm run lint` | ESLint all packages, no errors | Every commit |
| `npm run check:docs` | Agent doc freshness (no pre-scaffold drift) | Doc/architecture PRs; CI on `main` |
| `npm run test` | All tests, pass + coverage | Before merging to main |
| `npm run test -w [pkg]` | Package tests only | Task completion |
| `npm run build` | TS compile, no errors | CI check |

---

## Test Structure

```
packages/
├── bonds-domain/
│   ├── src/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   └── errors.ts
│   └── __tests__/
│       ├── validators.test.ts (unit: Zod schemas)
│       └── types.test.ts (unit: interface shapes)
│
├── api/
│   ├── src/
│   │   ├── server.ts
│   │   ├── repo.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── db.ts
│   └── __tests__/
│       ├── repo.test.ts (integration: SQLite in-memory DB)
│       ├── routes/
│       │   ├── accounts.test.ts (integration: HTTP + DB)
│       │   └── holdings.test.ts (integration: HTTP + DB + validation)
│       ├── middleware/errors.test.ts (integration: error responses)
│       └── fixtures/
│           └── seed.ts (shared test data)
│
└── web/
    ├── src/
    │   ├── App.tsx
    │   ├── pages/
    │   ├── hooks/
    │   └── components/
    └── __tests__/
        ├── components/
        │   ├── App.test.tsx (unit: routing)
        │   ├── Holdings.test.tsx (unit: render + mock fetch)
        │   └── Accounts.test.tsx (unit: render + mock fetch)
        ├── hooks/
        │   └── useApi.test.ts (unit: mock fetch wrapper)
        └── mocks/
            └── fetch.ts (mock setup)
```

---

## Testing Patterns

**Unit (Domain validators):**
```typescript
import { createBondHoldingSchema } from 'bonds-domain/validators';

test('validates bond holding', () => {
  const valid = { ... };
  expect(createBondHoldingSchema.parse(valid)).toBeDefined();
  
  const invalid = { maturityDate: '2020-01-01', purchaseDate: '2021-01-01' };
  expect(() => createBondHoldingSchema.parse(invalid)).toThrow();
});
```

**Integration (Repo + DB):**
```typescript
import { setup } from './fixtures/db.ts'; // In-memory SQLite

beforeAll(async () => {
  db = await setup(); // New DB per test
});

test('inserts and retrieves account', async () => {
  const id = await repo.insertAccount({ name: 'Vanguard' });
  const acc = await repo.getAccount(id);
  expect(acc.name).toBe('Vanguard');
});
```

**Integration (API routes):**
```typescript
import { app } from '../src/server'; // Fastify instance

test('POST /api/holdings creates bond', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/holdings',
    payload: { accountId, issuer: 'Apple', ... }
  });
  expect(res.statusCode).toBe(201);
  expect(res.json().id).toBeDefined();
});

test('POST /api/holdings rejects invalid maturity', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/holdings',
    payload: { ..., maturityDate: '2020-01-01', purchaseDate: '2021-01-01' }
  });
  expect(res.statusCode).toBe(400);
  expect(res.json().code).toBe('VALIDATION_ERROR');
});
```

**Unit (React components):**
```typescript
import { render, screen } from '@testing-library/react';
import Holdings from '../Holdings';

// Mock useApi hook
vi.mock('../hooks/useApi', () => ({
  useApi: vi.fn(() => ({ data: mockHoldings, loading: false, error: null }))
}));

test('renders holdings list', () => {
  render(<Holdings />);
  expect(screen.getByText('Apple Bond')).toBeInTheDocument();
});
```

---

## Coverage Goals

- **Domain**: 90%+ (critical business logic)
- **API repo + routes**: 85%+ (DB queries, HTTP contracts)
- **Web components**: 70%+ (UI interactions less critical for M1)
- **Overall**: 80%+

---

## Native modules (`better-sqlite3`)

`better-sqlite3` is compiled for the **Node version that ran `npm install`**. If tests fail with `NODE_MODULE_VERSION` mismatch or exit code 139 (segfault), your shell is using a different Node than install.

**Fix (from repo root, in WSL — project uses Node 22 per `.nvmrc`):**

```bash
node -v   # should be v22.x (nvm use / fnm use in repo root)
cd /mnt/d/workspace/investment-tracker
npm rebuild better-sqlite3
cd packages/api && npm run test -- --run
```

If you switch Node versions, reinstall or rebuild: `rm -rf node_modules && npm install`, or `npm rebuild better-sqlite3`.

---

## Tips

- **Test data isolation**: Each test DB = new in-memory file or transaction rollback
- **Fixtures**: Create seed data once, reuse in multiple tests
- **Mocks**: Mock fetch in web tests; real DB in repo/API tests
- **CI gates**: `npm run lint && npm run test && npm run build` must pass before merge
