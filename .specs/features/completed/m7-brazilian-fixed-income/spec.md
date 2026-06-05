# M7 — Brazilian Fixed Income Specification

**Status:** Shipped (2026-06-05) — v2.0.0 tag deferred  
**Source:** `temp.spec.md` — Brazilian Fixed Income  
**Depends on:** M5 (holding types + nav), M6 (account currencies, BRL quotes), M6.1 (purchase-date FX)  
**Architecture:** [API-FIRST.md](../../codebase/API-FIRST.md) — BRFI display/validation via API fields and routes, not web calculations  
**Release:** **v2.0.0** declared when M7 completes (with M5 + M6)

## Problem Statement

International bond fields (face value, ISIN, CUSIP, coupon rate) do not model Brazilian products (LCI, LCA, Tesouro Direto, CRI, CRA) indexed to CDI, IPCA, SELIC, or pre-fixed rates. M7 adds a dedicated **Brazilian Fixed Income** holding type with its own entity, CRUD UI, and portfolio integration — completing the v2 feature set alongside the M5 framework and M6 currency support.

## Goals

- [x] CRUD for Brazilian Fixed Income holdings (create, read, update, delete, list)
- [x] Product types: LCI, LCA, Tesouro Direto, CRI, CRA
- [x] Indexing: CDI Percentage, IPCA + Spread, SELIC, Pre-Fixed — with validated parameters
- [x] Currency inherited from account allowed currencies (not overridable at holding level)
- [x] Accounts may hold both Bonds and BRFI positions
- [x] Navigation: BRFI entry in Holdings menu routes to dedicated list/form pages
- [x] Portfolio summary includes BRFI invested amounts (native + display currency from M6)
- [ ] **Interest type** on holding forms: read-only Simple / Compound label (deferred from M6.1; `new-requirements.md`) — bonds vs BRFI rules in design
- [x] Automated test coverage
- [ ] **v2.0.0** release after M7 gate (deferred — code shipped, tag pending)

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| Broker integrations / imports | Spec out of scope |
| Yield accrual calculations (CDI/IPCA daily accrual) | Display invested amount only in v2; accrual Future Considerations |
| Additional Holding Types (stocks, ETFs) | Future Considerations |
| Coupon/cash-flow tracking for BRFI | Distinct from bond coupons; defer to Future Considerations |
| Authentication | Out of scope |

---

## Product Decisions (locked for design)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Table | **`br_fi_holdings`** separate from `bond_holdings` | Different attributes; no face value/ISIN/CUSIP |
| Holding type link | `holding_type_id` → Brazilian Fixed Income (from M5 seed) | Framework consistency |
| Product type | Enum: `LCI`, `LCA`, `TESOURO_DIRETO`, `CRI`, `CRA` | Spec products |
| Indexing type | Enum + parameter columns | See indexing table below |
| Currency | **Single currency per holding** = account's selected currency at create time (from account allowed set); **immutable** after create OR re-validated on account change — design: **set at create from account primary currency** (first in list) unless user picks among account currencies on form |
| Invested amount | **Integer cents** in holding currency | M6 convention |
| API prefix | **`/api/br-fi-holdings`** | Clear separation from bonds |
| Web routes | **`/holdings/brazilian-fixed-income`** (+ `/new`, `/:id`) | Nav slug alignment |
| Delete | **Hard delete** with confirm dialog | Match bond pattern |
| Income page | **Out of M7** — BRFI not in coupon income views | Different cash-flow model |

### Indexing parameters

| Indexing type | Required fields | Example |
| --- | --- | --- |
| CDI Percentage | `cdiPercentage` (number, e.g. 105) | 105% CDI |
| IPCA + Spread | `ipcaSpreadPercent` (number) | IPCA + 6.5% |
| SELIC | none | SELIC |
| Pre-Fixed | `preFixedRatePercent` (number) | 12.5% |

---

## Domain Model: Brazilian Fixed Income Holding

| Field | Description |
| --- | --- |
| Name | Investment name |
| Product type | LCI, LCA, Tesouro Direto, CRI, CRA |
| Indexing type | CDI Percentage, IPCA + Spread, SELIC, Pre-Fixed |
| Purchase date | Date |
| Maturity date | Date (must be after purchase) |
| Invested amount | Principal (cents) |
| Account | FK → accounts |
| Currency code | From account allowed currencies at create |

