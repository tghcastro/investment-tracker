# M1 Web Application Design

**Spec**: `.specs/features/m1-scaffold/spec.md`  
**Technical design**: `.specs/features/m1-scaffold/design.md`  
**Design system source of truth**: [`DESIGN.md`](../../../DESIGN.md) (repo root — Coinbase-inspired institutional UI)  
**Status**: Draft

---

## Design System Reference

All visual decisions trace to **`DESIGN.md`**. That file defines colors, typography, spacing, radii, components, responsive behavior, and do's/don'ts. This document applies those tokens to the Investment Tracker bond portfolio app — it does not redefine the system.

### Implementation strategy

| Layer | Location | Responsibility |
| --- | --- | --- |
| Design tokens | `packages/web/src/styles/tokens.css` | CSS custom properties mapped from `DESIGN.md` YAML keys |
| Global base | `packages/web/src/styles/global.css` | Page canvas, font imports, reset, utility classes |
| Primitives | `packages/web/src/components/ui/` | Button, TopNav, Badge, TextInput (shell only in M1) |
| Patterns | `packages/web/src/components/` | AssetRow, DataTable, PageHeader, EmptyState, ErrorBanner |
| Pages | `packages/web/src/pages/` | Route-level composition |

**Font substitutes** (per `DESIGN.md` — licensed Coinbase fonts are not bundled):

| Design token | Production substitute |
| --- | --- |
| Coinbase Display | Inter 400, letter-spacing -0.015em |
| Coinbase Sans | Inter 400 / 600 / 700 |
| Coinbase Mono | JetBrains Mono 500 |

Load via `@fontsource/inter` and `@fontsource/jetbrains-mono` (or Google Fonts CDN in dev).

### Token mapping (CSS variables)

Prefix all variables with `--cb-` (Coinbase-derived). Example mapping:

```css
/* colors — from DESIGN.md colors: */
--cb-primary: #0052ff;
--cb-primary-active: #003ecc;
--cb-ink: #0a0b0d;
--cb-body: #5b616e;
--cb-muted: #7c828a;
--cb-hairline: #dee1e6;
--cb-canvas: #ffffff;
--cb-surface-soft: #f7f7f7;
--cb-surface-strong: #eef0f3;
--cb-surface-dark: #0a0b0d;
--cb-semantic-up: #05b169;
--cb-semantic-down: #cf202f;

/* spacing — base unit 4px */
--cb-space-xs: 8px;
--cb-space-base: 16px;
--cb-space-lg: 24px;
--cb-space-xl: 32px;
--cb-space-section: 96px;

/* radii */
--cb-radius-md: 12px;
--cb-radius-xl: 24px;
--cb-radius-pill: 100px;
--cb-radius-full: 9999px;
```

Typography uses composite variables, e.g. `--cb-font-display-lg` (family, size, weight, line-height, letter-spacing) mirroring `typography.display-lg` from `DESIGN.md`.

---

## Product UX Principles (from DESIGN.md)

Apply these across every screen:

1. **Single accent** — `#0052ff` only for primary CTAs, active nav, and inline links. No secondary brand colors.
2. **Display weight 400** — page titles use display scale at 400, never 700.
3. **Pill CTAs, card radius, circle icons** — buttons `{rounded.pill}`, cards `{rounded.xl}`, issuer plates `{rounded.full}`.
4. **Numbers in mono** — face value, coupon rate, amounts use `number-display` (JetBrains Mono).
5. **Semantic green/red as text only** — never as button or row backgrounds (bond app has no live price feed in M1; reserve for future yield deltas if needed).
6. **Editorial whitespace** — 96px section rhythm on marketing-style bands; app content uses 32px page padding, 24px between cards.
7. **Depth via layering, not shadows** — hairline borders on cards; at most one soft shadow tier on hover per `DESIGN.md`.

---

## Information Architecture (M1)

```
App (top-nav-light, persistent)
├── /              Home — hero-band-light + portfolio summary cards
├── /holdings      Holdings — asset-row list (all bond positions)
└── /accounts      Accounts — account cards + holding count
```

