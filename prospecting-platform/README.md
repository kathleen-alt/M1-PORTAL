# Market One — Public Company Prospecting & Outreach Platform

A purpose-built **prospecting and outbound sales platform** for agencies and service
providers that target publicly traded companies — investor-relations firms, capital-markets
advisors, and marketing agencies. It combines company discovery, contact enrichment, signal
(news/financing) monitoring, a CRM, a prospect-scoring engine, and AI-personalized email
sequencing into one workflow — a focused **"Apollo + HubSpot + public-company intelligence"**.

> This is a **standalone app**, independent of the Content Intelligence portal in the parent
> repo. It has its own server, client, and dependencies.

It runs out of the box in **Demo mode** (bundled sample companies, signals and sequences — no
API key needed). Add an `ANTHROPIC_API_KEY` and turn Demo off to enable the live AI layer
(contact enrichment, the research agent, and the outreach writer).

## Modules

| Module | What it does |
| --- | --- |
| **Company database** | Profiles (ticker, exchange, market cap, HQ, IR contact, management, financings, news) with search, filters, watchlists, tags, and **CSV bulk import with dedupe** (updates existing records, creates new ones). |
| **Contact enrichment** | Find executives & IR contacts (CEO/CFO/COO/VP Corp Dev/VP IR/IR Manager/Comms/Marketing) with email, LinkedIn, title, location, **email confidence + verification status**. |
| **Signals & triggers** | A feed of financings, management changes, M&A, new listings, drill results, price/volume moves, earnings and IR initiatives. **Flag any signal** to turn a company into a prospect opportunity. |
| **Smart Opportunity Engine** | A deterministic, explainable **prospect score (1–100)** from financing, IR and growth signals — with a per-company breakdown. |
| **Pipeline** | A Kanban board across the prospect statuses (New → Researching → Ready → In Sequence → Meeting → Proposal → Negotiation → Won), with per-stage opportunity value. |
| **CRM** | Per-company activity timeline (calls, emails, meetings, notes, tasks, news) and quick activity logging. |
| **Email sequencing** | A multi-step sequence builder (Day 1 / Day 4 / Day 8 …) with **personalization variables** (`{{firstName}}`, `{{companyName}}`, `{{financingAmount}}`, `{{latestHeadline}}`, `{{exchange}}`, `{{industry}}`), per-sequence performance (sent / open / reply / meetings), and one-click enrollment. |
| **AI research agent** | Generates a company summary, financing-history read, competitive landscape, IR opportunities, and a recommended outreach angle. |
| **AI outreach writer** | Drafts a personalized email or LinkedIn message with an AI-written first line tied to the company's latest signal — copy out, or open straight in your mail client. |
| **Dashboard** | New financings this week, watchlist count, prospects in sequence, email open rate, meetings booked, opportunities, active clients, open pipeline value — plus top opportunities by score and the latest signals. |

## Prospect scoring (the engine)

`scoreCompany()` is deterministic and explainable — the same code runs in demo and live mode:

- **Financing signals** — recency (decays over ~100 days) + size + repeat-raiser bonus
- **IR signals** — management changes, new IR initiatives
- **Growth signals** — M&A, new listings, volume/price moves, drill results
- **Freshness** — a boost for any signal in the last 10 days

Scores band into **Hot (≥75) / Warm (≥50) / Cool**.

## Prerequisites

- Node.js 18+
- (optional) an Anthropic API key — https://console.anthropic.com — for the live AI features

## Setup

```bash
cd prospecting-platform
cp .env.example .env        # optional — add ANTHROPIC_API_KEY for live AI
npm install                 # installs root + server + client (workspaces)
npm run dev                 # API (:4100) + client (:5273)
```

Open http://localhost:5273. With no key the app auto-switches to **Demo mode**; you can also
toggle Demo in the top bar or append `?demo=1`.

## Production build

```bash
npm run build               # builds the client to client/dist
npm start                   # server serves the API + built client on :4100
```

### Shareable offline demo

```bash
npm run build:standalone    # → m1-prospecting-demo.html
```

Produces a single self-contained HTML file that runs the whole platform **offline in Demo
mode** (no server, no API key) — just open it in any browser. Handy for sharing an interactive
walkthrough.

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` · `/api/config` | GET | Model + whether an Anthropic key is present |
| `/api/enrich` | POST | Likely exec/IR contacts + email pattern + confidence |
| `/api/research` | POST | AI research brief for a company |
| `/api/outreach` | POST | Personalized email / LinkedIn draft (subject + body + first line) |
| `/api/first-line` | POST | A single AI-personalized opening line |

State for the company database, pipeline, CRM and sequences lives client-side (seeded from the
bundled sample dataset), mirroring the parent repo's architecture; these endpoints add the live
AI layer.

## Tech stack

- **Frontend** — React + Vite
- **Backend** — Node.js + Express
- **AI** — Anthropic (Claude) with structured outputs

## Notes / next steps for production

- The company database, pipeline and sequences are in-memory client state today — wire a
  **PostgreSQL** store (+ optional Elasticsearch for search) to persist and scale to thousands
  of companies.
- Real data integrations to add: **SEDAR+ / SEC EDGAR** filings, news APIs, and a real email-
  verification provider for contact enrichment; **Gmail API / Google Workspace** for native
  send, open/click tracking, reply-sync, and auto-pause on reply.
- Sample companies, people and emails are illustrative demo data — not real individuals.

## Files

```
server/index.js          API: /api/enrich, /api/research, /api/outreach, /api/first-line
client/src/App.jsx        The full UI (dashboard, companies, pipeline, signals, sequences, CRM)
client/src/data.js        Bundled sample dataset + prospect-scoring + CSV-import engine
client/src/api.js         Routes calls to demo generators or the live endpoints
```
