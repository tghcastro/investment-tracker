# Frontend guide (agents)

Condensed from [`DESIGN.md`](../DESIGN.md) and shipped UI in `packages/web/`. For full token YAML, open `DESIGN.md`. For historical M1 notes, see `.specs/features/completed/m1-scaffold/web-design.md`.

## Stack

- React 19 + React Router 7 + Vite 7
- Plain CSS with `--cb-*` variables (`src/styles/tokens.css`, `global.css`)
- Fonts: Inter + JetBrains Mono via `@fontsource/*` (substitutes for Coinbase Display/Sans/Mono)

## File map

| Layer | Path |
| --- | --- |
| Routes | `packages/web/src/App.tsx` |
| Tokens | `packages/web/src/styles/tokens.css` |
| Primitives | `packages/web/src/components/ui/` |
| Forms | `packages/web/src/components/forms/` |
| Pages | `packages/web/src/pages/` |
| API hooks | `packages/web/src/hooks/useApi.ts`, `useApiMutation.ts` |

## API-first (do not break)

**Business rules are not implemented in the web package.** Calculations, forecasts, FX conversion, coupon estimates, and portfolio totals come from the API. See [`.specs/codebase/API-FIRST.md`](../.specs/codebase/API-FIRST.md).

| Do in web | Do in API / domain |
| --- | --- |
| Render `convertedFaceValue`, `expectedCouponAmountCents`, etc. from JSON | Compute those fields |
| Pass `?displayCurrency=` and refetch | Apply purchase-date FX |
| Disable submit when API returns `conversionError` | Validate writes, return error codes |
| `parseDollarsToCents` for form POST payloads | Face value business meaning |
| `formatCurrency`, tooltips, skeletons | Schedule generation, dashboard forecasts |

**Home dashboard (M9):** Single `GET /api/dashboard` with URL-persisted filters (`accountId`, `holdingTypeSlug`, `from`, `to`, `limit`) + `displayCurrency`. Render `allocationByType`, `projectedIncomeByYear`, `upcomingEvents`, etc. from JSON — no local forecast math.

**Coupon estimate:** `expectedCouponAmountCents` on holding JSON from API — `CouponPaymentsSection` renders it; do not recompute.

**FX preview (M6.1):** `HoldingForm` debounces `GET /api/fx/convert` for read-only USD equivalent; submit disabled when `conversionError`. **Holdings table:** primary line = `convertedFaceValue` + `convertedCurrency`; secondary = native `faceValue` + `currencyCode`.

## UX principles (do not break)

1. **Single accent** — `#0052ff` (`--cb-primary`) for primary CTAs and active nav only.
2. **Display weight 400** — page titles use display scale at 400, not 700.
3. **Pill buttons, xl card radius** — match `Button` variants in `components/ui/`.
4. **Numbers in mono** — face value, rates, amounts use `.cb-number-display` / JetBrains Mono.
5. **Semantic green/red as text only** — not filled button or row backgrounds.
6. **Depth via borders** — `hairline` borders; minimal shadow (see DESIGN.md).
7. **Loading** — skeleton blocks on `--cb-surface-strong`, avoid heavy spinners.

## App shell

- `TopNav` 64px, canvas background, hairline bottom border; **Holdings** hover submenu from `GET /api/holding-types` (Bond → `/holdings`; Brazilian Fixed Income → `/holdings/brazilian-fixed-income`); **Configurations** submenu groups Currencies, Currency Quotes, and Market Indicators; **Accounts** and **Tools** are top-level links (click-toggle on mobile only; closes on pointer leave / route change).
- Main: `.cb-app__main`, max-width ~1200px, padding 32px / 24px.
- Routes: `/`, `/holdings`, `/holdings/new`, `/holdings/:id`, `/holdings/brazilian-fixed-income`, `/holdings/brazilian-fixed-income/new`, `/holdings/brazilian-fixed-income/:id`, `/accounts`, `/accounts/new`, `/accounts/:id`, `/income`, `/currencies`, `/currencies/quotes`, `/market-indicators`, `/market-indicators/:id`, `/tools`, `/tools/backup-restore` (`/settings` redirects to backup/restore).
- **Income (`/income`):** `GET /api/portfolio/income-summary` with `displayCurrency` — recorded bond coupon + BRFI interest payments converted at payment-date FX; `CurrencySelector` in filter bar; links use `holdingTypeSlug` → bond `/holdings/:id`, BRFI `/holdings/brazilian-fixed-income/:id` (`holdingDetailPath`).
- **Display currency:** `DisplayCurrencyProvider` loads `GET /api/currencies/available`; preference in `localStorage` key `displayCurrency`. Home dashboard passes `displayCurrency` via `buildDashboardUrl` (`utils/dashboardUrl.ts`); Holdings lists use `appendDisplayCurrencyParam`. `buildDashboardUrl` defaults `from`/`to` when omitted (Accounts page uses `defaultDashboardDateRange()`).
- **Home (`/`):** Portfolio dashboard — summary cards, allocation tables, yearly income/principal forecasts, upcoming events; filter bar (account, holding type, date range) synced to URL search params; scroll-limited tables except allocation-by-type.
- **Accounts (`/accounts`):** Card grid with holding count + converted total from `GET /api/dashboard` (`allocationByAccount`); native-currency breakdown in value tooltip.
- **Currencies (`/currencies`):** Catalog table with separate **Latest (USD)** and **Date** columns (right-aligned); latest rate from `GET /api/currency-quotes`.

