# Code Conventions

**Analyzed:** 2026-05-20
**Status:** No application source code exists yet. Conventions below combine **observed repo/doc patterns** and **planned targets** from project decisions. Revisit after M1 scaffold when real code samples are available.

## Naming Conventions (planned for TypeScript monorepo)

**Files:**

- React components: PascalCase — e.g. `BondHoldingForm.tsx`, `PortfolioSummary.tsx`
- Hooks: camelCase with `use` prefix — e.g. `useHoldings.ts`
- Domain/services: camelCase or kebab-case matching package tooling — e.g. `bondHoldingService.ts` or `bond-holding-service.ts` (pick one at M1 and enforce via lint)
- API routes: kebab-case or REST resource names — e.g. `holdings.ts`, `coupon-payments.ts`
- Test files: co-located `*.test.ts` / `*.spec.ts` or `__tests__/` (decide at M1)

**Functions/Methods:**

- camelCase for functions and methods — e.g. `createBondHolding`, `validateMaturityDate`
- PascalCase for classes/types — e.g. `BondHolding`, `CouponPaymentService`

**Variables:**

- camelCase — e.g. `faceValue`, `couponRate`, `holdingId`
- Descriptive domain names aligned with bond terminology (issuer, maturity, face value, not generic `item`/`data`)

**Constants:**

- SCREAMING_SNAKE_CASE for true constants — e.g. `MAX_FACE_VALUE`, `DEFAULT_CURRENCY`
- Enum members: PascalCase (if TypeScript enums used) or `as const` objects

## Code Organization (planned)

**Import/Dependency Declaration:**

Expected order (to enforce at M1):

1. External packages (react, fastify, zod, etc.)
2. Internal workspace packages (`@investment-tracker/bonds`, etc.)
3. Relative imports (`./`, `../`)
4. Type-only imports grouped or inline `import type`

**File Structure (domain service example — planned):**

```typescript
// Types / interfaces
// Constants
// Private helpers
// Exported service / public API
```

**Package boundaries (AD-002):**

- Domain packages must not import from `web` or HTTP layer
- Shared types exported from domain package for API and web consumers

## Type Safety / Documentation (planned)

**Approach:** Strict TypeScript (`strict: true` in tsconfig) with runtime validation at API boundaries (e.g. Zod schemas).

**Domain types:** Prefer explicit interfaces/types for `BondHolding`, `Account`, `CouponPayment` rather than anonymous objects.

**API contracts:** Request/response types shared between API and web where possible (shared package or OpenAPI-generated types).

## Error Handling (planned)

**Pattern:**

- Domain layer: throw typed domain errors (e.g. `ValidationError`, `NotFoundError`)
- API layer: map domain errors to HTTP status codes (400, 404, 409)
- Web layer: display user-friendly messages from API error payloads

**Example shape (planned, not yet in repo):**

```typescript
// Domain
if (maturity <= purchaseDate) {
  throw new ValidationError('Maturity must be after purchase date');
}

// API
reply.status(400).send({ error: 'ValidationError', message: err.message });
```

## Comments / Documentation

**Observed (spec/docs):**

- Markdown specs use clear headings, tables, and decision IDs (AD-001, etc.) in `.specs/project/STATE.md`
- README is concise with links to spec docs

**Planned (code):**

- JSDoc on non-obvious domain rules (e.g. coupon accrual assumptions in v1)
- Avoid redundant comments; prefer self-explanatory names
- ADRs/decisions stay in `.specs/project/STATE.md`, not scattered in code

## Formatting & Lint (planned at M1)

- **Formatter:** Prettier (typical for Node/React monorepos)
- **Linter:** ESLint with TypeScript and React plugins
- **Pre-commit:** Optional lint-staged (TBD)

No `.editorconfig`, `eslint.config.*`, or `prettier.config.*` exist yet.

## Git Conventions (observed)

- Single initial commit: `6799fc0 Initial commit`
- Commit message style not yet established — recommend conventional commits when scaffold lands

## Exceptions / Variations

- `.gitignore` follows Gradle/Java conventions — inconsistent with planned Node stack (update at M1)
- Agent/skill directories (`.cursor/`, `.claude/`, `.windsurf/`) duplicate tlc-spec-driven skill — not part of application conventions
