# Proposal: Stock & Crypto Holdings

**Status:** Draft for approval (2026-06-07)  
**Author:** Planning note — not a milestone spec yet  
**Context:** v1.1.0 shipped (M1–M9). Roadmap M10–M16 planned through v1.8.0. This document suggests how **stocks** and **crypto** could fit the existing architecture after (or alongside) that queue.

---

## Why these asset classes now

You already hold stocks and crypto. The product today tracks **bonds** and **Brazilian fixed income** only. The M5 holdings framework was built exactly for this expansion: each asset class gets its own table, API routes, and web pages, linked by `holding_types` and included in dashboard aggregation.

This proposal follows established patterns (M7 BRFI as the template) and **API-first** rules (AD-010): domain + API own valuation and income logic; web renders results.

---

## Fit with current architecture

| Existing piece | Reuse for stocks/crypto |
| --- | --- |
| `holding_types` seed + `GET /api/holding-types` | Add `stock` and `crypto` rows via migration |
| Per-type tables (`bond_holdings`, `br_fi_holdings`) | New `stock_holdings`, `crypto_holdings` (or discuss unified `equity_holdings` — see below) |
| Account + `account_currencies` | Holdings inherit allowed account currency at create (same as BRFI) |
| M6 FX + purchase-date quotes | Cost basis and display currency conversion on list/detail |
| M9 dashboard | Extend allocation, totals, upcoming events (dividends, not coupons) |
| Manual data entry (AD-005) | v1 of each type = user-entered positions; no broker/exchange sync |

**Recommended package naming (later):** Keep `bonds-domain` for now (same as M7); rename to `investment-domain` only if the module grows unwieldy — not required for first ship.

---

## Shared design principles (both types)

1. **Manual positions first** — ticker/symbol, quantity, purchase date, cost basis (or avg buy price). No live market feeds in MVP.
2. **Optional manual mark price** — user can set/update “current price” for unrealized P&L display. Stored as dated quote on the holding (or child `*_price_marks` table). Dashboard uses latest mark when present; otherwise shows cost basis only.
3. **Separate milestones** — Stock and crypto differ enough (dividends vs staking, fractional qty, networks) that **two milestones** (M17 Stock, M18 Crypto) are cleaner than one combined release — unless you want a thin “positions only” MVP for both in one version.
4. **Dashboard inclusion** — Both types count toward portfolio total and allocation-by-type once CRUD exists.
5. **Additive migrations only** — Same retrocompatibility rule as M10–M16 (AD-012).

---

## Stock holdings — suggested scope

### Problem

Equity positions need symbol identity, share quantity, and cost basis — not bond face value/coupon fields or BRFI indexing.

### Suggested domain model (`stock_holdings`)

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `stock` |
| `currencyCode` | From account allowed currencies at create |
| `symbol` | e.g. `AAPL`, `PETR4`, `ASML` — validate format loosely, unique per account optional |
| `exchange` | Optional (NYSE, B3, etc.) — disambiguates duplicate tickers |
| `name` | Optional display name |
| `quantity` | Decimal shares (support fractions if you use fractional brokers) |
| `purchaseDate` | Required |
| `costBasisCents` | Total amount paid (or store `avgPriceCents` + derive — pick one in spec) |
| `notes` | Optional |

**Not in MVP:** ISIN as required field, tax lots, wash sales, options, DRIP automation.

### Cash flows — stock dividends (phase 2 of stock milestone or M17b)

Mirror `coupon_payments` / `br_fi_interest_payments`:

| Table | `stock_dividend_payments` |
| --- | --- |
| Fields | `stockHoldingId`, `paymentDate`, `amountCents`, optional `type` (`cash` / `reinvested`) |
| Income page | New section or filter alongside bond coupons / BRFI interest |
| Dashboard | Dividends in yearly income forecast when record exists; optional simple “expected dividend” only if you add yield fields later |

### API surface (pattern)

