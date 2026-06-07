# Proposal: Stock & Crypto Holdings

**Status:** Draft for approval (updated 2026-06-07)  
**Author:** Planning note — not a milestone spec yet  
**Context:** v1.1.0 shipped (M1–M9). Roadmap M10–M16 planned through v1.7.0 (M12 DB picker deferred). This document defines how **crypto** and **stocks** fit the architecture and the updated release order.

---

## Why these asset classes now

You already hold stocks and crypto. The product today tracks **bonds** and **Brazilian fixed income** only. The M5 holdings framework was built for this expansion: each asset class gets its own table, API routes, and web pages, linked by `holding_types` and included in dashboard aggregation.

This proposal follows established patterns (M7 BRFI as the template) and **API-first** rules (AD-010): domain + API own valuation, forecasts, and transaction math; web renders results.

---

## Fit with current architecture

| Existing piece | Reuse for stocks/crypto |
| --- | --- |
| `holding_types` seed + `GET /api/holding-types` | Add `crypto` and `stock` rows via migration |
| Per-type tables (`bond_holdings`, `br_fi_holdings`) | New `crypto_holdings`, `stock_holdings` (+ company catalog — see below) |
| Account + `account_currencies` | Holdings inherit allowed account currency at create (same as BRFI) |
| M6 FX + purchase-date quotes | Cost basis and display currency conversion on list/detail |
| M9 dashboard | Extend allocation, totals, upcoming events (dividends for stocks) |
| Manual data entry (AD-005) | User-entered positions and transactions; no broker/exchange sync |

**Package rename (start of implementation):** Rename `bonds-domain` → **`investment-domain`** as the **first task** when crypto/stock work begins (package.json, imports, docs). The module already covers BRFI, FX, and dashboard — the old name no longer fits.

---

## Shared design principles (both types)

