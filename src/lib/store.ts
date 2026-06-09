// ---------------------------------------------------------------------------
// Data access layer.
//
// The app ships in DEMO mode (DATA_SOURCE=seed): an in-memory repository backed
// by the seed dataset, so every feature works with no database. In production
// (DATA_SOURCE=prisma) these functions are the single place to swap in Prisma
// queries against the schema in prisma/schema.prisma — the rest of the app is
// unaffected because it only depends on this module's interface.
// ---------------------------------------------------------------------------

import type {
  ActivityLog,
  ActivityType,
  Campaign,
  Lead,
  OrcaProject,
  PipelineStage,
} from "./types";
import { SEED_LEADS } from "./data/leads";
import { ORCA_PROJECTS } from "./data/orcaProjects";
import { CAMPAIGN_TEMPLATES } from "./data/campaigns";

// In-memory mutable state so edits persist for the process lifetime.
// (globalThis caching survives Next.js hot-reload in dev.)
const g = globalThis as unknown as {
  __orcaLeads?: Lead[];
  __orcaActivities?: ActivityLog[];
};
if (!g.__orcaLeads) g.__orcaLeads = SEED_LEADS.map((l) => ({ ...l }));
if (!g.__orcaActivities) g.__orcaActivities = [];

export function getLeads(): Lead[] {
  return g.__orcaLeads!;
}

export function getLead(id: string): Lead | undefined {
  return g.__orcaLeads!.find((l) => l.id === id);
}

const dedupeKey = (l: Pick<Lead, "name" | "address">) =>
  `${l.name.toLowerCase().trim()}|${(l.address.city || "").toLowerCase()}|${l.address.region}`;

export function updateLeadStage(id: string, stage: PipelineStage): Lead | undefined {
  const lead = getLead(id);
  if (lead && lead.stage !== stage) {
    const from = lead.stage;
    lead.stage = stage;
    addActivity(id, "stage_change", `Stage moved: ${from} → ${stage}`);
  }
  return lead;
}

export function addLead(lead: Lead): Lead {
  g.__orcaLeads!.unshift(lead);
  return lead;
}

/**
 * Bulk add with dedupe against existing leads. Returns how many were added vs
 * skipped as duplicates — used by import and live sourcing.
 */
export function addLeads(leads: Lead[]): { added: number; skipped: number; leads: Lead[] } {
  const existing = new Set(g.__orcaLeads!.map(dedupeKey));
  const added: Lead[] = [];
  let skipped = 0;
  for (const lead of leads) {
    const key = dedupeKey(lead);
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    existing.add(key);
    g.__orcaLeads!.unshift(lead);
    added.push(lead);
    addActivity(lead.id, "note", `Lead added via ${lead.source}.`);
  }
  return { added: added.length, skipped, leads: added };
}

// --- Activity logging (client logging / outreach tracking) ---------------

export function addActivity(leadId: string, type: ActivityType, summary: string): ActivityLog {
  const activity: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    leadId,
    type,
    summary,
    createdAt: new Date().toISOString(),
  };
  g.__orcaActivities!.unshift(activity);
  return activity;
}

export function getActivities(leadId: string): ActivityLog[] {
  return g.__orcaActivities!.filter((a) => a.leadId === leadId);
}

export function getProjects(): OrcaProject[] {
  return ORCA_PROJECTS;
}

export function getCampaigns(): Campaign[] {
  return CAMPAIGN_TEMPLATES;
}
