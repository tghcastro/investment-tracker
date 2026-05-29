# M5 Tasks — Holdings Framework

**Design**: `.specs/features/active/m5-holdings-framework/design.md`  
**Spec**: `.specs/features/active/m5-holdings-framework/spec.md`  
**Status**: Complete (2026-05-29)

---

## 3-Phase Split

| Phase | Tasks | Scope | Gate |
| --- | --- | --- | --- |
| **P1 — Schema & domain** | T1–T5 | `holding_types` table, migration, domain constants | `npm run test -w @investment-tracker/api` |
| **P2 — API** | T6–T10 | Holding types route, holdings type FK + filter | `npm run test -w @investment-tracker/api` |
| **P3 — Web nav** | T11–T14 | TopNav submenu, types, regression | `npm run lint && npm run test` |

**Suggested branches:** `m5-p1-schema` → `m5-p2-api` → `m5-p3-nav`

---

## Execution Plan

```
P1: T1 → T2 → T3 → T4 → T5
P2: T5 → T6 → T7 → T8 → T9 → T10
P3: T10 → T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1 [P1]: Drizzle schema — `holding_types`

**What**: Add `holding_types` table to `schema.ts`  
**Where**: `packages/api/src/schema.ts`  
**Depends on**: None  
**Requirement**: M5-02

**Done when**:

- [ ] Table matches design columns
- [ ] Exported for migrations

**Commit**: `feat(api): add holding_types schema`

---

### T2 [P1]: Migration — seed holding types

**What**: Generate migration creating table + seed Bond and BRFI rows  
**Where**: `packages/api/src/migrations/`  
**Depends on**: T1  
**Requirement**: M5-02

**Done when**:

- [ ] Migration runs on fresh and existing DBs
- [ ] Seed ids stable (use slug lookup in app, not hardcoded ids in tests)

**Commit**: `feat(api): migration seed holding types`

---

### T3 [P1]: Migration — `bond_holdings.holding_type_id`

**What**: Add FK column, backfill Bond, NOT NULL  
**Where**: migration + `schema.ts`  
**Depends on**: T2  
**Requirement**: M5-03

**Done when**:

- [ ] Existing holdings get Bond type
- [ ] FK enforced

**Commit**: `feat(api): link bond holdings to holding type`

---

### T4 [P1]: Domain — holding type constants

**What**: `HOLDING_TYPE_SLUGS`, Zod schemas in bonds-domain  
**Where**: `packages/bonds-domain/src/holdingTypes.ts`, export from `index.ts`  
**Depends on**: None  
**Requirement**: M5-04

**Done when**:

- [ ] Unit tests for slug enum
- [ ] `npm run test -w @investment-tracker/bonds-domain` passes

**Commit**: `feat(domain): holding type constants`

---

### T5 [P1]: Repo — holding type queries

**What**: `listHoldingTypes()`, update bond queries to join/include type  
**Where**: `packages/api/src/repo.ts`, `packages/api/__tests__/repo.test.ts`  
**Depends on**: T3, T4  
**Requirement**: M5-01, M5-04

**Done when**:

- [ ] Repo returns holding type on bond rows
- [ ] Tests cover list + backfill assumption

**Commit**: `feat(api): repo holding type support`

---

### T6 [P2]: Route — `GET /api/holding-types`

**What**: Read-only list route  
**Where**: `packages/api/src/routes/holding-types/list.ts`, `server.ts`  
**Depends on**: T5  
**Requirement**: M5-01

**Done when**:

- [ ] Route registered; integration test passes

**Commit**: `feat(api): GET /api/holding-types`

---

### T7 [P2]: Holdings list — include type + filter

**What**: Serializer adds `holdingType`; query param `holdingTypeId`  
**Where**: `packages/api/src/routes/holdings/list.ts`, repo  
**Depends on**: T5  
**Requirement**: M5-04, M5-06

**Done when**:

- [ ] Filter integration tests
- [ ] Omitted param returns all bonds (backward compat)

**Commit**: `feat(api): holdings filter by holding type`

---

### T8 [P2]: Holdings create — default Bond type

**What**: POST sets Bond type; validate type id if supplied  
**Where**: `packages/api/src/routes/holdings/post.ts`  
**Depends on**: T5  
**Requirement**: M5-05

**Done when**:

- [ ] Create tests assert Bond type on new rows

**Commit**: `feat(api): default bond holding type on create`

---

### T9 [P2]: Holdings GET by id / PATCH — include type

**What**: Consistent `holdingType` in single-holding responses  
**Where**: `get-by-id.ts`, `patch.ts`  
**Depends on**: T5  
**Requirement**: M5-04

**Done when**:

- [ ] Route tests updated

**Commit**: `feat(api): holding type in bond detail responses`

---

### T10 [P2]: API regression gate

**What**: Full API test suite + routes.test.ts updates  
**Where**: `packages/api/__tests__/`  
**Depends on**: T6–T9  
**Requirement**: All M5 API reqs

**Done when**:

- [ ] `npm run test -w @investment-tracker/api` passes

**Commit**: `test(api): M5 holding framework coverage`

---

### T11 [P3]: Web types + hook

**What**: `ApiHoldingType`; extend bond holding type; optional `useHoldingTypes`  
**Where**: `packages/web/src/types/api.ts`, hooks  
**Depends on**: T10  
**Requirement**: M5-07

**Commit**: `feat(web): holding type API types`

---

### T12 [P3]: TopNav — holdings submenu

**What**: Fetch types; Bond → `/holdings`; BRFI placeholder  
**Where**: `TopNav.tsx`, `TopNav.css`, tests  
**Depends on**: T11  
**Requirement**: M5-07, M5-08

**Done when**:

- [ ] RTL test with mocked types
- [ ] Mobile layout acceptable per FRONTEND.md

**Commit**: `feat(web): TopNav holdings by type`

---

### T13 [P3]: Holdings page — optional type badge

**What**: Show "Bond" badge in table (if time); else skip — P2 optional  
**Where**: `Holdings.tsx`  
**Depends on**: T11  
**Requirement**: M5-04 (display)

**Commit**: `feat(web): bond holding type badge` (optional)

---

### T14 [P3]: M5 gate

**What**: Full monorepo lint + test; update ROADMAP M5 status  
**Depends on**: T12  
**Requirement**: Success criteria

**Done when**:

- [ ] `npm run lint && npm run test` passes
- [ ] Spec status → Approved after user review

**Commit**: `docs: mark M5 holdings framework complete`