**Not applicable:** face value, ISIN, CUSIP.

---

## User Stories

### P1: Create BRFI holding ⭐ MVP

**User Story**: As an investor with Brazilian positions, I want to add LCI/LCA/Tesouro holdings so I can track them alongside bonds.

**Acceptance Criteria** (FR-BRFI-001):

1. WHEN I open `/holdings/brazilian-fixed-income/new` THEN form shows name, product type, indexing, dates, amount, account
2. WHEN I submit valid data THEN POST `/api/br-fi-holdings` succeeds and redirects to list
3. WHEN maturity ≤ purchase THEN validation error
4. WHEN indexing type requires parameters and they are missing THEN validation error

**Requirement IDs**: M7-01, M7-02, M7-03

---

### P1: List / edit / delete BRFI ⭐ MVP

**Acceptance Criteria** (FR-BRFI-001):

1. WHEN I open `/holdings/brazilian-fixed-income` THEN list shows all BRFI holdings with key columns
2. WHEN I edit THEN PATCH works with same validation as create
3. WHEN I delete with confirmation THEN row removed (204)

**Requirement IDs**: M7-04, M7-05, M7-06

---

### P1: Indexing configuration ⭐ MVP

**Acceptance Criteria** (FR-BRFI-002):

1. CDI Percentage, IPCA + Spread, SELIC, Pre-Fixed all supported on form
2. API rejects invalid indexing parameter combinations

**Requirement IDs**: M7-07, M7-08

---

### P1: Account multi-type integration ⭐ MVP

**Acceptance Criteria** (FR-BRFI-003):

1. Account with bonds can also have BRFI holdings (same account_id)
2. Account detail / holdings counts reflect both types where applicable

**Requirement IDs**: M7-09, M7-10

---

### P2: Navigation by holding type ⭐ MVP

**Acceptance Criteria** (FR-BRFI-004):

1. TopNav **Brazilian Fixed Income** links to BRFI list (replaces M5 placeholder)
2. User can filter or navigate by holding type without redesign

**Requirement IDs**: M7-11, M7-12

---

### P2: Portfolio summary includes BRFI

**User Story**: Home dashboard reflects total invested across bonds and BRFI in display currency.

**Acceptance Criteria**:

1. WHEN `GET /api/portfolio/summary?displayCurrency=...` THEN totals include BRFI invested amounts converted per M6 rules
2. WHEN account filter applied THEN BRFI scoped correctly

**Requirement IDs**: M7-13, M7-14

---

### P3: v2.0.0 release ⭐ Ship

**Acceptance Criteria**:

1. M5 + M6 + M7 success criteria met
2. Git tag **`v2.0.0`** via release script
3. ROADMAP updated; active specs moved to `completed/`
4. PROJECT.md scope reflects v2 capabilities

**Requirement IDs**: M7-15

---

## Success Criteria

M7 (and v2) complete when:

1. Full BRFI CRUD API + UI
2. Nav, account integration, portfolio summary updated
3. `npm run lint && npm run test` passes
4. **v2.0.0** tagged and released
5. Feature specs archived under `.specs/features/completed/`

---

## Requirement Traceability

| ID | FR | Summary |
| --- | --- | --- |
| M7-01 | BRFI-001 | Create BRFI holding |
| M7-02 | BRFI-001 | Form fields |
| M7-03 | BRFI-001 | Date validation |
| M7-04 | BRFI-001 | List holdings |
| M7-05 | BRFI-001 | Edit holding |
| M7-06 | BRFI-001 | Delete holding |
| M7-07 | BRFI-002 | Indexing types on form |
| M7-08 | BRFI-002 | API indexing validation |
| M7-09 | BRFI-003 | Multi-type accounts |
| M7-10 | BRFI-003 | Account views |
| M7-11 | BRFI-004 | Nav by holding type |
| M7-12 | BRFI-004 | Filter by type |
| M7-13 | — | Portfolio BRFI totals |
| M7-14 | — | Display currency on totals |
| M7-15 | — | v2.0.0 release |
