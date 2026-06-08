# Market One — Portal

This repo contains two complementary products on one stack (Node/Express + React/Vite + Claude):

1. **Prospecting Platform** *(default app)* — a purpose-built "Apollo + HubSpot + Public-Company Intelligence" system for agencies, IR firms, and capital-markets advisors selling to publicly traded companies. Company database, contact enrichment, news/trigger monitoring, prospecting workflow, email sequencing, CRM, a smart opportunity-scoring engine, AI research + outreach, and a dashboard.
2. **Content Intelligence Portal** — a content-intelligence newsroom that pulls **real, sourced** financial news, runs AI analysis, and generates on-brand copy + branded graphics. (Still served by the API; the previous UI lives in git history.)

Built to run locally and to be extended inside Claude Code.

---

## Prospecting Platform

The default UI (`client/src/App.jsx`) is the prospecting platform. It runs on an **in-memory store** (`server/store.js`) seeded with illustrative public companies, contacts, news triggers, sequences, and CRM activity — so every module is usable on first run. Swap the store for Postgres later without changing the routes.

**Modules (all live at MVP depth):**

| # | Module | Where |
| --- | --- | --- |
| 1 | Company database + CSV bulk import & dedupe | Companies tab |
| 2 | Contact enrichment (AI-inferred execs) + email verification | Company → Contacts |
| 3 | News & trigger monitoring (financings, mgmt changes, M&A, listings…) | News & Triggers tab |
| 4 | Prospecting workflow (11-stage Kanban + tags) | Prospects tab |
| 5 | Email sequencing (multi-step, personalization variables, preview) | Sequences tab |
| 6 | Gmail integration (status + simulated send → logged to CRM) | Settings / Outreach |
| 7 | CRM (activities, tasks, chronological timeline) | Company → CRM |
| 8 | Smart opportunity engine (Prospect Score 1–100) | Opportunities tab |
| + | AI research agent + AI outreach writer & first-line personalizer | Company → AI Research / Outreach |
| + | Executive dashboard | Dashboard tab |

AI features (research, outreach, contact enrichment, news scan) use Claude and require `ANTHROPIC_API_KEY`. Everything else works without a key.

**Platform API** is mounted at `/api/platform` — e.g. `GET /api/platform/companies`, `GET /api/platform/dashboard`, `GET /api/platform/board`, `POST /api/platform/companies/import`, `POST /api/platform/companies/:id/enrich`, `POST /api/platform/companies/:id/score`, `POST /api/platform/ai/research/:id`, `POST /api/platform/ai/write-email`. See `server/platform.js`.

> **Note on data:** the seeded companies/contacts are illustrative (e.g. `*.example` domains), and AI-enriched contacts are clearly flagged with confidence scores. Wire real providers (SEC EDGAR, SEDAR+, an email-verification API, LinkedIn enrichment, the Gmail API) before using for live outreach.

---

## Content Intelligence Portal

A content-intelligence newsroom for Market One: it pulls **real, properly sourced** financial/business news with **exact article links**, segments it into Market One's content pillars, runs AI analysis, generates on-brand copy and branded graphics, and runs an approval → publish workflow with Slack alerts.

> **Real, linked news is the whole point.** Every story keeps its exact source URL. Nothing is sample data.

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

## Features

- **Live newsroom** with Refresh and Load more — real, de-duplicated, sourced stories segmented by 7 pillars.
- **Date filter** (relative quick-picks + specific date) and natural-language search.
- **Story studio**: AI analysis (summary, why-it-matters, takeaways, sentiment, trend) + the exact source link.
- **Content generation**: LinkedIn / X / Instagram / Newsletter / Blog / Reel scripts — in Market One's voice, with brand + compliance guardrails (no advice, no price targets, no invented figures).
- **Branded graphics**: Superior-serif headline + wordmark; 5 formats (Square, Portrait, Story 9:16, Landscape, Link card); gradient Off/Soft/Bold; photo upload background; toggleable eyebrow / stat block / source; AI refine of the headline; SVG download.
- **Approval workflow** + Push to Publish + Slack alert feed + publishing calendar.

## Key files

```
server/index.js          API: /api/news, /api/analyze, /api/generate, /api/refine, /api/slack
client/src/App.jsx       The portal UI (dashboard, newsroom, studio, calendar, slack)
client/public/fonts/     Drop Superior Title + Franklin Gothic here (brand fonts)
client/public/wordmark.svg   MarketOne reverse wordmark
```

## Notes / next steps for production

- Slack alerts, the calendar and statuses are in-memory in the client today — wire a DB + the real Slack webhook (already supported via `SLACK_WEBHOOK_URL`).
- Branded-graphic download is SVG; add server-side PNG/JPG rendering (e.g. `resvg`/`sharp` or Puppeteer) so fonts are baked in for direct upload.
- Respect each source's licensing/ToS before re-publishing article text or imagery; the portal links to originals and generates original copy.

## Using it in Claude Code

Open this folder in Claude Code, run `/init`, then ask Claude to extend it — e.g. server-side PNG export, a Postgres store, or LinkedIn/X publishing via Ayrshare wired to the Push-to-Publish button.
