# Proposal: Stock & Crypto Holdings

**Status:** Draft for approval (updated 2026-06-07)  
**Author:** Planning note — not a milestone spec yet  
**Context:** v1.1.0 shipped (M1–M9). Roadmap M10–M16 through v1.7.0; then M17–M19 (crypto, stock, market price); M12 DB picker last (v1.11.0).

---

## Why these asset classes now

You already hold stocks and crypto. The product today tracks **bonds** and **Brazilian fixed income** only. The M5 holdings framework was built for this expansion: each asset class gets its own table, API routes, and web pages, linked by `holding_types` and included in dashboard aggregation.

This proposal follows established patterns (M7 BRFI as the template) and **API-first** rules (AD-010): domain + API own valuation, forecasts, average cost, yield, and transaction math; web renders results.

---

## Fit with current architecture

| Existing piece | Reuse for stocks/crypto |
| --- | --- |
| `holding_types` seed + `GET /api/holding-types` | Add `crypto` and `stock` rows via migration |
| Per-type tables (`bond_holdings`, `br_fi_holdings`) | New `crypto_holdings`, `stock_holdings` + asset catalogs |
| Account + `account_currencies` | Holdings inherit allowed account currency at create (same as BRFI) |
| M6 FX + purchase-date quotes | Cost basis and display currency conversion on list/detail |
| M9 dashboard | Extend allocation, totals, upcoming events (dividend **forecast** for stocks) |
| Manual data entry (AD-005) | User-entered positions, transactions, and dividend payments |

**Package rename (start of implementation):** Rename `bonds-domain` → **`investment-domain`** as the **first task** when crypto/stock work begins (package.json, imports, docs).

---

## Shared design principles (both types)

