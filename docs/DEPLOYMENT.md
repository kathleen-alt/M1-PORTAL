# Deployment Plan

## Recommended stack

- **Hosting:** Vercel (Next.js native) or any Node 18+ host.
- **Database:** managed PostgreSQL (Neon, Supabase, RDS).
- **Auth:** Clerk.
- **Email:** SendGrid or Resend.
- **AI:** OpenAI.
- **Lead/enrichment:** Google Maps Places, Apollo, Clearbit, Hunter.

## Environments

| Env | DATA_SOURCE | Notes |
|-----|-------------|-------|
| Local demo | `seed` | No DB or keys required |
| Staging | `prisma` | Real DB, test API keys, sandbox email |
| Production | `prisma` | Production keys, verified sending domain |

## First production deploy

```bash
# 1. Provision PostgreSQL and set DATABASE_URL
# 2. Apply schema
npm run db:migrate          # or: npx prisma migrate deploy
npm run db:generate
npm run db:seed             # loads portfolio + demo leads/campaigns

# 3. Configure env (see .env.example) and set DATA_SOURCE=prisma
# 4. Build & start
npm run build
npm start
```

On Vercel: set all env vars in the project settings, add a build step `prisma generate`, and run `prisma migrate deploy` as a release command.

## Scheduled jobs (post-MVP)

| Job | Cadence | Purpose |
|-----|---------|---------|
| Recompute scores | hourly / on enrichment | Persist `OpportunityScore` rows |
| Weekly Top 100 | Monday 06:00 | Generate the Territory Manager list + first-touch drafts |
| Cadence runner | every 15 min | Advance enrollments, send due steps via SendGrid/Resend |
| Discovery refresh | nightly | Pull new leads from Google Maps for active territories |

Use Vercel Cron, a queue (e.g. BullMQ/QStash), or a worker dyno.

## Security & compliance

- Scope every query by `tenantId`; enforce via Clerk-derived session.
- Store API keys as secrets; never client-exposed except `NEXT_PUBLIC_*`.
- Honor CAN-SPAM / CASL: include unsubscribe + physical address in sent email; respect suppression lists.
- Log enrichment provenance for auditability.

## Observability

- Structured logs around external provider calls (latency, cost, error rate).
- Capture email events (open/reply/bounce) via provider webhooks into the `Activity` table.
- Dashboard the funnel from `src/lib/analytics.ts` against real data.

## MVP launch scope

The current build is launch-ready as an internal BD tool once: (1) Prisma is wired in `store.ts`, (2) Clerk auth is added, (3) a sending domain + cadence runner are configured. Discovery/enrichment can stay in seed mode and be enabled provider-by-provider without further code changes.
