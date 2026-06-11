# Master Build Prompt — Orca Coast Growth Engine

> Copy everything below the line into an AI coding agent (or hand to a developer)
> to build/continue the platform. It encodes the full spec **and** the hard-won
> corrections from real iteration.

---

## ROLE & GOAL

Build a production-ready web app, the **"Orca Coast Growth Engine"** — an AI
sales & outreach platform that acts like a full-time business-development manager
for **Orca Coast Playgrounds**, a company that **custom-designs, manufactures,
and installs indoor playgrounds** (themed, toddler, and large-scale) **to fit any
space and budget**, across **Canada and the United States**.

The app must: source the right prospects, enrich them, score/prioritize them,
generate personalized outreach, run multi-step sequences (via Gmail), track the
pipeline, and recommend "who to contact this week" — all grounded in Orca Coast's
**real** historical project portfolio.

## NON-NEGOTIABLE PRINCIPLES (these caused the most rework — honor them)

1. **REAL DATA ONLY. Never fabricate leads, contacts, firmographics, emails,
   phone numbers, or pipeline activity.** The only seeded data is the **real
   completed-project portfolio**. Leads come from real import/sourcing. If a fact
   isn't verified, omit it or clearly label it as inferred/estimated.

2. **Target = greenfield, family-serving venues that DON'T have a playground
   yet.** Everything in the portfolio is a *completed* project (already has one) —
   so do NOT prospect indoor-playground operators that already have a play space.
   Prospect venues that serve families but lack one.