1. **Manual entry** — positions, buy/sell transactions, and cash receipts entered by the user. No broker/exchange sync.
2. **Asset catalogs** — stocks and crypto each have a **register** under Configurations (like currencies / indicators).
3. **Buy and sell transactions** — explicit ledger; holdings reflect **current open quantity** (see [Transactions & average price](#transactions-average-price--closed-positions)).
4. **List page shows average unit price** — API-derived column on stock and crypto list pages (open positions).
5. **Manual market price** — **M19**, after crypto/stock transaction registers (M17/M18), before DB file picker (see [Market price milestone](#m19--stock--crypto-market-price-manual-unit-quotes)).
6. **Separate milestones** — crypto first (M17), then stock (M18).
7. **Closed positions archived** — not deleted; excluded from default list; future “past portfolio” dashboard can include them.
8. **Additive migrations only** — AD-012 retrocompatibility.

---

## Stock register (`stock_companies`)

Stocks reference a **company register**. The user does not type a ticker on each holding.

### Domain model

| Field | Notes |
| --- | --- |
| `ticker` | e.g. `KO` — unique in catalog |
| `name` | e.g. Coca-Cola Company |
| `sector` | Enum — **US GICS market sectors** (11 values, see below) |
| `country` | **ISO 3166-1 alpha-2 only** — e.g. `US`, `BR`; validated in API |

**Sector enum (GICS — US market):** `energy`, `materials`, `industrials`, `consumer_discretionary`, `consumer_staples`, `health_care`, `financials`, `information_technology`, `communication_services`, `utilities`, `real_estate`. Display labels in UI (e.g. “Consumer Staples”); API stores slug.

### UX & navigation

- **Configurations** menu: **Stock Companies**
- Routes: list, create, edit (under Configurations paths)
- Full CRUD; delete blocked when any holding (open or archived) references the company

### Picking a company on the holding form

**Autocomplete or searchable dropdown** — each option displays:

**`{ticker} - {name}`** — e.g. `KO - Coca-Cola Company`

User selects the company row; holding stores `companyId` only.

### List / detail display

Same label format: **`KO - Coca-Cola Company`**

### API

- `GET/POST /api/stock-companies`, `GET/PATCH/DELETE /api/stock-companies/:id`
- Search/list endpoint supports query for autocomplete (ticker or name prefix)

**Ships with M18 (stock milestone).**

### Seed data (M18 migration)

Ship a SQL seed in the **same migration** that creates `stock_companies` (same pattern as `007_market_indicators.sql`). Reference copy: [seeds/stock-companies.seed.sql](seeds/stock-companies.seed.sql).

Pre-populates **20 US companies** (your watchlist) with ticker, name, GICS sector slug, and `country = US`:

| Ticker | Name | Sector |
| --- | --- | --- |
| ABT | Abbott Laboratories | health_care |
| ABBV | AbbVie | health_care |
| ABM | ABM Industries | industrials |
| OZK | Bank OZK | financials |
| CSCO | Cisco Systems | information_technology |
| KO | The Coca-Cola Company | consumer_staples |
| CMCSA | Comcast | communication_services |
| ES | Eversource Energy | utilities |
| FUL | H.B. Fuller | materials |
| HRL | Hormel Foods | consumer_staples |
| JNJ | Johnson & Johnson | health_care |
| MDLZ | Mondelez International | consumer_staples |
| PNR | Pentair | industrials |
| POR | Portland General Electric | utilities |
| PPG | PPG Industries | materials |
| HTO | H2O America (recent rename) | utilities |
| SBUX | Starbucks | consumer_discretionary |
| TGT | Target | consumer_discretionary |
| UGI | UGI Corporation | utilities |
| UNM | Unum Group | financials |

Uses `INSERT OR IGNORE` (or equivalent) so re-running migrations on existing DBs does not fail. User can still add/edit/delete via Configurations CRUD.

---

## Crypto register (`crypto_assets`)

Mirror of stock companies — holdings reference catalog rows, not free-text symbols.

### Domain model

| Field | Notes |
| --- | --- |
| `code` | e.g. `BTC`, `ETH` — unique (ticker-like) |
| `name` | e.g. Bitcoin, Ethereum |
| `quantityPrecision` | Optional — max decimal places for UI validation (e.g. 8 for BTC, 18 for ETH); avoids float surprises |

**Intentionally omitted from catalog:** `network` and `venue` stay on the **holding** (same asset code can exist on Binance vs Ledger vs Polygon). Optional `notes` on catalog row if you want a short description later.

### UX & navigation

- **Configurations** menu: **Crypto Assets**
- Autocomplete / dropdown on holding form: **`{code} - {name}`** — e.g. `BTC - Bitcoin`
- List/detail: same format

### API

- `GET/POST /api/crypto-assets`, CRUD by id; search for autocomplete

**Ships with M17 (crypto milestone).**

### Seed data (M17 migration)

Ship a SQL seed in the **same migration** that creates `crypto_assets`. Reference copy: [seeds/crypto-assets.seed.sql](seeds/crypto-assets.seed.sql).

Pre-populates **7 assets** with code, name, and `quantity_precision`:

| Code | Name | Precision |
| --- | --- | --- |
| BTC | Bitcoin | 8 |
| ETH | Ethereum | 18 |
| ADA | Cardano | 6 |
| XRP | XRP | 6 |
| USDC | USD Coin | 6 |
| USDT | Tether | 6 |
| BNB | Binance Coin | 8 |

---

## Stock holdings — scope (M18)

### Domain model (`stock_holdings`)

One row per **position** (company + account). May be **open** or **archived** (see transactions section).

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `stock` |
| `companyId` | FK → `stock_companies` (required) |
| `currencyCode` | From account allowed currencies at create |
| `quantity` | Current shares (0 when archived) |
| `costBasisCents` | Total cost of **current open** quantity |
| `dividendForecastFrequency` | `none` \| `monthly` \| `quarterly` \| `semi_annual` \| `annual` |
| `expectedDividendAmountCents` | Gross per payment — drives **dashboard forecast only** (required when frequency ≠ `none`) |
| `archivedAt` | Set when quantity reaches 0 after a sell; cleared on reactivation |
| `notes` | Optional |

**Out of scope at launch:** ISIN required, FIFO/LIFO tax lots, wash sales, options, broker import.

### Dividends

| Concern | Approach |
| --- | --- |
| **Forecast (dashboard / upcoming events)** | API uses `dividendForecastFrequency` + `expectedDividendAmountCents` on the holding only — no inference from past payments |
| **Updating forecast** | User edits holding when expectations change (more or less) |
| **Actual receipts** | **Fully manual** — user adds `stock_dividend_payments` when cash arrives: `stockHoldingId`, `paymentDate`, `amountCents` |
| **Income page** | Recorded payments only (plus other asset income types) |
| **Frequency UI** | None / Monthly / Quarterly / Semester / Annual |

Forecast and payments are **independent**: payments do not auto-update forecast fields.

### Dividend yield (display only — calculated)

Shown on **stock list** (and optionally detail). **Not stored** — API computes per request (AD-010).

```
paymentsPerYear = map(frequency)   // e.g. quarterly → 4
annualDividendCents = expectedDividendAmountCents × paymentsPerYear
positionValueCents = quantity × avgUnitPriceCents
dividendYieldPercent = (annualDividendCents / positionValueCents) × 100
```

- When `dividendForecastFrequency = none` → yield displays `—`
- `avgUnitPriceCents` = `costBasisCents / quantity` (see average price section)
- **M18:** yield denominator = **average unit price**. **M19:** uses **market price** when latest unit quote exists; else average.

### Stock list page columns (open positions)

| Column | Source |
| --- | --- |
| Company | `TICKER - Name` from catalog |
| Account | holding account |
| Quantity | current quantity |
| **Average unit price** | API: `avgUnitPriceCents` |
| **Dividend yield** | API: calculated field |
| Cost basis (total) | `costBasisCents` (+ converted display currency) |

Optional filter: **Show archived** (off by default).

### API surface

- Stock companies CRUD + search
- Stock holdings CRUD; embed `company`, `avgUnitPriceCents`, `dividendYieldPercent`, converted amounts
- Stock transactions (buy/sell)
- Stock dividend payments CRUD

### Web routes

- `/holdings/stocks`, `/holdings/stocks/new`, `/holdings/stocks/:id`
- Company autocomplete on form; dividend forecast fields on holding form/table
- Transactions + manual dividend payment sections on detail

### Dashboard

- Allocation and portfolio value for open stock positions
- **Income forecast** from forecast fields (not from payment history)
- **Upcoming events** from forecast schedule
- Archived positions excluded until future past-dashboard work

---

## Crypto holdings — scope (M17)

### Domain model (`crypto_holdings`)

| Field | Notes |
| --- | --- |
| `accountId` | FK → accounts |
| `holdingTypeId` | → `crypto` |
| `assetId` | FK → `crypto_assets` (required) |
| `currencyCode` | Fiat for cost basis |
| `network` | Optional — e.g. mainnet, polygon |
| `venue` | Optional — Binance, Ledger, … |
| `quantity` | Current amount (high precision) |
| `costBasisCents` | Total cost of current open quantity |
| `archivedAt` | Set when quantity → 0 |
| `notes` | Optional |

### Crypto list page columns (open positions)

| Column | Source |
| --- | --- |
| Asset | `CODE - Name` from catalog |
| Account | holding account |
| Venue / network | optional display |
| Quantity | current |
| **Average unit price** | API: `avgUnitPriceCents` |
| Cost basis (total) | `costBasisCents` (+ converted) |

### Staking rewards

**Out of M17** — defer to a later milestone. M17 ships positions, catalog, buy/sell, dashboard allocation. Manual reward payments can be added when needed.

### API surface

- Crypto assets CRUD + search
- Crypto holdings CRUD; embed `asset`, `avgUnitPriceCents`, converted amounts
- Crypto transactions (buy/sell)

### Web routes

- `/holdings/crypto`, `/holdings/crypto/new`, `/holdings/crypto/:id`
- Asset autocomplete: `BTC - Bitcoin`

---

## Market price vs FX & indicators

**Yes — this is the stock/crypto “quote”** — separate from FX and benchmark indicators.

| Data | What it is | Example in app today |
| --- | --- | --- |
| **Currency quotes** | FX: USD → BRL, EUR, … | `/currencies/quotes` |
| **Market indicators** | Benchmarks: CDI, SELIC, IPCA, IBOV | `/market-indicators` |
| **Market price (unit quote)** | **Price of 1 share or 1 coin** | **M19** — after M17/M18 transactions |

**Market price** = “What is one unit worth on date *D*?” — e.g. KO = $62.50, BTC = $98,000. Fully manual entry (no live feed).

### M17/M18 without market price

- List shows **average buy price** + cost basis (from transactions)
- Dividend **yield** uses average buy price
- Dashboard portfolio total uses **cost basis** for stock/crypto slices

### M19 adds

| Feature | Behaviour |
| --- | --- |
| **Catalog unit quotes** | Dated price per `stock_company` / `crypto_asset` — one KO price applies to all KO holdings (like `currency_quotes`) |
| **List columns** | Latest **market price**, **market value** (qty × price), **unrealized P&L** |
| **Dashboard** | Allocation and totals at **market value** when a quote exists; fallback to cost basis |
| **Dividend yield** | Uses **market price** when latest quote exists; else average buy price |

**Not chosen:** per-holding mark field (duplicated across accounts) — catalog-level quotes only.

---

## M19 — Stock & crypto market price (manual unit quotes)

**Goal:** Manual market prices for registered companies and crypto assets — market-value portfolio and unrealized P&L.  
**Target:** **v1.10.0**  
**Depends on:** M17 (crypto catalog + transactions), M18 (stock catalog + transactions)  
**Ships:** After M18, **before** M12 database file picker

### Data model

| Table | Fields |
| --- | --- |
| `stock_unit_quotes` | `date`, `stockCompanyId`, `unitPriceCents`, `currencyCode` — unique per company + date |
| `crypto_unit_quotes` | `date`, `cryptoAssetId`, `unitPriceCents`, `currencyCode` — unique per asset + date |

Company/asset must exist in catalog. Currency validated against seeded currencies (same as holdings).

### API

- CRUD `/api/stock-unit-quotes` (list supports date range + company filter — mirror currency quotes)
- CRUD `/api/crypto-unit-quotes` (date range + asset filter)
- `GET .../latest` per company/asset (or embed on holdings list responses)
- Holdings list/detail embed when quote exists: `marketUnitPriceCents`, `marketValueCents`, `unrealizedGainLossCents`, `converted*`
- Dashboard uses market value for stock/crypto when latest quote in holding currency (API-first)

### Web — Configurations

- **Stock Market Prices** — CRUD UI (pattern: Currency Quotes)
- **Crypto Market Prices** — CRUD UI
- Optional “continue creating” on add modal (M10 pattern)

### Web — Holdings lists (M17/M18 pages updated)

New/updated columns when M19 ships:

| Column | Source |
| --- | --- |
| Market price | latest `*_unit_quotes` for catalog row |
| Market value | `quantity × market price` |
| Unrealized P&L | `market value − cost basis` |

### Out of scope (M19)

- Live broker/exchange price feeds
- CSV import of prices (can follow via Tools like M13/M14)
- Historical charting

---

## Transactions, average price & closed positions

**Sells are in scope** for both types via `stock_transactions` / `crypto_transactions`.

### Transaction model

| Field | Notes |
| --- | --- |
| `holdingId` | FK → holding |
| `type` | `buy` \| `sell` |
| `transactionDate` | Trade date |
| `quantity` | Shares / coins |
| `totalAmountCents` | Fiat paid (buy) or received (sell) for this line |
| `currencyCode` | Same as holding |

`unitPriceCents` may be derived in API responses as `totalAmountCents / quantity`.

### Weighted average cost (approved method)

Industry default for simple portfolio trackers: **moving weighted average cost**. Alternative methods (FIFO, LIFO, specific lot) are out of scope.

| Event | Quantity | Average unit price |
| --- | --- | --- |
| **Buy** | Increases | Recalculate: `(prior cost basis + buy total) / new quantity` |
| **Sell** | Decreases | **Unchanged** on remaining shares; reduce `costBasisCents` by `soldQty × avgUnitPrice` |
| **Sell to zero** | 0 | **Archive** holding; avg **N/A**; excluded from default list |
| **Buy after archived** | New open cycle | **Reactivate** same holding row (same company/asset + account); **reset** average from this buy |

Your example (totals in fiat for the line):

| Day | Transaction | Qty | Avg unit price |
| --- | --- | --- | --- |
| 1 | BUY 10 for 100 | 10 | **10.00** |
| 2 | BUY 10 for 150 | 20 | **12.50** |
| 3 | SELL 5 for 75 | 15 | **12.50** (unchanged) |
| 4 | SELL 15 for 200 | 0 | **N/A** → archived |
| 10 | BUY 50 for 50 | 50 | **1.00** (new cycle) |

**This is correct** for weighted average cost.

### Closed positions — do they affect average price?

**No.** Archived / zero-quantity positions are **not** included in the open list or in any live average. Each **open cycle** has its own average; when you fully sell and later buy again, average **starts fresh** (day 10 row). Historical transactions remain on the archived holding for a future **past portfolio / history dashboard** — not in current portfolio totals.

### Realized gain/loss on sell

API may return on sell: `realizedGainLossCents = sell proceeds − (soldQty × avgUnitPriceBeforeSell)`.

### UI

- Detail: **Transactions** — Add Buy / Add Sell
- Default list: **open positions only** (`quantity > 0`, not archived)
- Toggle: **Show archived** (optional)

### What sells are not

- Short selling / negative quantity
- Broker auto-reconciliation
- Per-lot FIFO/LIFO

---

## One table vs two?

**Decision (approved):** Separate `stock_holdings` and `crypto_holdings` tables and API routes — same pattern as bonds vs BRFI.

---

## Release order

**Crypto before stock.** **Market price (M19) after both transaction registers.** **DB file picker (M12) last.**

| Order | Milestone | Version | Theme |
| --- | --- | --- | --- |
| 1 | M10 | v1.2.0 | Nav + Tools shell + continue creating |
| 2 | M11 | v1.3.0 | BRFI coupon engine |
| 3 | M13 | v1.4.0 | CSV currency quotes |
| 4 | M14 | v1.5.0 | CSV market indicators |
| 5 | M15 | v1.6.0 | Compound + simple calculators |
| 6 | M16 | v1.7.0 | Million goal calculator |
| 7 | **M17 — Crypto** | v1.8.0 | Crypto assets catalog, holdings, buy/sell transactions, avg price on list |
| 8 | **M18 — Stock** | v1.9.0 | Stock companies catalog, holdings, buy/sell, dividend forecast + manual payments |
| 9 | **M19 — Market price** | v1.10.0 | Manual stock + crypto unit quotes; market value + unrealized P&L |
| 10 | **M12 — DB file picker** | v1.11.0 | Session DB picker |

**First implementation task for M17:** rename `bonds-domain` → `investment-domain`.

---

## Scope boundaries

### Crypto (M17)

- [ ] Crypto assets catalog + Configurations CRUD + **SQL seed** (7 assets — see table above)
- [ ] Holdings with asset autocomplete (`CODE - Name`)
- [ ] Buy/sell transactions; weighted average cost
- [ ] List: **average unit price** column
- [ ] Archive on full exit; reactivate on new buy
- [ ] Dashboard allocation at **cost basis** (open positions)
- [ ] **Exclude:** market price quotes (M19), staking rewards, wallet sync, DeFi, NFTs

### Stock (M18)

- [ ] Stock companies catalog + Configurations CRUD + **SQL seed** (20 companies — see table above)
- [ ] Holdings with company autocomplete (`TICKER - Name`)
- [ ] Buy/sell transactions; weighted average cost
- [ ] List: **average unit price** + **dividend yield** (calculated)
- [ ] Dividend **forecast** fields → dashboard only
- [ ] **Manual** dividend payment records → income page
- [ ] Archive / reactivate same as crypto
- [ ] Dashboard at **cost basis** until M19
- [ ] **Exclude:** broker import, live feeds, tax lots, options

### Market price (M19)

- [ ] `stock_unit_quotes` + `crypto_unit_quotes` CRUD (Configurations)
- [ ] Latest price on holdings lists; market value + unrealized P&L
- [ ] Dashboard at market value when quote exists
- [ ] Dividend yield uses market price when quote exists

### Later

- [ ] Past portfolio dashboard (archived positions + history)
- [ ] Crypto staking reward payments
- [ ] CSV import via Tools

---

## Dependencies

| Dependency | Why |
| --- | --- |
| M5 holding types | Seed + nav |
| M6 / M6.1 FX | Display currency |
| M9 dashboard | Forecast + allocation extensions |
| M10 Configurations | Catalog + market price menu placement |
| M11 BRFI | Not blocking |
| M17 + M18 | M19 requires company/asset catalogs and holdings |

---

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Average cost bugs on partial sell | Domain tests matching table above |
| Crypto precision | `quantityPrecision` on catalog + string/integer math in domain |
| Dividend forecast vs actual confusion | UI labels: “Forecast” vs “Recorded payment” |
| Archived holding reactivation | Explicit `archivedAt` + tests for new cycle avg reset |

---

## Recommendation summary

1. **`investment-domain`** rename at M17 start.
2. **Catalogs** under Configurations: Stock Companies, Crypto Assets — pickers show `CODE/TICKER - Name`.
3. **Weighted average unit price** on list pages; sells do not change avg on remainder; full exit → archive; new buy → fresh avg.
4. **Dividends:** forecast fields for dashboard only; payments fully manual; **yield calculated** on stock list.
5. **M17 crypto** → **M18 stock** → **M19 market price** → **M12 DB picker**.
6. Staking rewards and past dashboard → later milestones.

---

## Approval checklist

- [x] Separate crypto + stock milestones; crypto first
- [x] DB file picker last (after M19 market price)
- [x] Stock + crypto asset registers with autocomplete labels
- [x] Dividend forecast on holding; manual payments only
- [x] Dividend yield calculated on stock list
- [x] Average unit price on stock and crypto lists
- [x] Weighted average cost method (example table approved)
- [x] Closed positions → archive; future past dashboard
- [x] Staking rewards deferred past M17
- [x] Market price as M19 (after M17/M18 transactions, before DB picker)
- [x] Sector: US GICS enum (11 sectors)
- [x] Country: ISO 3166-1 alpha-2 only