Future routes (M2+, documented here for consistency):

- `/holdings/new`, `/holdings/:id` — forms using `text-input`
- `/accounts/new`, `/accounts/:id` — account CRUD
- `/income` — coupon payments (M3)

### Navigation (`top-nav-light`)

Per `DESIGN.md` component `top-nav-light`:

| Zone | Content |
| --- | --- |
| Left | Product wordmark **Investment Tracker** (`title-md`, ink) |
| Center | Nav links: Home, Holdings, Accounts (`nav-link`) |
| Right | Primary CTA placeholder **Add holding** (`button-primary`, disabled until M2) |

- Height: 64px  
- Background: `canvas`  
- Border-bottom: 1px `hairline`  
- Active route: `primary` text color + 2px bottom border (app extension; not in marketing spec)

Below 768px: hamburger sheet; **Add holding** stays visible as icon or compact pill.

---

## App Shell Layout

```
┌─────────────────────────────────────────────────────────────┐
│  TopNav (64px, canvas, hairline bottom)                     │
├─────────────────────────────────────────────────────────────┤
│  <main> max-width 1200px, centered, padding 32px 24px       │
│    PageHeader (display-sm or title-lg)                      │
│    Page content (cards / asset rows)                      │
└─────────────────────────────────────────────────────────────┘
```