3. **Right-size to Orca Coast's ACTUAL customer profile.** Their real customers
   are **small-to-mid local operators and regional institutions in small/mid
   towns** — independent play centres, daycares, **regional** churches with
   children's ministries, community/recreation centres, **regional YMCAs**, FECs,
   resorts, mid-size museums/aquariums/science centres. **Do NOT target
   celebrity/national institutions** (e.g., megachurches like Lakewood/Life.Church,
   the world's-largest museums, giant metro associations). When unsure of scale,
   smaller + regional is correct.

4. **Money is always an indicative range/band (custom-scoped).** Every playground
   is custom-priced, so never present a fixed dollar figure as fact. Show ranges
   ("$150K–$300K") and label "indicative."

5. **Inferred data must be labeled.** Pattern-guessed emails (first.last@domain),
   category-estimated firmographics, and role inboxes (info@/office@) are useful
   but must be visibly marked as inferred/estimated, not asserted as verified.

## TECH STACK

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Node. PostgreSQL via Prisma
for production (ship with an in-memory seed/data layer so it runs with zero
config). Single data-access seam so seed→Prisma is a local swap. Auth: Clerk
(optional/stubbed in demo). Email: Gmail (primary), Resend, SendGrid. AI: OpenAI
(with a deterministic template fallback so everything works offline). Integrations
(key-gated, graceful fallbacks): Google Maps/Places, OpenStreetMap Overpass,
Apollo, Clearbit, Hunter.io.

## DOMAIN MODEL

- **Industry taxonomy in 6 tiers** (Tier 1 = best fit … Tier 6 = "hidden
  opportunities"): recreation/community/municipal/YMCA/YWCA/parks-rec & churches
  (T1); daycare/childcare/montessori/preschool/private school (T2);
  museums/children's museums/science centres/aquariums/aviation/discovery/cultural
  (T3); FEC/indoor-play/trampoline/adventure/play-café/activity/birthday (T4);
  resorts/hotels/campgrounds/RV/waterparks/sports/athletic (T5); pediatric clinics,
  children's hospitals, Indigenous community centres, libraries, shopping centres,
  airport family zones, military family resource centres, apartment/mixed-use/
  housing developers, community associations, non-profits (T6). Each industry has a
  label, tier, child-focus flag, and an indicative value band.
- **Lead**: name, industry, website, phone, address (city/region/country/lat/lng),
  contacts[], signals (firmographics), socials, dataConfidence, source, stage,
  starred, enrichedAt.
- **Contact**: name, role, email, phone, linkedin, confidence, isDecisionMaker.
- **OrgSignals**: orgSize, facilitySqFt, locationCount, childFocused,
  hasExistingPlayArea, growthIndicators[], annualBudgetBand, weeklyFamilyTraffic.
- **OrcaProject** (portfolio): name, industry, city, region, country, website,
  contractValue (indicative), facilitySqFt, year, summary.
- **ActivityLog**, **Enrollment** + **EnrollmentStep** (cadence), **Campaign**.

## SCORING ENGINE (deterministic, explainable — the analytical core)

For every account compute five 0–100 component scores and combine them:
- **Playground Fit** (0.30) — tier baseline + child focus + facility size +
  multi-location − existing play area.
- **Budget Likelihood** (0.20) — budget band / org size + growth indicators.
- **Family Traffic** (0.20) — child focus + weekly family traffic + locations.
- **Decision-Maker Access** (0.15) — # decision-makers × contact completeness/conf.
- **Revenue Potential** (0.15) — scaled from the estimated value band.
→ **Opportunity Score** (weighted blend). Also: **Lead Qualification** score →
Hot/Warm/Cold, **Close Probability** (opportunity + DM access × tier factor), and
an **indicative value range** (industry band × facility/location multipliers).

## LOOKALIKE MATCHING (vs the REAL portfolio)

For each lead, rank the real portfolio by similarity (exact industry 55 / same
tier 33 / tier-gap penalty; facility-size proximity; same country/region;
shared child focus) and return the top matches with human reasons ("Same category
as Woodlands Church · Same region (TX)"). Every recommendation cites a real
similar project.

## CORE FEATURES

1. **Lead Discovery / Sourcing** — three ways: (a) **Import** a pasted list/CSV
   (auto-classify into the taxonomy via keyword rules + region detection, dedupe,
   score); (b) **Live source** via OpenStreetMap Overpass (no key) or Google
   Places (key) by city + categories; (c) search current leads. Graceful fallback
   when network/keys are unavailable.
2. **Enrichment** — orchestrated: category-calibrated **signal inference**
   (offline, fills firmographics so scoring is meaningful) + **website scraping**
   (phone, socials, mailto emails, staff names) + **Hunter/Apollo** (people) +
   **Clearbit** (company) + **email finder** (pattern emails + info@/office@ role
   inboxes). Report sources used and the **Opportunity Score lift**. Label
   estimates.
3. **AI Email Generation** — first-touch, follow-up, value, case-study, final
   check-in; personalized by org/city/industry/role + the top real lookalike
   project. System prompt + templates **bake in Orca's differentiators** (custom/
   themed/any-size, turnkey design+build+install, 200+ CA/US projects); never
   disparage competitors. OpenAI when keyed, deterministic templates otherwise.
4. **Email Sequences / Cadence** — vertical campaign templates (YMCA, Church,
   Daycare, Recreation) with a Day 1→30 cadence (email/follow-up/case-study/call/
   final/nurture). Enroll a lead → build scheduled steps with pre-generated emails;
   mark sent/skip/pause. First send auto-advances stage to Contacted.
5. **Gmail integration** — send a sequence step or (default) create a **Gmail
   draft** for review (EMAIL_SEND_MODE=draft|send) via OAuth; also Resend/SendGrid;
   console fallback. **Reply tracking**: a reply pauses the sequence and moves the
   lead to Responded (webhook endpoint a Gmail watcher can call).
6. **Contacts** — real verified contacts where findable (named decision-makers by
   public title; published phone/general inbox). **Never fabricate personal
   emails** — infer-on-enrichment and label them.
7. **CRM Pipeline** — 8 stages (New Lead → Closed Won/Lost), drag-and-drop, value
   totals; activity timeline per lead (calls/emails/notes), auto-logged stage
   changes.
8. **Star / prioritize** — flag your own priority leads, filter to starred.
9. **CSV export** — contacts (all / per-lead / starred-only) with org, contact,
   role, email, phone, linkedin, industry, location, opportunity, stage.
10. **AI Proposal Assistant** — summary, concept, scope, indicative budget range.

## STRATEGIC PROSPECTING ENGINE (most important)

- **"Who Should We Contact This Week?"** exec dashboard — accounts ranked by
  Opportunity Score with reasons, decision-makers, close probability, indicative
  value, and the similar real project.
- **AI Territory Manager** — weekly Top-N list with contacts, est. project size,
  suggested sequence, similar customer, and an AI first-touch email.
- **Similar Customer Matching** — on every lead.
- **Market Expansion Finder** — compute REAL penetration from the portfolio
  (categories won vs open leads); surface under-penetrated verticals worth a
  campaign.
- **Opportunity Heat Map** — provinces/states by revenue potential.
- **Revenue Opportunity Score** — the 5 component scores → Opportunity 0–100;
  highlight ≥ 80.

## TARGET-MARKET STRATEGY (build the data/Market-Expansion to reflect this)

Greenfield family venues without a playground yet, prioritized by Orca's proven
precedents:
- **Core/proven**: regional YMCAs, churches with children's ministries,
  recreation/community/municipal centres, daycares/childcare, FECs.
- **High-upside (proven by ≥1 project)**: **hotels & resorts** (Kalahari, Isleta,
  Viking Inn precedents — family resorts, ski/mountain resorts, casino resorts),
  **shopping malls** (Coquitlam Centre, Swift Current Mall — but skip ones that
  already have play), **fitness clubs/gyms with childminding**, **zoos/aquariums/
  science & discovery centres**, **pediatric/dental clinics**, **airports**,
  **apartment/mixed-use developers**, **RV resorts/campgrounds/waterparks**,
  **libraries**, **Indigenous community centres**, **family restaurants/cafés**.
- **Net-new ideas to test**: auto dealerships, big-box/furniture retail (IKEA
  Småland model), universities (campus rec/family housing), military family
  resource centres, credit unions/banks, multi-gen/senior centres.

## COMPETITIVE POSITIONING (bake into messaging)

Larger competitors (e.g., iPlayco, Atomic Playgrounds) are inbound-led (web,
dealers, trade-show booths). Orca's edge: **custom-to-any-size + turnkey
(design+build+install) + 200+ proof projects across CA/US and every venue type +
regional/small-mid agility**, plus this engine's **proactive** outbound (find
greenfield venues, lookalike-match, personalized email before the RFP). Compete on
fit/proof/partnership, not price; never knock competitors by name.

## TRADE SHOWS (surface in-app / docs, time sequences to them)

IAAPA Expo (FEC/attractions/zoos/aquariums/resorts — flagship), Orange Conference
& Children's Pastors Conference (churches), NRPA + ARPA/BCRPA/PRO (rec/municipal),
ACM InterActivity (children's museums), AZA (zoos/aquariums), NAEYC (childcare),
Amusement Expo/Foundations (FEC), ICSC (malls), HD Expo/AHLA (hotels). Keep a
calendar mapped to verticals with verified dates.

## UX REQUIREMENTS

Coastal brand: green-and-blue (Orca Coast logo), dark ocean theme. **Fully
responsive / mobile** (collapsible menu, single-column, scrollable tables). Leads
Workspace: at-a-glance scored table → open a lead → enrich → push to sequence →
export; live scores recompute as data changes; persist locally in the demo.

## DELIVERABLES

Complete Prisma/PostgreSQL schema; seeded real portfolio; REST API
(leads, stages, recommendations, emails, proposals, enrich, enroll, sequences,
star, contacts/export, discovery/source, replied); dashboard pages (who-to-contact,
territory, leads + lead detail, pipeline, campaigns, sequences, market, heat map,
analytics, portfolio); a self-contained interactive demo.html; and docs
(architecture, AI prompts, database, deployment, Gmail setup, conferences,
competitive). Provide a runnable MVP with deterministic offline fallbacks for
every external dependency.