- `GET/POST /api/stock-holdings`, `GET/PATCH/DELETE /api/stock-holdings/:id`
- `GET/POST /api/stock-dividend-payments` (if dividends in scope)
- List/detail embed `convertedCostBasisCents` + `convertedCurrency` via existing FX helpers
- Optional: `PATCH .../mark-price` or `POST /api/stock-holdings/:id/price-marks` for manual marks

### Web

- Routes: `/holdings/stocks`, `/holdings/stocks/new`, `/holdings/stocks/:id`
- Holdings submenu picks up type from API (M5 pattern)
- Form: symbol, qty, purchase, cost, account; read-only unrealized P&L when mark price set (from API)

### Dashboard extensions

- **Allocation:** `stock` slice in by-type breakdown
- **Portfolio value:** sum of `quantity × latestMarkPrice` if mark exists, else cost basis
- **Income:** recorded dividends by year
- **Upcoming events:** optional ex-dividend dates only if you add dividend *expectations* later (out of MVP)

---

## Crypto holdings — suggested scope

### Problem

Crypto is not quite “stock with a different label”: fractional units, multiple venues, networks, and sometimes staking rewards need a slightly different model.

### Suggested domain model (`crypto_holdings`)

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `crypto` |
| `currencyCode` | Quote currency for cost basis (often USD; BRL if bought on local exchange) |
| `assetSymbol` | e.g. `BTC`, `ETH`, `SOL` — consider small seed list vs free text |
| `network` | Optional — `mainnet`, `polygon`, etc. — helps when same symbol exists on multiple chains |
| `venue` | Optional — exchange or wallet label (`Binance`, `Ledger`, …) |
| `quantity` | High precision decimal (satoshi-scale); domain uses string or integer smallest units |
| `purchaseDate` | Required |
| `costBasisCents` | Total fiat paid |
| `notes` | Optional |

**Not in MVP:** On-chain address tracking, auto wallet sync, DeFi LP positions, NFTs, tax lot per transfer.

### Cash flows — staking / rewards (optional phase)

| Table | `crypto_reward_payments` |
| --- | --- |
| Fields | `cryptoHoldingId`, `paymentDate`, `amountAsset` (quantity), optional `amountFiatCents` at receipt |
| Income | Record-only; no price oracle in MVP |

### API surface

- `GET/POST /api/crypto-holdings`, `GET/PATCH/DELETE /api/crypto-holdings/:id`
- Optional reward payment CRUD
- Manual `markPrice` same pattern as stocks (user enters USD/BRL price per coin)

### Web

- Routes: `/holdings/crypto`, `/holdings/crypto/new`, `/holdings/crypto/:id`
- Quantity input with high precision; show API-computed fiat value when mark set

### Dashboard extensions

- Same as stocks: allocation, total value (marks or cost), recorded rewards in income if implemented

---

## One table vs two?

| Approach | Pros | Cons |
| --- | --- | --- |
| **Separate tables** (`stock_holdings`, `crypto_holdings`) — **recommended** | Matches M7; clear validators; independent evolution | Some duplicated list/FX serialization code (mitigate with shared repo helpers) |
| **Unified `market_holdings`** with `kind` enum | One CRUD path | Becomes awkward (exchange vs network, dividend vs stake); fights type-specific UX |

**Recommendation:** Separate tables and routes, same as bonds vs BRFI.

---

## Suggested milestone placement

Current committed queue: **M10 → M16** (v1.2.0–v1.8.0). Stock/crypto are **not** in that queue yet.

### Option A — After M16 (default recommendation)

| Order | Milestone | Version | Notes |
| --- | --- | --- | --- |
| … | M10–M16 | v1.2.0–v1.8.0 | Already planned |
| 8 | **M17 — Stock holdings** | v1.9.0 | CRUD + dashboard + optional dividends |
| 9 | **M18 — Crypto holdings** | v1.10.0 | CRUD + dashboard + optional rewards |
| 10 | **M19 — Manual price marks (shared)** | v1.11.0 | *Only if* not bundled into M17/M18 |

Keeps Tools/BRFI/import/calculator work uninterrupted; stocks/crypto ship when foundation is stable.

### Option B — Earlier partial ship

