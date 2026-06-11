# M10 — Navigation & Tools Shell Specification

**Milestone:** M10  
**Target version:** v1.2.0  
**Status:** Specified — pending design/tasks approval  
**Depends on:** v1.1.0 (M5–M9)  
**Decisions:** AD-011 (per-milestone release), AD-012 (planning)

---

## Problem Statement

Navigation labels do not match how the product is organized: **Reference** groups catalog pages but the name is unclear; **Settings** holds backup/restore while future utilities (CSV import, calculators, DB picker) need a shared home. Bulk data entry (currency quotes, coupon/interest payments) closes the form after each save, forcing repeated open/close when entering many rows.

M10 delivers clearer IA, a **Tools** hub for utilities, and optional **Continue creating** on add forms — **web-only**, no API or schema changes.

---

## Goals

- [ ] Users find catalog pages under **Configurations** and utilities under **Tools**
- [ ] Backup/restore lives on Tools (not Settings)
- [ ] Users can record multiple quotes or payments in one session without reopening the form
- [ ] Ship as **v1.2.0** with zero API/domain changes

---

## Out of Scope

| Feature | Reason |
| --- | --- |
| New tools (DB picker, CSV import, calculators) | M12–M16 |
| BRFI coupon calculation changes | M11 |
| New ISO currency catalog CRUD | Not in roadmap; quotes only |
| API or SQLite migration changes | M10 is UI-only |
| Persisting “Continue creating” preference | Checkbox resets each open (default off) |

---

## Baseline (current codebase)

| Area | Today | M10 change |
| --- | --- | --- |
| TopNav submenu label | **Reference** | **Configurations** |
| Reference submenu items | Market Indicators, Currencies, Accounts | Currencies, Currency Quotes, Market Indicators |
| Accounts nav | Under Reference submenu | Top-level link to `/accounts` |
| Settings nav | `/settings` — system info + backup/restore | Removed; redirect to Tools |
| Currency quote add | Inline add panel on `/currencies/quotes`; closes on success | Optional continue creating |
| Bond coupon add | `FormDialog` on holding detail; closes on success | Optional continue creating |
| BRFI interest add | `FormDialog` on BRFI detail; closes on success | Optional continue creating |

---

## User Stories

### P1: Navigation rename ⭐ MVP

**User Story**: As a portfolio owner, I want clearer nav labels so I can find catalog data and utilities without guessing.

**Why P1**: Blocks Tools hub and sets IA for M13–M16.

**Acceptance Criteria**:

1. WHEN user views TopNav THEN system SHALL show **Configurations** (not Reference) as the catalog submenu trigger
2. WHEN user opens Configurations submenu THEN system SHALL list **Currencies** (`/currencies`), **Currency Quotes** (`/currencies/quotes`), and **Market Indicators** (`/market-indicators`) in that order
3. WHEN user views TopNav THEN system SHALL show a top-level **Accounts** link to `/accounts`
4. WHEN user views TopNav THEN system SHALL show **Tools** linking to `/tools` (not Settings)
5. WHEN user navigates to `/settings` THEN system SHALL redirect to `/tools` (or `/tools/backup-restore` if tool sub-routes exist)
6. WHEN user is on a Configurations or Tools route THEN the corresponding nav item SHALL show active state

**Independent Test**: Load app → Configurations submenu shows three catalog links; Accounts and Tools are top-level; `/settings` redirects to Tools.

---

### P1: Tools hub with Backup / Restore ⭐ MVP

**User Story**: As a user, I want a Tools page listing utilities so backup/restore and future tools have one entry point.

**Why P1**: Required shell for M12–M16; moves backup off mislabeled Settings.

**Acceptance Criteria**:

1. WHEN user opens `/tools` THEN system SHALL show a card grid patterned after the Accounts page (`cb-accounts-grid` / feature cards)
2. WHEN Tools page loads THEN system SHALL show at least one card: **Backup / Restore** with a short description (e.g. download SQLite backup or restore from file)
3. WHEN user clicks the Backup / Restore card THEN system SHALL navigate to a dedicated tool view (e.g. `/tools/backup-restore`) containing the full content currently on Settings: system information (version, database path, last backup) and backup download + restore actions
4. WHEN user completes backup download or restore on the tool view THEN behavior SHALL match current Settings page (same API calls, confirm dialog on restore, redirect home after successful restore)
5. WHEN Tools hub renders THEN page header title SHALL be **Tools** with a subtitle describing utilities/maintenance

**Independent Test**: Open Tools → see card → open Backup / Restore → download backup and view system info without visiting `/settings`.

---

### P2: Continue creating — currency quotes

**User Story**: As a user entering many FX quotes, I want the add form to stay open after each save so I can enter the next row faster.

**Why P2**: High-value bulk-entry UX; UI-only.

**Acceptance Criteria**:

