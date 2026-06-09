# Architecture

## Overview

```
┌───────────────────────────────────────────────────────────────┐
│                       Next.js App Router                        │
│                                                                 │
│  Pages (server components)        API Routes (/app/api)         │
│  /  /territory /leads /pipeline   /leads  /leads/:id/stage      │
│  /campaigns /market /heatmap      /prospects/recommendations    │
│  /analytics                       /emails/generate /proposals   │
└───────────────┬─────────────────────────────┬──────────────────┘
                │                              │
                ▼                              ▼
        ┌───────────────┐            ┌────────────────────┐
        │  Prospecting  │            │   AI layer          │
        │  engine       │            │   prompts + email + │
        │  scoring,     │            │   proposal (OpenAI  │
        │  lookalike,   │            │   or template)      │
        │  recommend,   │            └─────────┬──────────┘
        │  market, heat │                      │
        └───────┬───────┘                      │
                │                              │
                ▼                              ▼
        ┌──────────────────────────────────────────────┐
        │  Data access layer  (src/lib/store.ts)        │
        │  DATA_SOURCE=seed  → in-memory seed dataset    │
        │  DATA_SOURCE=prisma → PostgreSQL via Prisma    │
        └──────────────────────────────────────────────┘
                │
                ▼
        ┌──────────────────────────────────────────────┐
        │  External providers (key-gated, with fallbacks)│
        │  Google Maps · Apollo/Clearbit/Hunter ·        │
        │  OpenAI · SendGrid/Resend · Clerk              │
        └──────────────────────────────────────────────┘
```

## Principles

1. **Runs with zero config.** Every external dependency has a deterministic local fallback so the full product is demonstrable offline. Keys flip providers to live with no code change.
2. **One data seam.** `src/lib/store.ts` is the only module that knows where data lives. Swapping seed → Prisma is local to that file.
3. **Explainable scoring.** The prospecting engine is pure functions over typed signals (`src/lib/types.ts`). Given the same input it always returns the same scores and reasons — auditable and testable.
4. **Real reference data.** Lookalike matching runs against Orca Coast's actual published portfolio (`src/lib/data/orcaProjects.ts`), so "Similar Orca Coast Projects" is grounded in truth. (Contract values/years there are derived modeling estimates pending real CRM figures.)

## Module map

| Path | Responsibility |
|------|----------------|
| `src/lib/types.ts` | Domain types (Lead, Contact, OrgSignals, scores, campaigns) |
| `src/lib/taxonomy.ts` | 6-tier industry taxonomy, labels, value bands |
| `src/lib/prospecting/scoring.ts` | Five component scores, opportunity score, qualification, close probability, value estimation |
| `src/lib/prospecting/lookalike.ts` | Similarity to historical projects + reasons |
| `src/lib/prospecting/recommend.ts` | Recommendation ranking, market expansion, heat map |
| `src/lib/ai/prompts.ts` | System prompt + per-task prompt builders |
| `src/lib/ai/email.ts` | Email & proposal generation (OpenAI or template) |
| `src/lib/discovery.ts` | Lead discovery (Google Maps or seed search) |
| `src/lib/analytics.ts` | Derived dashboard metrics |
| `src/lib/store.ts` | Data access layer |
| `src/app/**` | Pages + API routes |
| `prisma/schema.prisma` | Production database schema |

## Request flow example — "Who to contact this week?"

1. `/` (server component) calls `getLeads()` + `getProjects()` from the store.
2. `recommendProspects()` scores each lead, finds lookalikes, builds reasons, filters out closed deals, and sorts by opportunity score.
3. The page renders `RecommendationCard`s. No client JS required for the ranking.

## Production hardening checklist

- Replace seed store with Prisma queries (multi-tenant scoping by `tenantId`).
- Add Clerk middleware for auth; map Clerk user → `User`/`Tenant`.
- Move scoring to a scheduled job that persists `OpportunityScore` rows; recompute on enrichment.
- Background workers (e.g. cron / queue) for the weekly Top-100 generation and cadence sends.
- Rate-limit and cache external provider calls; store raw enrichment payloads.