If stocks/crypto are higher priority than calculators (M15–M16) or CSV imports (M13–M14), insert **M17 after M11** (BRFI engine) so dashboard math is solid before new types. Trade-off: delays CSV/calculators.

### Option C — Minimal combined MVP

Single **M17 — Equities & crypto (positions only)** with no dividends/rewards/staking — fastest path to see both in allocation chart. Split dividends/crypto rewards into M17b/M18 later.

---

## Suggested MVP boundaries (for your approval)

### Stock MVP (M17)

- [ ] CRUD + list/filter by account
- [ ] Multi-currency cost basis + display conversion
- [ ] Dashboard allocation + portfolio total (cost basis; marks optional)
- [ ] Record stock dividend payments + income view
- [ ] **Exclude:** broker import, live quotes, tax lots, options

### Crypto MVP (M18)

- [ ] CRUD + list/filter by account
- [ ] High-precision quantity
- [ ] Multi-currency cost basis + display conversion
- [ ] Dashboard allocation + portfolio total
- [ ] **Exclude:** wallet sync, chain APIs, DeFi, NFTs, auto FX from crypto exchanges

### Shared optional (could be M17/M18 or later)

- [ ] Manual mark price + unrealized gain/loss on holding detail and dashboard
- [ ] CSV import of positions (Tools card — mirror M13/M14 pattern)
- [ ] “Continue creating” on dividend/reward modals (M10 pattern)

---

## Open questions (need your call)

1. **Priority vs M10–M16** — Finish planned roadmap first (Option A), or bump stocks/crypto ahead of calculators/CSV?
2. **Dividends in M17?** — Record-only payments at launch, or positions-only first?
3. **Crypto rewards** — In M18 MVP or defer?
4. **Mark price** — Required for useful P&L, or acceptable to show cost basis only until a later milestone?
5. **Tickers** — Free text vs validated lists (e.g. seed top symbols, B3 suffix rules)?
6. **Quantity precision** — Stocks: 4 decimal places enough? Crypto: 8–18 decimals?
7. **Single account type** — Can one account hold bonds + BRFI + stocks + crypto (recommended: yes, extend today’s multi-type accounts)?
8. **Domain package rename** — Defer until M19+ or never?

---

## Dependencies on existing work

| Dependency | Why |
| --- | --- |
| M5 holding types | Required — seed + nav |
| M6 / M6.1 FX | Cost basis in display currency |
| M9 dashboard | Allocation and totals — extend `dashboardForecast.ts` |
| M10 Tools shell | Nice for future CSV import; not blocking CRUD |
| M11 BRFI coupon engine | Not blocking stocks/crypto |

---

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Dashboard complexity creep | Add types incrementally; one forecast module per type in domain |
| Crypto precision / float errors | Store smallest-unit integers or decimal strings; never `number` for qty |
| Duplicate ticker symbols | Optional `exchange` / `venue` fields; unique constraint on `(accountId, symbol, exchange)` |
| User expects live prices | Clear product copy: manual marks only until a future “market data” milestone |
| `bonds-domain` name confusion | Document in spec; rename is cosmetic |

---

## Recommendation summary

1. Add **Stock** and **Crypto** as separate holding types using the **M7 BRFI pattern** (own table, own API, own web routes).
2. Ship **after M16** as **M17 (stocks)** and **M18 (crypto)** unless you reprioritize.
3. **MVP = manual positions + dashboard inclusion**; add dividend/reward recording in the same milestone if you want income view parity with bonds.
4. **Defer** broker sync, live feeds, tax lots, and DeFi to Future Considerations.
5. After you approve this direction, next step is a full **M17 spec** (single milestone) — not more planning files.

---

## Approval checklist

Reply with choices (or edit this file):

- [ ] Agree separate M17 Stock + M18 Crypto milestones
- [ ] Preferred queue position: Option A / B / C
- [ ] Stock dividends in M17 MVP: yes / no / later
- [ ] Crypto staking rewards in M18 MVP: yes / no / later
- [ ] Manual mark price in MVP: yes / no
- [ ] Any must-have fields missing above (e.g. ISIN, CNPJ fund code, specific exchanges)