## Components to reuse

| Component | Use |
| --- | --- |
| `Button` | `primary`, `secondary`, `tertiary`, `disabled` |
| `TopNav` | Global nav; Holdings + Configurations submenus; Accounts + Tools top-level |
| `BrFiInterestPaymentsSection` | BRFI edit page — interest payments CRUD (mirror `CouponPaymentsSection`) |
| `PageHeader` | Title + subtitle + optional action |
| `EmptyState` | Zero-data lists |
| `ErrorBanner` | Fetch/validation errors (text on soft surface) |
| `TextInput` / `FormField` / `Select` | All CRUD forms |
| `HoldingsTable`, `BrFiHoldingsTable`, `CouponPaymentsTable` | Data tables |
| `BrFiForm`, `IndexingFields` | BRFI create/edit (product + indexing params; indicator picker via `GET /api/market-indicators?category=`) |
| `MarketIndicators`, `MarketIndicatorDetail` | Indicator list + dated values CRUD; **Record value** opens `FormDialog` (mirror CurrencyQuotes) |
| `CurrencyQuotes` | Quote list + filters; **Record quote** opens `FormDialog`; optional **Continue creating** on add |
| `CurrencySelector` | Display-currency dropdown (Home, Holdings toolbar) |
| `Tools` | Utilities hub card grid at `/tools` |
| `BackupRestore` | System info + backup download / restore at `/tools/backup-restore` |
| `ContinueCreatingCheckbox` | Bulk-entry add forms (quotes, coupon/interest payments) |

## Forms

- Labels above fields; errors below in `semantic-down` color (text only).
- Use domain-aligned names: `faceValue`, `couponRate`, `couponFrequency`, `maturityDate`, `currencyCode`, `currencyCodes`.
- **AccountForm:** multi-select checkboxes for allowed account currencies (`GET /api/currencies`).
- **HoldingForm:** currency `<Select>` limited to selected account’s `currencyCodes`.
- **BrFiForm:** product type, indexing type + conditional params (`IndexingFields`); when indexing requires a benchmark, fetch `GET /api/market-indicators?category=...` and pass `marketIndicatorId` in POST/PATCH; default selection from API list (slug match, not hardcoded map); `investedAmount` in cents via `parseDollarsToCents`; currency from account allowed set; optional `?accountId=` filter on list.
- On submit failure, call `focusFirstFieldError` (`utils/focusFirstFieldError.ts`).
- `couponRate` in API is **percent** (0–100) in JSON.
- **Continue creating:** optional checkbox on add flows (Currency Quotes, bond coupon payments, BRFI interest payments). When checked, successful create keeps the form open and clears date/amount (quotes: date/rate only; preserves currency + rate direction). Resets to unchecked on cancel or next open.

## CSS conventions

- Prefix custom properties with `--cb-`.
- Prefer existing tokens over hard-coded hex.
- Co-locate `Component.css` with `Component.tsx`.
- Class prefix `cb-` for layout blocks (e.g. `cb-app`, `cb-holdings-table`).

## Data fetching

```ts
// GET
const { data, loading, error } = useApi<ResponseType>('/api/...');

// Mutations
useApiMutation({ method: 'POST', url: '/api/...', body });
```

Base URL: `VITE_API_URL` at build time; empty in dev when nginx or proxy serves `/api`.

## Responsive

- Below 768px: TopNav collapses to hamburger; tables may scroll horizontally or stack per page CSS.
- Test layout at mobile width when touching `Holdings` or `Income` tables.

## Do not

- Add Tailwind/MUI without AD in `STATE.md`.
- Introduce a second accent color or heavy box shadows on data tables.
- Fetch SQLite or bypass API from React.
