# M5 — Holdings Framework Specification

**Status:** Approved (2026-05-29)  
**Source:** `temp.spec.md` — Holdings Framework  
**Release:** Part of **v2.0.0** (declared after M7 ships)

## Problem Statement

v1 treats every position as a bond in a single holdings surface. Adding Brazilian fixed income (M7) and future asset classes (stocks, ETFs, etc.) requires a shared **Holding Type** model so navigation, reporting, and persistence stay extensible without rewriting bond CRUD.

M5 introduces the framework: every holding belongs to exactly one Holding Type; bonds continue to work unchanged under the **Bond** type; navigation and lists organize by type. The **Brazilian Fixed Income** type is seeded in the database but has no CRUD UI until M7.

## Goals

- [x] `holding_types` table exists with seeded **Bond** and **Brazilian Fixed Income** rows
- [x] Every bond holding references a Holding Type (existing rows migrate to Bond)
- [x] API exposes holding types for clients; bond endpoints accept optional `holdingTypeId` filter
- [x] Web navigation lists supported Holding Types; bond holdings remain at existing routes
- [x] New Holding Types can be added via DB seed/migration script only (no admin UI)
- [x] Automated test coverage per TESTING.md for schema migration, API, and nav changes

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Brazilian Fixed Income CRUD | M7 |
| Multi-currency fields or FX conversion | M6 |
| Holding Type management UI | Spec: types added via DB script only |
| Polymorphic single `holdings` table replacing `bond_holdings` | Over-engineering; type-specific tables per asset class |
| Stock, ETF, fund, REIT, crypto implementations | Future Considerations |
| Portfolio summary split by holding type | M7 integrates BRFI totals; M5 ensures type metadata exists |
| Authentication / multi-user | Out of scope |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Holding Type storage | **`holding_types` lookup table** (`id`, `slug`, `name`, `sort_order`) | Extensible; no user CRUD |
| Initial seed slugs | `bond`, `brazilian-fixed-income` | Matches temp.spec.md initial types |
| Bond migration | All existing `bond_holdings` → `holding_type_id` = Bond | Zero data loss |
| Type-specific tables | **Keep `bond_holdings`**; M7 adds `br_fi_holdings` | Different attributes per type |
| Holding Type API | **`GET /api/holding-types`** read-only list | Nav + filters |
| Bond filter | Optional **`holdingTypeId`** query on `GET /api/holdings` | Defaults to Bond-only if omitted (backward compat) or returns all bond rows |
| Nav structure | **Holdings dropdown** in TopNav listing types from API | FR-BRFI-004 prep; Bond links to `/holdings` |
| BRFI nav entry (M5) | Link visible but **disabled or "Coming soon"** until M7 | Type exists in DB; no empty CRUD page |
| Domain package | Extend **`bonds-domain`** with holding-type constants + Zod enums | Avoid premature package rename; revisit if M7+ grows |

---

## User Stories

### P1: Holding Type catalog (API) ⭐ MVP

**User Story**: As the web client, I need a list of Holding Types so navigation can render without hardcoding asset classes.

**Acceptance Criteria**:

1. WHEN `GET /api/holding-types` is called THEN response SHALL be `200` with array of `{ id, slug, name, sortOrder }`
2. WHEN database is seeded THEN at least **Bond** and **Brazilian Fixed Income** types SHALL exist
3. WHEN no auth (v1/v2 solo deploy) THEN endpoint SHALL remain unauthenticated like other v1 routes
4. WHEN types are ordered THEN `sortOrder` SHALL determine display sequence

**Requirement IDs**: M5-01, M5-02

---

### P1: Bond holdings tagged with Holding Type ⭐ MVP

**User Story**: As a bond investor, I want my existing holdings to remain intact and identifiable as Bond type holdings.

**Acceptance Criteria**:

1. WHEN migration runs THEN every existing `bond_holdings` row SHALL have `holding_type_id` referencing Bond
2. WHEN `GET /api/holdings` returns a row THEN JSON SHALL include `holdingType: { id, slug, name }` (or equivalent nested object)
3. WHEN `POST /api/holdings` creates a bond THEN `holding_type_id` SHALL default to Bond without client supplying it
4. WHEN client passes invalid `holdingTypeId` on create THEN API SHALL return `400`

**Requirement IDs**: M5-03, M5-04, M5-05

---

### P1: Filter holdings by Holding Type ⭐ MVP

**User Story**: As a user, I want to filter the bond holdings list by Holding Type so the framework supports per-type views.

**Acceptance Criteria**:

1. WHEN `GET /api/holdings?holdingTypeId={id}` THEN only bond holdings with that type SHALL be returned
2. WHEN `holdingTypeId` omitted THEN behavior SHALL match pre-M5 (all bond holdings)
3. WHEN filter matches no rows THEN response SHALL be `200` with empty array

**Requirement IDs**: M5-06

---

### P2: Navigation by Holding Type

**User Story**: As a user, I want the Holdings menu organized by asset category so new types can be added without redesigning the shell.

**Acceptance Criteria**:

1. WHEN TopNav renders THEN **Holdings** SHALL show sub-items or dropdown entries per `GET /api/holding-types`
2. WHEN I click **Bonds** THEN app SHALL navigate to `/holdings` with bond list unchanged in behavior
3. WHEN **Brazilian Fixed Income** type exists but M7 not shipped THEN nav item SHALL be visible with non-destructive placeholder (disabled link or "Coming soon" label) — exact copy in design
4. WHEN a new type is added via DB seed in future THEN nav SHALL pick it up without code change (name from API)

**Requirement IDs**: M5-07, M5-08

---

## Success Criteria

M5 is complete when:

1. Migration + seed applied; all existing bond data intact
2. `GET /api/holding-types` and updated holdings responses covered by API tests
3. TopNav reflects holding types; bond CRUD/regression tests pass
4. `npm run lint && npm run test` passes
5. ROADMAP M5 marked complete; work proceeds to M6

---

## Requirement Traceability

| ID | Summary |
| --- | --- |
| M5-01 | Holding types API list |
| M5-02 | Seed Bond + BRFI types |
| M5-03 | Migration assigns Bond type to existing holdings |
| M5-04 | Holdings response includes holding type |
| M5-05 | Create bond defaults to Bond type |
| M5-06 | Filter holdings by holdingTypeId |
| M5-07 | TopNav organized by holding type |
| M5-08 | Extensible nav without hardcoded types |
