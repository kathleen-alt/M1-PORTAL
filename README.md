# Orca Coast Growth Engine 🐋

An AI sales & outreach platform for **Orca Coast Playgrounds** ([orcacoastplay.com](https://www.orcacoastplay.com/)) that finds, enriches, scores, and recommends the next-best organizations to sell indoor playgrounds to — and automates the outreach that turns them into projects.

It is built to function like a full-time business development manager: every week it surfaces the accounts most likely to buy, explains *why* (matched against Orca Coast's real past projects), estimates the deal size, and drafts the first-touch email.

> **Demo mode:** the app runs end-to-end with **no external services or database** — all integrations (Google Maps, OpenAI, Apollo/Clearbit/Hunter, SendGrid/Resend, Clerk) have deterministic local fallbacks. Add API keys in `.env` to switch any of them to live.

---

## Quick start

```bash
npm install
cp .env.example .env     # optional — runs without it
npm run dev              # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

---

## Filling the funnel: sourcing, outreach, tracking, logging

The platform's job is to keep the top of the funnel full and every interaction logged:

- **Source the right clients** (`/leads`) — three ways:
  1. **Import a list** — paste a directory export / spreadsheet / search results (any of `Name`, `Name, City, REGION`, `…, website, phone`). Each line is auto-classified into the tiered taxonomy, scored, deduped, and added to the CRM. Works offline.
  2. **Live source (OpenStreetMap)** — pull *real* organizations for a city + target categories with **no API key**. (Add `GOOGLE_MAPS_API_KEY` to swap in Places for richer contacts.)
  3. **Search current leads** — filter the existing pipeline.
- **Outreach** (`/campaigns`, `/territory`) — vertical cadences + AI emails referencing the most similar real Orca Coast project.
- **Track & log** (`/leads/[id]`) — per-account detail page with scores, contacts, lookalikes, a **stage selector**, and an **activity timeline**: log calls/emails/notes; stage changes are recorded automatically.

## The Strategic Prospecting Engine (the core)

This is the platform's most important feature. It is implemented as **real, deterministic, explainable logic** in `src/lib/prospecting/` — not random numbers.

| Page | What it does |
|------|--------------|
| **Who to Contact** (`/`) | Executive dashboard ranking accounts by Opportunity Score with reasons, value, decision makers, close probability, and similar Orca Coast projects. |
| **Territory Manager** (`/territory`) | The weekly "Top 100" list with contacts, est. project size, suggested sequence, similar customer, and an AI-generated first-touch email per account. |
| **Lead Discovery** (`/leads`) | Search by industry / city / province-state / postal code; enriched, scored results. |
| **CRM Pipeline** (`/pipeline`) | Drag-and-drop Kanban across the 8 sales stages; changes persist via API. |
| **Campaigns** (`/campaigns`) | Vertical templates (YMCA, Church, Daycare, Recreation), the automated cadence, and an interactive AI email studio. |
| **Market Expansion** (`/market`) | Finds under-penetrated categories vs. where Orca Coast has already won. |
| **Heat Map** (`/heatmap`) | Provinces/states ranked by revenue potential and high-opportunity concentration. |
| **Analytics** (`/analytics`) | Funnel, outreach performance, revenue pipeline. |

### Scoring model

Every account receives five component scores (0–100) that combine into an **Opportunity Score**:

| Score | Driven by | Weight |
|-------|-----------|--------|
| Playground Fit | tier, child focus, facility size, locations | 30% |
| Budget Likelihood | budget band, org size, growth signals | 20% |
| Family Traffic | child focus, weekly traffic, locations | 20% |
| Decision-Maker Access | # decision makers, contact completeness/confidence | 15% |
| Revenue Potential | estimated deal value | 15% |

Plus a separate **Lead Qualification Score** → Hot / Warm / Cold, and a **Close Probability**. See `src/lib/prospecting/scoring.ts`.

### Lookalike matching

For any lead, `src/lib/prospecting/lookalike.ts` ranks Orca Coast's **real historical portfolio** (`src/lib/data/orcaProjects.ts`, ~190 projects across CA/US) by industry/tier, facility size, geography, and child focus — and explains each match.

---

## Tiered ICP taxonomy

`src/lib/taxonomy.ts` encodes the 6-tier prospect model (Tier 1 recreation/community/faith → Tier 6 hidden opportunities like airports, malls, Indigenous community centres, apartments, pediatric clinics). The real portfolio includes precedents in each tier, which powers credible lookalike matching for "hidden" categories.

---

## Architecture

- **Next.js 14 (App Router) · TypeScript · Tailwind CSS**
- `src/lib/prospecting/` — scoring, lookalike, recommendation, market expansion, heat map
- `src/lib/ai/` — prompt architecture + email/proposal generation (OpenAI or template fallback)
- `src/lib/store.ts` — single data-access seam (seed data today, Prisma/PostgreSQL in prod)
- `src/app/api/` — REST endpoints for leads, stages, recommendations, emails, proposals
- `prisma/schema.prisma` — full production PostgreSQL schema

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md), [`docs/DATABASE.md`](docs/DATABASE.md), and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/leads` | List leads with recommendations |
| `POST` | `/api/leads` | Create a lead |
| `PATCH` | `/api/leads/:id/stage` | Move a lead's pipeline stage |
| `GET` | `/api/prospects/recommendations` | Ranked recommendations (`?tiers=1,2&minOpportunity=80&limit=100`) |
| `POST` | `/api/emails/generate` | Generate an email or full sequence |
| `POST` | `/api/proposals/generate` | Generate a proposal |

---

## Switching on live integrations

Set the relevant key in `.env` and the corresponding provider goes live automatically:

- `OPENAI_API_KEY` → AI email/proposal generation
- `GOOGLE_MAPS_API_KEY` → live lead discovery
- `APOLLO_API_KEY` / `CLEARBIT_API_KEY` / `HUNTER_API_KEY` → contact enrichment
- `SENDGRID_API_KEY` / `RESEND_API_KEY` → email delivery
- `DATABASE_URL` + `DATA_SOURCE=prisma` → PostgreSQL persistence
