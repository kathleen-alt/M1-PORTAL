// ---------------------------------------------------------------------------
// Analytics — derived metrics for the dashboard. Computed from leads + their
// pipeline stages. Outreach metrics (sends/opens/replies) are illustrative
// demo figures derived deterministically from the dataset.
// ---------------------------------------------------------------------------

import type { Lead, PipelineStage } from "./types";
import { PIPELINE_STAGES } from "./types";
import { recommendLead } from "./prospecting/recommend";
import { getProjects } from "./store";

export interface AnalyticsSummary {
  leadsGenerated: number;
  emailsSent: number;
  openRate: number; // %
  replyRate: number; // %
  meetingsBooked: number;
  opportunities: number;
  revenuePipeline: number; // weighted by close probability
  closedRevenue: number;
  pipelineByStage: { stage: PipelineStage; count: number }[];
}

const ADVANCED_STAGES: PipelineStage[] = [
  "Discovery Call",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
];

export function computeAnalytics(leads: Lead[]): AnalyticsSummary {
  const projects = getProjects();
  const pipelineByStage = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));

  const contactedOrBeyond = leads.filter((l) => l.stage !== "New Lead");
  // Illustrative outreach volume: cadence of ~3 emails per contacted lead.
  const emailsSent = contactedOrBeyond.length * 3;
  const meetingsBooked = leads.filter((l) => ADVANCED_STAGES.includes(l.stage)).length;
  const opportunities = leads.filter(
    (l) => l.stage === "Proposal Sent" || l.stage === "Negotiation",
  ).length;

  let revenuePipeline = 0;
  let closedRevenue = 0;
  for (const lead of leads) {
    const rec = recommendLead(lead, projects);
    const mid = (rec.estimatedValue.low + rec.estimatedValue.high) / 2;
    if (lead.stage === "Closed Won") {
      closedRevenue += mid;
    } else if (lead.stage !== "Closed Lost" && lead.stage !== "New Lead") {
      revenuePipeline += Math.round((mid * rec.closeProbability) / 100);
    }
  }

  return {
    leadsGenerated: leads.length,
    emailsSent,
    // Open/reply rates populate from real email events (provider webhooks).
    // No sends yet → 0, rather than a fabricated benchmark.
    openRate: 0,
    replyRate: 0,
    meetingsBooked,
    opportunities,
    revenuePipeline,
    closedRevenue,
    pipelineByStage,
  };
}