- **Main background**: `canvas` (#ffffff) for all M1 data pages  
- **Alternating bands** (optional on Home): `surface-soft` (#f7f7f7) for summary strip  
- **No dark hero in M1** — reserve `hero-band-dark` + `product-ui-card-dark` for a future landing/marketing page

---

## Page Designs

### Home (`/`)

**Pattern**: `hero-band-light` (compressed for app — not full 96px marketing hero)

| Element | Design mapping |
| --- | --- |
| Headline | `display-sm` (36px / 400): "Bond portfolio" |
| Subcopy | `body-md`, `body` color: manual tracking, v1 bonds only |
| Summary cards | 2–3 × `feature-card` in a row (desktop 3-up, mobile 1-up) |
| Metrics | Total face value, position count, next maturity — `number-display` |
| CTAs | `button-primary` → /holdings; `button-secondary-light` → /accounts |

**Empty portfolio**: single `feature-card` on `surface-soft` with caption + `button-primary` (disabled until M2 create flow).

### Holdings (`/holdings`)

**Pattern**: `asset-row` list (primary data surface)

| Column | Typography | Notes |
| --- | --- | --- |
| Issuer | `title-md` | Primary label |
| Account | `caption`, `muted` | Broker label |
| Coupon | `number-display` | e.g. 4.25% |
| Maturity | `body-sm` | Formatted date |
| Face value | `number-display`, right-aligned | Currency formatted |

- Row divider: 1px `hairline`  
- Row padding: 16px 0 (`asset-row`)  
- Issuer icon plate: `asset-icon-circular` (32px, `surface-strong`) with initials  
- **Loading**: skeleton rows using `surface-strong` blocks, no spinner chrome  
- **Error**: `ErrorBanner` — `body-md`, `semantic-down` text on `surface-soft` band (text only, not filled button)  
- **Empty**: `EmptyState` — `title-md` + `body-md` + link styled as `button-tertiary-text`

Optional M1 filter (stretch): `search-input-pill` for issuer filter (client-side).

### Accounts (`/accounts`)

**Pattern**: `feature-card` grid (not asset-row — accounts are fewer, richer)

Each card:

| Field | Style |
| --- | --- |
| Name | `title-md` |
| Description | `body-md`, `body` |
| Holding count | `caption-strong` in `badge-pill` |
| Action | `button-tertiary-text` "View holdings" → `/holdings?account={id}` (query filter in M2; M1 may link to holdings only) |

Grid: 2-up tablet, 3-up desktop, 1-up mobile. Card: `rounded.xl`, padding 32px, 1px `hairline` border.

---

## Shared Components

### `Button`

Maps `button-primary`, `button-secondary-light`, `button-tertiary-text`, `button-primary-disabled`.

| Variant | Use in app |
| --- | --- |
| primary | Add holding, Save (M2) |
| secondary | Cancel, secondary navigation |
| tertiary | Inline "View all", text links |
| disabled | M1 placeholder CTAs |

Props: `variant`, `size` (`default` 44px | `large` 56px for hero only), `disabled`, `children`.

### `TopNav`

Implements `top-nav-light`. Props: `activePath`, `onNavigate` (React Router).

### `PageHeader`

| Prop | Maps to |
| --- | --- |
| title | `display-sm` or `title-lg` |
| subtitle | `body-md`, `muted` |
| action | optional `Button` primary |

### `AssetRow` / `HoldingsTable`

Composable row matching `asset-row` + `asset-icon-circular`. Used by Holdings page.

### `EmptyState` / `ErrorBanner`

| Component | Surface | Typography |
| --- | --- | --- |
| EmptyState | `feature-card` on `surface-soft` | title-md + body-md |
| ErrorBanner | full-width band, `surface-soft` | body-md, semantic-down |

### `ErrorBoundary` fallback

Same visual language as `ErrorBanner` — calm copy, `button-secondary-light` "Reload page".

---

## Forms (M2 — specified now, built later)

Per `DESIGN.md` `text-input`:

- Height 48px, `rounded.md`, hairline border  
- Focus: 2px `primary` border  
- Labels: `caption-strong`, `ink`  
- Validation errors: `caption`, `semantic-down` (text only)

Bond holding form fields: issuer, account select, face value, coupon rate/frequency, dates, optional ISIN/CUSIP.

---

## Responsive Behavior

From `DESIGN.md` breakpoints — applied to app shell:

| Breakpoint | Width | App behavior |
| --- | --- | --- |
| Mobile | < 640px | Nav → hamburger; holdings table → stacked card rows |
| Tablet | 640–1024px | 2-up account cards; table hides ISIN column |
| Desktop | ≥ 1024px | Full table columns; 3-up home summary |
| Wide | > 1280px | Content capped at 1200px centered |

**Holdings mobile collapse**: ticker/issuer on top line; coupon + maturity + face value on second line (`body-sm`).

---

## Do's and Don'ts (app-specific)

### Do

- Import tokens from `tokens.css` only — never hardcode hex in components except `tokens.css`.
- Use `button-primary` at most once per viewport (e.g. single "Add holding").
- Format all currency and percentages with `number-display`.
- Keep data pages on white `canvas`; use `surface-soft` only for alternating sections.

### Don't

- Don't use Coinbase Blue for table headers, row backgrounds, or charts.
- Don't bold display headlines.
- Don't add chart libraries with default green/red fills in M1.
- Don't copy cookie-consent or third-party widget colors (per DESIGN.md).
- Don't use `hero-band-dark` on authenticated/data views — breaks calm portfolio tone.

---

## M1 Implementation Checklist

Design system work is part of the web phase (see tasks T22a–T29):

- [ ] `tokens.css` + `global.css` from `DESIGN.md`
- [ ] `TopNav` + `AppShell` layout
- [ ] `Button`, `PageHeader`, `EmptyState`, `ErrorBanner` primitives
- [ ] Home, Holdings, Accounts pages using patterns above
- [ ] Holdings list as `asset-row` / responsive stack
- [ ] Visual review: primary blue appears ≤2 times per screen

---

## Traceability

| UI Requirement | DESIGN.md reference | M1 page/component |
| --- | --- | --- |
| M1-15 | colors, typography | Token CSS |
| M1-16 | top-nav-light | TopNav |
| M1-17 | asset-row, asset-icon-circular | HoldingsTable |
| M1-18 | feature-card | Accounts grid, Home summary |
| M1-19 | button-primary, button-secondary-light | CTAs, empty states |
| M1-20 | hero-band-light (compressed) | Home |
| M1-21 | Responsive breakpoints | All pages |