1. WHEN user opens add mode on Currency Quotes page THEN system SHALL show a checkbox **Continue creating** (unchecked by default)
2. WHEN user submits a new quote successfully AND **Continue creating** is unchecked THEN system SHALL close add mode and refresh the quote list (current behavior)
3. WHEN user submits a new quote successfully AND **Continue creating** is checked THEN system SHALL remain in add mode, refresh the quote list, and clear **Quote date** and **Rate** fields only — **Target currency** and **Rate direction** SHALL be preserved
4. WHEN user submits while **Continue creating** is checked THEN checkbox state SHALL remain checked
5. WHEN user edits an existing quote THEN **Continue creating** SHALL NOT appear (edit flow unchanged)
6. WHEN create request fails THEN system SHALL keep add mode open and SHALL NOT clear fields

**Independent Test**: Record two quotes with continue creating on — second form retains currency/direction, empty date/rate.

---

### P2: Continue creating — bond coupon payments

**User Story**: As a user recording multiple coupon payments for one bond, I want the payment dialog to stay open after each save.

**Acceptance Criteria**:

1. WHEN user opens add payment dialog on a bond holding THEN system SHALL show **Continue creating** (unchecked by default)
2. WHEN user saves a new payment successfully AND checkbox unchecked THEN system SHALL close dialog and refresh list (current behavior)
3. WHEN user saves a new payment successfully AND checkbox checked THEN system SHALL keep dialog open, refresh list, and clear **Payment date** and **Amount** fields
4. WHEN user edits a payment THEN **Continue creating** SHALL NOT appear
5. WHEN save fails THEN dialog SHALL stay open with entered values

**Independent Test**: Record two coupon payments on one bond with continue creating enabled.

---

### P2: Continue creating — BRFI interest payments

**User Story**: As a user recording multiple interest payments for one BRFI holding, I want the same continue-creating behavior as bond coupons.

**Acceptance Criteria**:

1. WHEN user opens add interest payment dialog on a BRFI holding THEN system SHALL show **Continue creating** (unchecked by default)
2. WHEN user saves successfully AND checkbox unchecked THEN system SHALL close dialog and refresh (current behavior)
3. WHEN user saves successfully AND checkbox checked THEN system SHALL keep dialog open, refresh list, and clear date/amount fields
4. WHEN user edits a payment THEN **Continue creating** SHALL NOT appear
5. WHEN save fails THEN dialog SHALL stay open with entered values

**Independent Test**: Record two interest payments on one BRFI holding with continue creating enabled.

---

## Edge Cases

- WHEN user bookmarks `/settings` THEN redirect SHALL land on Tools backup view or hub without error
- WHEN Tools hub has only one card THEN grid layout SHALL still render correctly (single card, responsive)
- WHEN user toggles **Continue creating** mid-session THEN next successful create SHALL follow current checkbox state
- WHEN user cancels add mode/dialog THEN **Continue creating** SHALL reset to unchecked on next open
- WHEN mobile nav menu opens Configurations or Tools THEN submenu behavior SHALL match existing TopNav patterns (click-toggle, close on navigate)

---

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| M10-NFR-001 | No new API routes, no changes to request/response bodies |
| M10-NFR-002 | No SQLite migrations |
| M10-NFR-003 | Existing Settings and backup integration tests updated to target Tools routes |
| M10-NFR-004 | Follow `DESIGN.md` tokens and Accounts card grid patterns |
| M10-NFR-005 | API-first unchanged — no business logic added to web (AD-010) |

---

## Requirement Traceability

| ID | Story | Summary |
| --- | --- | --- |
| M10-001 | P1 Nav | Reference → Configurations label |
| M10-002 | P1 Nav | Configurations submenu: Currencies, Currency Quotes, Market Indicators |
| M10-003 | P1 Nav | Accounts top-level link |
| M10-004 | P1 Nav | Settings → Tools; `/settings` redirect |
| M10-005 | P1 Tools | Tools hub card grid at `/tools` |
| M10-006 | P1 Tools | Backup / Restore card + dedicated view |
| M10-007 | P1 Tools | Backup/restore parity with current Settings |
| M10-008 | P2 Quotes | Continue creating on currency quote add |
| M10-009 | P2 Bond | Continue creating on coupon payment add |
| M10-010 | P2 BRFI | Continue creating on interest payment add |

---

## Verification (UAT checklist)

- [ ] Configurations submenu: three catalog links work; Accounts top-level works
- [ ] Tools hub shows Backup / Restore card; tool view matches old Settings behavior
- [ ] `/settings` redirects appropriately
- [ ] Currency quotes: continue creating preserves currency/direction, clears date/rate
- [ ] Bond + BRFI: continue creating clears date/amount, keeps dialog open
- [ ] Edit flows unchanged; failed saves do not clear forms
- [ ] `npm run test` and `npm run check:docs` pass

---

## Docs to update (implementation phase)

- `docs/FRONTEND.md` — routes, TopNav (Configurations, Tools, Accounts)
- `.specs/project/STATE.md` — mark M10 complete on ship
- `.specs/codebase/STRUCTURE.md` — new pages under `packages/web/src/pages/` if applicable
