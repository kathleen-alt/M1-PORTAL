# Database Schema

Full schema: [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL). Multi-tenant from day one so the engine can be resold.

## Entities

```
Tenant ──< User
Tenant ──< OrcaProject              (historical portfolio / reference set)
Tenant ──< Campaign ──< CadenceStep
Tenant ──< Lead
                 │
   ┌─────────────┼───────────────┬───────────────┬──────────────┐
   ▼             ▼               ▼               ▼              ▼
Contact      OrgSignals    OpportunityScore  Activity       Proposal
(1..n)        (1:1)            (1:1)          (emails/      (generated
                                              events)        proposals)
Lead ──< CampaignEnrollment >── Campaign
```

## Key tables

- **Lead** — the organization. Carries denormalized address + `tier`/`stage` for fast filtering. Indexed by `(tenantId, stage)` and `(tenantId, tier)`.
- **Contact** — people at the lead, with `confidence` and `isDecisionMaker`.
- **OrgSignals** — the enrichment signals that feed scoring (size, sq ft, locations, child focus, budget band, traffic, growth indicators).
- **OpportunityScore** — persisted output of the scoring engine (five components + opportunity + lead score + category + close probability + value range), recomputed by a scheduled job.
- **OrcaProject** — Orca Coast's real portfolio; the lookalike reference set.
- **Campaign / CadenceStep / CampaignEnrollment** — outreach sequences and per-lead enrollment state.
- **Activity** — generated/sent emails and outreach events (open/reply/bounce) for analytics.
- **Proposal** — AI-generated proposals.

## Enums

`Country`, `LeadSource`, `PipelineStage` (8 stages), `LeadCategory` (HOT/WARM/COLD), `Channel` (email/linkedin/phone/sms), `EmailType`.

> The `industry` field is a string matching the `Industry` union in `src/lib/types.ts` (kept as a string in the DB for taxonomy flexibility; validated in application code).

## Seeding

`npm run db:seed` (`prisma/seed.ts`) loads the same datasets the demo uses: the real portfolio, demo leads with contacts/signals, and the campaign templates with cadences.
