# API-first business rules

**Status:** Active (2026-06-05)  
**Decision:** AD-010 in [STATE.md](../project/STATE.md)  
**Applies to:** All milestones — currency (M6.1), coupons, portfolio summaries, forecasts, future BRFI/yield logic

## Principle

**Business rules live in `bonds-domain` and are applied in the API.**  
The web app is a **presentation layer**: it renders API payloads, collects user input, and applies **UI rules** only.

| Layer | Owns | Does not own |
| --- | --- | --- |
| **bonds-domain** | Domain types, Zod validation, pure functions (FX, coupon math, schedules) | HTTP, React, DB |
| **API** | Persistence, orchestration, **computed fields on responses**, dedicated calc/preview endpoints | React, CSS |
| **Web** | Layout, navigation, formatting for display, form UX, refetch/query params | Duplicating domain calculations |

## UI rules (allowed in web)

- Show / hide / enable / disable fields
- Focus order, validation **messages** mapped from API `fields` errors
- Debounced refetch when user changes filters or display currency
- **Input normalization for transport only** (e.g. dollars string → integer cents in POST body) — not domain formulas
- `formatCurrency`, `formatDate`, `formatCouponRate` — display formatting
- `localStorage` for display currency preference (which query param to send)

## Business rules (API / domain only)

Examples — not exhaustive:

| Domain | Rule | API surface |
| --- | --- | --- |
| **FX** | USD base, purchase-date rate, cross via USD | `convertedFaceValue` on holdings; `GET /api/fx/convert` |
| **Coupons** | Expected payment from face × rate × frequency | `expectedCouponAmountCents` on holding (or preview endpoint) |
| **Schedules** | Estimated coupon dates, upcoming list | `GET /api/portfolio/upcoming-coupons` |
| **Portfolio** | Totals, maturity ladder, income aggregates | `GET /api/portfolio/summary`, `income-summary` |
| **Validation** | Maturity after purchase, quote required for non-USD | POST/PATCH 400 + `code` |
| **Shipped (M7)** | BRFI CRUD, indexing validation, portfolio totals | `/api/br-fi-holdings`, summary in `/api/portfolio/summary` |
| **Shipped (M8)** | Market indicators, latest value, BRFI indicator link | `/api/market-indicators`, embedded on BRFI responses |
| **Planned (M9)** | Dashboard allocations, forecasts, upcoming events | `GET /api/dashboard` — web passes filters/displayCurrency only |
| **Future** | YTM, daily BRFI accrual | New `/api/...` routes — not web math |

## Response contract pattern

For any value the UI would otherwise compute:

1. **Prefer embedding** on the resource the UI already loads (`GET /api/holdings`, `GET /api/holdings/:id`).
2. If expensive or form-preview only, add a **dedicated read endpoint** (e.g. `GET /api/fx/convert?...`).
3. List endpoints return **original + derived** fields together (see M6.1 `converted*` pattern).

Optional query params (e.g. `displayCurrency`) change **which derived fields** the API returns — default sensibly (USD for FX).

## Web package boundaries

- **Types:** `packages/web/src/types/api.ts` mirrors API JSON — may use `import type` from `bonds-domain` for shared enums only if needed; prefer duplicating small union types in `api.ts` to avoid pulling domain into runtime.
- **Forbidden:** `import { expectedCouponAmountCents, convertNativeCents, ... } from 'bonds-domain'` in web runtime code.
- **Lint goal (future):** `no-restricted-imports` for `bonds-domain` in `packages/web/src` except `import type`.

## When to add vs extend an API

| Situation | Action |
| --- | --- |
| UI needs a number shown in a table | Add field to list GET response |
| UI needs live preview while typing | `GET /api/.../preview` or `/api/fx/convert` |
| UI needs a chart/forecast series | `GET /api/.../forecast` with dated points |
| Same calc used on write validation | Repo calls same `bonds-domain` fn as read path |

## Known gaps (migrate off web)

Track until closed; do not add new web-side calculations.

| Location | Today | Target |
| --- | --- | --- |
| ~~`CouponPaymentsSection.tsx`~~ | ~~`bonds-domain` estimate~~ | **Done** — `expectedCouponAmountCents` on all holding API responses via `toApiBondHolding` |
| `HoldingForm.tsx` | `couponRate <= 1` heuristic for edit form | API always returns percent in JSON; web displays `holding.couponRate` as-is |
| `HoldingsTable.tsx` (M6) | ~~`displayFaceValue ?? faceValue`~~ | Fixed M6.1 — `convertedFaceValue` from API only |
| `DisplayCurrencyContext` | OK if query-param only | No local conversion |

## Testing

- **Domain:** unit tests for formulas.
- **API:** integration tests for response fields and preview routes (fixture tables).
- **Web:** RTL tests assert **rendered API JSON** and fetch URLs — not recomputed amounts.

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — layer diagram  
- [M6.1 spec](../features/completed/m6.1-multi-currency-follow-ups/spec.md) — FX instance of this pattern  
- [FRONTEND.md](../../docs/FRONTEND.md) — UI agent rules  
