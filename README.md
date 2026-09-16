# Market One — Content Intelligence Portal

A full-stack content-intelligence newsroom for Market One: it pulls **real, properly sourced** financial/business news with **exact article links**, segments it into Market One's content pillars, runs AI analysis, generates on-brand copy and branded graphics, and runs an approval → publish workflow with Slack alerts.

Built to run locally and to be extended inside Claude Code.

> **Real, linked news is the whole point.** Every story keeps its exact source URL — shown on the card (“Source ↗”) and in the Studio (Open / Copy). Nothing is sample data.

## How news is sourced

The server picks a strategy automatically:

1. **NewsAPI.org (recommended)** — pulls recent articles restricted to a credible-domain allowlist (BNN Bloomberg, Reuters, Financial Post, CNBC, Bloomberg, Mining.com, Kitco, The Northern Miner, Globe and Mail, Yahoo Finance, MarketBeat, Benzinga, Barron's, WSJ, Investing.com, Stockhouse, Seeking Alpha). Real URLs, then Claude classifies each into a pillar + sentiment + summary + stat using **structured outputs**.
2. **Claude web-search (fallback, no extra key)** — if `NEWS_API_KEY` is absent, the server uses Claude's `web_search` tool to find real, sourced stories with their exact URLs.

The active strategy is shown in the top-right chip and on `/api/health`.

## Prerequisites

- Node.js 18+
- An Anthropic API key — https://console.anthropic.com
- (recommended) a free NewsAPI key — https://newsapi.org

## Setup

```bash
cp .env.example .env        # then edit .env and add your keys
npm install                 # installs root + server + client deps (workspaces)
npm run dev                 # starts API (:3001) and client (:5173)
```

Open http://localhost:5173.

`.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
NEWS_API_KEY=               # optional but recommended for guaranteed sourcing
ANTHROPIC_MODEL=claude-sonnet-4-6
PORT=3001
SLACK_WEBHOOK_URL=          # optional — post approval/publish alerts to Slack
```

## Production build

```bash
npm run build               # builds the client to client/dist
npm start                   # server serves the API + the built client on :3001
```

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Status: model, sourcing mode, key presence |
| `/api/config` | GET | Pillars + sourcing mode for the client |
| `/api/news` | GET | Real, de-duplicated, classified stories (`q`, `from`, `to`, `page`, `pageSize`) |
| `/api/analyze` | POST | Deep editorial analysis for one story (Studio) |
| `/api/generate` | POST | On-brand copy for a format (LinkedIn / X / Instagram / Newsletter / Blog / Reel) |
| `/api/refine` | POST | Refine arbitrary copy (Studio + graphic editor) |
| `/api/slack` | POST | Post an alert to Slack if `SLACK_WEBHOOK_URL` is set |

## Brand editions

The same engine ships two brands, selected by the `BRAND` env var:

- `BRAND=marketone` (default) — Market One, 7 capital-markets content pillars.
- `BRAND=bullionaire` — Bullionaire, a precious-metals edition with a gold theme and 7 bullion pillars (Gold, Silver & PGMs, Miners & Producers, Central Banks & Reserves, Macro & Rates, Physical & Mints, Digital Gold & Crypto).

Set it in `.env` (server) — pillars, per-pillar search queries, allowlist domains, theme colours, and the AI brand voice all switch automatically. In demo mode the client picks the brand from `window.__M1_BRAND__` (set in standalone builds) and themes itself from the server's `/api/config` in live mode.

## Features

- **Issuer intelligence**: tracks, filters and searches listed companies across NASDAQ / OTC / TSXV / CSE, verified against Yahoo Finance and the companies' own sites, scored against Market One's qualification model, exportable to CSV.
- **Live newsroom** with Refresh and Load more — real, de-duplicated, sourced stories segmented by 7 pillars.
- **Date filter** (relative quick-picks + specific date) and natural-language search.
- **Story studio**: AI analysis (summary, why-it-matters, takeaways, sentiment, trend) + the exact source link.
- **Content generation**: LinkedIn / X / Instagram / Newsletter / Blog / Reel scripts — in Market One's voice, with brand + compliance guardrails (no advice, no price targets, no invented figures).
- **Branded graphics**: Superior-serif headline + wordmark; 5 formats (Square, Portrait, Story 9:16, Landscape, Link card); gradient Off/Soft/Bold; photo upload background; toggleable eyebrow / stat block / source; AI refine of the headline; SVG download.
- **Approval workflow** + Push to Publish + Slack alert feed + publishing calendar.

## Key files

```
server/index.js          API: /api/news, /api/analyze, /api/generate, /api/refine, /api/slack
server/issuers/          Issuer pipeline: sources/, score.js, pipeline.js, routes.js, store.js
server/cli/issuers.js    Pipeline CLI (check / universe / enrich / scan / score / export)
server/data/             issuers.seed.json (POC seed) + poc/ source sheets
client/src/App.jsx       The portal UI (dashboard, newsroom, studio, calendar, slack)
client/src/Issuers.jsx   The Issuers tab (filter rail, table, score-breakdown drawer)
client/public/fonts/     Drop Superior Title + Franklin Gothic here (brand fonts)
client/public/wordmark.svg   MarketOne reverse wordmark
```

## Issuer intelligence — tracking, filtering and searching listed companies

The **Issuers** tab is a prospecting engine over the public markets. It ingests the
listed-company universe from the exchanges themselves, verifies each name against
market data and the company's own website, scores it against Market One's
qualification model, and lets you filter, search and export the result.

### Where the data comes from

Every source is public and needs no API key. Each one can be replaced by a local
file, which matters when a corporate network blocks a host or an endpoint moves.

| Layer | Source | Local override |
| --- | --- | --- |
| NASDAQ (+ NYSE / NYSE American) | Nasdaq Trader symbol directory (`nasdaqlisted.txt`, `otherlisted.txt`) | `server/data/universe/nasdaqlisted.txt` |
| OTC | OTC Markets screener API (OTCQX / OTCQB) | `server/data/universe/otc.csv` |
| TSXV (+ TSX) | TMX listed-company directory JSON | `server/data/universe/tsxv.csv` |
| CSE | CSE listings feed | `server/data/universe/cse.csv` |
| Market data | Yahoo Finance `quoteSummary` + `chart` (price, cap, volume, 52w range, revenue, cash, float, next earnings) | — |
| Retail awareness | StockTwits watcher counts | — |
| IR posture | The company's own website and release footers | — |

Test-issues, ETFs, warrants, units and preferreds are filtered out of the
universe — the list is operating companies only.

### Running it

```bash
npm run issuers:check                  # which sources answer from your network
npm run issuers                        # universe -> enrich -> scan -> score
npm run issuers:stats                  # what is currently held
```

Each stage is separately runnable, because a full four-venue universe is tens of
thousands of names and enriching all of them costs hours of deliberately polite
requests:

```bash
npm --workspace server run issuers:universe -- --venues NASDAQ,OTC,TSXV,CSE
npm --workspace server run issuers:enrich   -- --limit 500
npm --workspace server run issuers:scan     -- --limit 100
npm --workspace server run issuers:score
npm --workspace server run issuers:export   -- --min-score 60 --out prospects.csv
```

**Start with `issuers:check`.** It probes every source and prints what actually
answered, so a blocked host is visible immediately rather than showing up as an
empty result later.

### The qualification model

`server/issuers/score.js` is the POC workbook expressed as code. Five tests, each
one a reason an issuer would buy:

| Test | Weight | Signals |
| --- | --- | --- |
| Nobody is trading them | 30 | thin vs peers, liquidity decay, drawdown |
| Watched but not bought | 22 | conviction gap ($ traded per watcher), retail awareness |
| Business quality | 18 | cap in range, revenue or defined asset, can fund a program |
| Something is coming | 18 | capital-needing runway, catalyst window, listing pressure, recent listing |
| Already paying to fix it | 12 | no agency retained, hiring/staffing IR |

Two design decisions are worth knowing about, because both change what you see:

- **Scoring is coverage-aware.** A signal that cannot be evaluated is excluded
  from the numerator *and* the denominator rather than counted as a miss, so a
  half-enriched record is not silently ranked as a bad fit. Below
  `ISSUERS_MIN_COVERAGE` (default 60%) the record is held at `U - unverified`
  instead of being published as a priority target — the cost of a rep calling an
  unqualified name is higher than the cost of enriching it first.
- **Peer medians need a real cross-section.** "Low volume" only means something
  relative to comparable companies, so medians are computed from the tracked
  universe by sector x cap band. But a curated shortlist is by construction all
  illiquid and all watched, and comparing those names against each other cancels
  out the very signal being measured. Below `ISSUERS_MIN_PEER_N` (default 30) the
  model falls back to market-wide baselines instead of the pool's own medians.

Every score is explained: the detail drawer shows each test, each signal, whether
it fired, and the sentence behind it ("29,600 watchers but only $305K/day traded
— $10.3 per watcher vs $802 pool median").

### Seeded from the POC

The portal ships populated. `server/data/issuers.seed.json` is built from the
**Market One x Zevenue POC** workbook (both qualified sheets, committed as CSV
under `server/data/poc/`), so the Issuers tab has real, scored companies before
the first live refresh and the analyst's original notes stay attached to each
record. Rebuild it with:

```bash
node server/cli/seed-from-poc.js
```

It is also the model's regression check: 23 of the 27 hand-qualified names score
B-qualified or better, which is what you want from a model meant to reproduce an
analyst's judgement.

### API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/issuers` | GET | Filter / search / sort / paginate the tracked universe |
| `/api/issuers/facets` | GET | Filter options with counts, for the filter rail |
| `/api/issuers/model` | GET | The scoring model (tests, signals, weights) |
| `/api/issuers/sources` | GET | What is held; `?probe=1` also tests every source |
| `/api/issuers/export.csv` | GET | The current query in the POC workbook's column layout |
| `/api/issuers/:key` | GET | One issuer, full record (key is `EXCHANGE:SYMBOL`) |
| `/api/issuers/refresh` | POST | Run a pipeline stage (`universe`/`enrich`/`scan`/`score`/`all`) |
| `/api/issuers/:key/scan` | POST | Re-verify one company from source, on demand |

Filters: `q`, `exchange`, `sector`, `tier`, `capBand`, `irPosture`, `minScore`,
`maxVolume`, `minCap`, `maxCap`, `minDrawdown`, `minWatchers`, `noAgency`,
`hasContact`, `enriched`, `verified`, `sort`, `page`, `pageSize`.

### Crawling conduct

The website scanner honours `robots.txt`, paces requests per host, caches
aggressively, and reads at most a handful of pages per company. Exchange files
are cached for 12-24 hours. Treat the rate limits as load-bearing: they are what
keeps this sustainable against public endpoints that have no contract with you.

## Notes / next steps for production

- Slack alerts, the calendar and statuses are in-memory in the client today — wire a DB + the real Slack webhook (already supported via `SLACK_WEBHOOK_URL`).
- Branded-graphic download is SVG; add server-side PNG/JPG rendering (e.g. `resvg`/`sharp` or Puppeteer) so fonts are baked in for direct upload.
- Respect each source's licensing/ToS before re-publishing article text or imagery; the portal links to originals and generates original copy.

## Using it in Claude Code

Open this folder in Claude Code, run `/init`, then ask Claude to extend it — e.g. server-side PNG export, a Postgres store, or LinkedIn/X publishing via Ayrshare wired to the Push-to-Publish button.