1. **Manual entry first** — positions and buy/sell events entered by the user. No live market feeds at launch.
2. **Buy and sell transactions** — both asset types support recording **sells** as well as buys (see [Transactions & sells](#transactions--sells-stock-and-crypto)).
3. **Optional manual mark price** — user can set/update “current price” for unrealized P&L. Dashboard uses latest mark when present; otherwise cost basis.
4. **Separate milestones** — Crypto and stock differ enough (dividends vs staking, company catalog, networks) → **two milestones**, crypto first.
5. **Dashboard inclusion** — Both types count toward portfolio total and allocation-by-type.
6. **Additive migrations only** — Same retrocompatibility rule as M10–M16 (AD-012).

---

## Stock companies (catalog)

Stocks reference a **company register**, not a free-text ticker on each holding.

### Domain model (`stock_companies`)

| Field | Notes |
| --- | --- |
| `name` | e.g. Coca-Cola Company |
| `sector` | e.g. Consumer Staples — free text or enum (decide in spec) |
| `ticker` | e.g. `KO` — unique in catalog |
| `country` | e.g. `US`, `BR` — ISO country or display string (decide in spec) |

### UX & navigation

- **Configurations** menu (post-M10 rename from Reference): new item **Stock Companies**
- Routes: `/configurations/stock-companies` (list), `/new`, `/:id` (or equivalent under current Configurations paths)
- Full CRUD: create, edit, delete (delete blocked when holdings reference the company — same pattern as bond payments)

### Holdings display

List and detail show company as:

**`{ticker} - {name}`** — e.g. `KO - Coca-Cola Company`

Ticker comes from the company row; holding links via `companyId` FK.

### API

- `GET/POST /api/stock-companies`, `GET/PATCH/DELETE /api/stock-companies/:id`
- List holdings embed `company: { id, ticker, name, sector, country }`

**Ships with the stock milestone** (not a separate release).

---

## Stock holdings — suggested scope

### Problem

Equity positions need company identity, share quantity, cost basis, dividend forecast settings, and buy/sell history — not bond or BRFI fields.

### Suggested domain model (`stock_holdings`)

One row per **open position** (company + account). Quantity and cost basis maintained from transactions (see below).

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `stock` |
| `companyId` | FK → `stock_companies` (required) |
| `currencyCode` | From account allowed currencies at create |
| `quantity` | Current shares (decimal); updated by buy/sell transactions |
| `costBasisCents` | Total cost of **current** position (API recalculates on sells — e.g. average cost) |
| `dividendForecastFrequency` | `none` \| `monthly` \| `quarterly` \| `semi_annual` \| `annual` |
| `expectedDividendAmountCents` | Per-payment expected amount for dashboard forecast (required when frequency ≠ `none`) |
| `notes` | Optional |

Display label: **`{company.ticker} - {company.name}`** (not stored redundantly on holding).

**Out of scope at launch:** ISIN as required field, multi-lot tax accounting, wash sales, options, DRIP automation, broker import.

### Dividends — shipped with stocks

Dividends are **one milestone with stocks**, not a follow-up.

| Concern | Approach |
| --- | --- |
| **Forecast** | Holding fields `dividendForecastFrequency` + `expectedDividendAmountCents` → API projects payment dates and amounts on dashboard / upcoming events (same API-first pattern as bond coupons) |
| **Frequency UI** | Stock form/table: **None / Monthly / Quarterly / Semester / Annual** |
| **Actual receipts** | When cash hits the account, user records **`stock_dividend_payments`**: `stockHoldingId`, `paymentDate`, `amountCents` |
| **Income page** | Section or filter alongside bond coupons / BRFI interest |

Forecast uses configured frequency + expected amount until real payments exist; recorded payments appear in income history and can inform future forecast tuning (manual edit only — no auto-learning in v1).

### API surface (pattern)

- `GET/POST /api/stock-companies`, CRUD by id
- `GET/POST /api/stock-holdings`, `GET/PATCH/DELETE /api/stock-holdings/:id`
- `GET/POST /api/stock-transactions` (buy/sell — see below)
- `GET/POST /api/stock-dividend-payments`
- List/detail embed `convertedCostBasisCents`, `convertedCurrency`, `company`, unrealized P&L when mark price set
- Optional: price marks endpoint (manual mark price)

### Web

- Routes: `/holdings/stocks`, `/holdings/stocks/new`, `/holdings/stocks/:id`
- Holdings submenu from API (M5 pattern)
- Form: company picker (from catalog), qty/cost via transactions or initial buy, dividend forecast fields, account
- Transaction UI: add **Buy** / **Sell** on holding detail (mirror payment sections on bonds)

### Dashboard extensions

- **Allocation:** `stock` slice in by-type breakdown
- **Portfolio value:** `quantity × latestMarkPrice` if mark exists, else cost basis
- **Income:** forecast dividends from frequency + expected amount; recorded dividends in yearly buckets
- **Upcoming events:** projected dividend dates from forecast rules

---

## Crypto holdings — suggested scope

### Problem

Crypto is not “stock with a different label”: fractional units, venues, networks, and optional staking rewards need a distinct model. **No company catalog** — asset symbol on the holding.

### Suggested domain model (`crypto_holdings`)

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `crypto` |
| `currencyCode` | Fiat used for cost basis (USD, BRL, …) |
| `assetSymbol` | e.g. `BTC`, `ETH`, `SOL` |
| `network` | Optional — `mainnet`, `polygon`, etc. |
| `venue` | Optional — exchange or wallet label |
| `quantity` | Current amount (high precision) |
| `costBasisCents` | Cost of current position (from transactions) |
| `notes` | Optional |

**Out of scope at launch:** On-chain sync, DeFi LP, NFTs, auto exchange rates.

### Cash flows — staking / rewards (optional in crypto milestone)

| Table | `crypto_reward_payments` |
| --- | --- |
| Fields | `cryptoHoldingId`, `paymentDate`, `amountAsset`, optional `amountFiatCents` |
| Income | Record-only; no price oracle |

Defer to spec if rewards ship in same milestone or fast follow.

### API surface

- `GET/POST /api/crypto-holdings`, CRUD by id
- `GET/POST /api/crypto-transactions` (buy/sell)
- Optional reward payment CRUD + manual mark price

### Web

- Routes: `/holdings/crypto`, `/holdings/crypto/new`, `/holdings/crypto/:id`
- Buy / Sell actions on holding detail

### Dashboard extensions

- Allocation, total value (marks or cost), recorded rewards if implemented

---

## Transactions & sells (stock and crypto)

**Yes — sells are in scope.** Both types use an explicit **transaction ledger**, not “delete holding when gone.”

### Model (`stock_transactions` / `crypto_transactions`)

| Field | Notes |
| --- | --- |
| `holdingId` | FK → respective holdings table |
| `type` | `buy` \| `sell` |
| `transactionDate` | Trade date |
| `quantity` | Shares / coins moved |
| `unitPriceCents` or `totalAmountCents` | Fiat consideration (pick one canonical shape in spec) |
| `currencyCode` | Same as holding |

### Behaviour (API / domain)

| Event | Effect |
| --- | --- |
| **Buy** | Increase `holding.quantity`; update `costBasisCents` (weighted average cost recommended) |
| **Sell** | Decrease `holding.quantity`; reduce cost basis proportionally; API may expose **realized gain/loss** on the sell response |
| **Quantity → 0** | Holding remains as **closed** (archived flag) or hidden from default list — prefer **archived** row for history (decide in spec) |
| **Initial create** | First buy can be created with the holding (one transaction) or holding + transaction in one POST |

### UI

- Holding detail: **Transactions** section with Add Buy / Add Sell (like coupon payments on bonds)
- List page: only positions with `quantity > 0` by default; optional “show closed” filter

### What sells are not

- Short selling / negative quantity
- Automatic broker reconciliation
- Per-lot FIFO/LIFO tax lots (future consideration; average cost at launch)

---

## One table vs two?

| Approach | Pros | Cons |
| --- | --- | --- |
| **Separate tables** (`stock_holdings`, `crypto_holdings`) — **approved** | Matches M7; clear validators; independent evolution | Some shared serialization helpers |
| **Unified `market_holdings`** | One CRUD path | Awkward for company FK vs asset symbol, dividends vs staking |

**Decision:** Separate tables and routes, same as bonds vs BRFI.

---

## Release order (updated)

M12 **Database file picker** moves to **after crypto and stock**. **Crypto before stock.**

| Order | Milestone | Version | Theme |
| --- | --- | --- | --- |
| 1 | M10 | v1.2.0 | Nav + Tools shell + continue creating |
| 2 | M11 | v1.3.0 | BRFI coupon engine |
| 3 | M13 | v1.4.0 | CSV currency quotes |
| 4 | M14 | v1.5.0 | CSV market indicators |
| 5 | M15 | v1.6.0 | Compound + simple calculators |
| 6 | M16 | v1.7.0 | Million goal calculator |
| 7 | **M17 — Crypto holdings** | v1.8.0 | CRUD, buy/sell transactions, dashboard, optional rewards |
| 8 | **M18 — Stock holdings** | v1.9.0 | Stock companies catalog, holdings, buy/sell, dividends forecast + payments |
| 9 | **M12 — Database file picker** | v1.10.0 | Session DB picker (was v1.8.0; deferred per this proposal) |

**First implementation task for M17/M18:** rename `bonds-domain` → `investment-domain`.

*Note: ROADMAP.md / STATE.md should be updated when this proposal is approved — not in this PR unless you want doc sync now.*

---

## Scope boundaries (for approval)

### Crypto (M17)

- [ ] CRUD + list/filter by account
- [ ] Buy and sell transactions; open positions only on default list
- [ ] High-precision quantity
- [ ] Multi-currency cost basis + display conversion
- [ ] Dashboard allocation + portfolio total
- [ ] Optional manual mark price
- [ ] **Exclude:** wallet sync, chain APIs, DeFi, NFTs

### Stock (M18)

- [ ] Stock companies CRUD under Configurations
- [ ] Holdings linked to company; display `TICKER - Name`
- [ ] Buy and sell transactions
- [ ] Dividend forecast frequency + expected amount on holding; dashboard/upcoming events
- [ ] Record dividend payments when received; income view
- [ ] Multi-currency + dashboard
- [ ] **Exclude:** broker import, live quotes, tax lots, options

### Shared (M17/M18 or later)

- [ ] Manual mark price + unrealized P&L (if not in M17/M18)
- [ ] CSV import of positions (Tools — mirror M13/M14)
- [ ] “Continue creating” on transaction/dividend modals (M10 pattern)

---

## Open questions

1. **Crypto staking rewards** — Same milestone as M17 crypto, or fast follow?
2. **Mark price** — Required for launch, or cost basis only until a small follow-up?
3. **Sector** — Free text vs fixed enum list?
4. **Country on company** — ISO 3166-1 alpha-2 vs free text?
5. **`expectedDividendAmountCents`** — Confirm per-payment gross amount is the right forecast input (vs yield % on mark price).
6. **Closed positions** — Archive flag + “show closed” vs hard-delete when qty = 0?
7. **ROADMAP renumbering** — Keep milestone ids M17=crypto, M18=stock, M12 last; or renumber M12 → M19 for clarity?

---

## Dependencies on existing work

| Dependency | Why |
| --- | --- |
| M5 holding types | Seed + nav |
| M6 / M6.1 FX | Cost basis in display currency |
| M9 dashboard | Allocation, income, upcoming events |
| M10 Configurations shell | Stock Companies menu placement |
| M11 BRFI coupon engine | Not blocking crypto/stock |

---

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Dashboard complexity | Per-type forecast modules in `investment-domain` |
| Crypto float errors | Smallest-unit integers or decimal strings for quantity |
| Sell + average cost edge cases | Domain tests for partial sells, full exit, buy-after-sell |
| Dividend forecast without live data | User supplies expected amount; frequency drives schedule only |
| Company delete with holdings | Block delete when FK references exist |

---

## Recommendation summary

1. Rename **`bonds-domain` → `investment-domain`** when M17 implementation starts.
2. **M17 Crypto** then **M18 Stock**; **M12 DB picker** last (v1.10.0).
3. **Stock companies** catalog + CRUD under Configurations; holdings show `TICKER - Name`.
4. **Dividends** ship with stocks: forecast frequency + expected amount on holding; record payments when received.
5. **Buy and sell transactions** for both crypto and stock; holdings reflect current open position.
6. Separate tables and routes (bonds vs BRFI pattern).
7. After approval → write **M17 crypto spec** first, then M18 stock spec.

---

## Approval checklist

- [x] Separate crypto + stock milestones
- [x] Crypto before stock; DB file picker after both
- [x] Dividends shipped with stock milestone (forecast + payments)
- [x] Stock companies catalog under Configurations
- [x] Separate tables (bonds vs BRFI pattern)
- [x] Rename domain package at implementation start
- [ ] Crypto staking rewards in M17: yes / no / later
- [ ] Manual mark price in M17/M18: yes / no
- [ ] Closed position behaviour: archive vs delete
- [ ] `expectedDividendAmountCents` as forecast input: confirm or prefer yield %
