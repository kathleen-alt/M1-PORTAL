// ---------------------------------------------------------------------------
// Prisma seed — loads the demo dataset (Orca Coast projects, leads, contacts,
// signals, and campaign templates) into PostgreSQL. Run with `npm run db:seed`
// after `npm run db:migrate`.
//
// In DEMO mode the app reads from src/lib/data/* directly and this is optional.
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { SEED_LEADS } from "../src/lib/data/leads";
import { ORCA_PROJECTS } from "../src/lib/data/orcaProjects";
import { CAMPAIGN_TEMPLATES } from "../src/lib/data/campaigns";
import { industryTier } from "../src/lib/taxonomy";

const prisma = new PrismaClient();

const STAGE_MAP: Record<string, any> = {
  "New Lead": "NEW_LEAD",
  Contacted: "CONTACTED",
  Responded: "RESPONDED",
  "Discovery Call": "DISCOVERY_CALL",
  "Proposal Sent": "PROPOSAL_SENT",
  Negotiation: "NEGOTIATION",
  "Closed Won": "CLOSED_WON",
  "Closed Lost": "CLOSED_LOST",
};

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "orca-coast" },
    update: {},
    create: { id: "orca-coast", name: "Orca Coast Playgrounds" },
  });

  for (const p of ORCA_PROJECTS) {
    await prisma.orcaProject.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        tenantId: tenant.id,
        name: p.name,
        industry: p.industry,
        city: p.city ?? "",
        region: p.region,
        country: p.country,
        website: p.website,
        contractValue: p.contractValue,
        facilitySqFt: p.facilitySqFt,
        year: p.year,
        summary: p.summary,
      },
    });
  }

  for (const l of SEED_LEADS) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        tenantId: tenant.id,
        name: l.name,
        industry: l.industry,
        tier: industryTier(l.industry),
        website: l.website,
        phone: l.phone,
        source: l.source,
        stage: STAGE_MAP[l.stage],
        dataConfidence: l.dataConfidence,
        notes: l.notes,
        line1: l.address.line1,
        city: l.address.city,
        region: l.address.region,
        postalCode: l.address.postalCode,
        country: l.address.country,
        lat: l.address.lat,
        lng: l.address.lng,
        contacts: {
          create: l.contacts.map((c) => ({
            name: c.name,
            role: c.role,
            email: c.email,
            phone: c.phone,
            linkedin: c.linkedin,
            confidence: c.confidence,
            isDecisionMaker: c.isDecisionMaker,
          })),
        },
        signals: {
          create: {
            orgSize: l.signals.orgSize,
            facilitySqFt: l.signals.facilitySqFt,
            locationCount: l.signals.locationCount,
            childFocused: l.signals.childFocused,
            hasExistingPlayArea: l.signals.hasExistingPlayArea,
            annualBudgetBand: l.signals.annualBudgetBand,
            weeklyFamilyTraffic: l.signals.weeklyFamilyTraffic,
            growthIndicators: l.signals.growthIndicators ?? [],
          },
        },
      },
    });
  }

  for (const c of CAMPAIGN_TEMPLATES) {
    await prisma.campaign.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        tenantId: tenant.id,
        name: c.name,
        vertical: c.vertical,
        focusPoints: c.focusPoints,
        steps: {
          create: c.cadence.map((s, i) => ({
            day: s.day,
            channel: s.channel,
            emailType: s.emailType,
            label: s.label,
            order: i,
          })),
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
