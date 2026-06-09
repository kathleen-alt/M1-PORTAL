// ---------------------------------------------------------------------------
// Data access layer.
//
// The app ships in DEMO mode (DATA_SOURCE=seed): an in-memory repository backed
// by the seed dataset, so every feature works with no database. In production
// (DATA_SOURCE=prisma) these functions are the single place to swap in Prisma
// queries against the schema in prisma/schema.prisma — the rest of the app is
// unaffected because it only depends on this module's interface.
// ---------------------------------------------------------------------------

import type { Campaign, Lead, OrcaProject, PipelineStage } from "./types";
import { SEED_LEADS } from "./data/leads";
import { ORCA_PROJECTS } from "./data/orcaProjects";
import { CAMPAIGN_TEMPLATES } from "./data/campaigns";

// In-memory mutable copy so pipeline edits persist for the process lifetime.
// (globalThis caching survives Next.js hot-reload in dev.)
const g = globalThis as unknown as { __orcaLeads?: Lead[] };
if (!g.__orcaLeads) {
  g.__orcaLeads = SEED_LEADS.map((l) => ({ ...l }));
}

export function getLeads(): Lead[] {
  return g.__orcaLeads!;
}

export function getLead(id: string): Lead | undefined {
  return g.__orcaLeads!.find((l) => l.id === id);
}

export function updateLeadStage(id: string, stage: PipelineStage): Lead | undefined {
  const lead = getLead(id);
  if (lead) lead.stage = stage;
  return lead;
}

export function addLead(lead: Lead): Lead {
  g.__orcaLeads!.unshift(lead);
  return lead;
}

export function getProjects(): OrcaProject[] {
  return ORCA_PROJECTS;
}

export function getCampaigns(): Campaign[] {
  return CAMPAIGN_TEMPLATES;
}
