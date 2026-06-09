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
  Enrollment,
  EnrollmentStep,
  Lead,
  OrcaProject,
  PipelineStage,
} from "./types";
import { SEED_LEADS } from "./data/leads";
import { ORCA_PROJECTS } from "./data/orcaProjects";
import { CAMPAIGN_TEMPLATES } from "./data/campaigns";
import { generateEmail } from "./ai/email";
import { findLookalikes } from "./prospecting/lookalike";
import { dispatchEmail, type DispatchResult } from "./email/send";

// In-memory mutable state so edits persist for the process lifetime.
// (globalThis caching survives Next.js hot-reload in dev.)
const g = globalThis as unknown as {
  __orcaLeads?: Lead[];
  __orcaActivities?: ActivityLog[];
  __orcaEnrollments?: Enrollment[];
};
if (!g.__orcaLeads) g.__orcaLeads = SEED_LEADS.map((l) => ({ ...l }));
if (!g.__orcaActivities) g.__orcaActivities = [];
if (!g.__orcaEnrollments) g.__orcaEnrollments = [];

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

/** Toggle (or set) the user's priority star on a lead. */
export function setStar(id: string, starred?: boolean): Lead | undefined {
  const lead = getLead(id);
  if (lead) lead.starred = starred ?? !lead.starred;
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

// --- Email sequence enrollment ------------------------------------------

function verticalFocus(industry: string): string[] {
  const byVertical: Record<string, string[]> = {};
  for (const c of CAMPAIGN_TEMPLATES) byVertical[c.vertical] = c.focusPoints;
  if (industry.includes("church")) return byVertical.church ?? [];
  if (industry.includes("daycare") || industry.includes("preschool") || industry.includes("childcare") || industry.includes("early"))
    return byVertical.daycare ?? [];
  if (industry === "ymca" || industry === "ywca") return byVertical.ymca ?? [];
  if (industry.includes("recreation") || industry.includes("community")) return byVertical.recreation ?? [];
  return byVertical.general ?? byVertical.recreation ?? [];
}

/**
 * Enroll a lead into a campaign sequence: builds scheduled steps from the
 * cadence (dueAt = startedAt + day) and pre-generates email content for each
 * email step. Logs the enrollment as an activity. Async because email
 * generation may call the AI provider.
 */
export async function enrollLead(
  leadId: string,
  campaignId: string,
): Promise<Enrollment | undefined> {
  const lead = getLead(leadId);
  const campaign = CAMPAIGN_TEMPLATES.find((c) => c.id === campaignId);
  if (!lead || !campaign) return undefined;

  // One active enrollment per lead+campaign.
  const existing = g.__orcaEnrollments!.find(
    (e) => e.leadId === leadId && e.campaignId === campaignId && e.status !== "completed",
  );
  if (existing) return existing;

  const startedAt = new Date();
  const similarProject = findLookalikes(lead, ORCA_PROJECTS, 1)[0]?.project;
  const focus = verticalFocus(lead.industry);
  const toEmail =
    lead.contacts.find((c) => c.isDecisionMaker && c.email)?.email ??
    lead.contacts.find((c) => c.email)?.email;

  const steps: EnrollmentStep[] = [];
  for (const step of campaign.cadence) {
    const dueAt = new Date(startedAt.getTime() + step.day * 86_400_000).toISOString();
    let subject: string | undefined;
    let body: string | undefined;
    if (step.channel === "email" && step.emailType) {
      const email = await generateEmail({
        lead,
        emailType: step.emailType,
        campaignFocus: focus,
        similarProject,
      });
      subject = email.subject;
      body = email.body;
    }
    steps.push({
      day: step.day,
      channel: step.channel,
      emailType: step.emailType,
      label: step.label,
      dueAt,
      status: "pending",
      subject,
      body,
      toEmail: step.channel === "email" ? toEmail : undefined,
    });
  }

  const enrollment: Enrollment = {
    id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    leadId,
    leadName: lead.name,
    campaignId,
    campaignName: campaign.name,
    status: "active",
    startedAt: startedAt.toISOString(),
    steps,
    currentIndex: 0,
  };
  g.__orcaEnrollments!.unshift(enrollment);
  addActivity(leadId, "email", `Enrolled in sequence: ${campaign.name}.`);
  return enrollment;
}

export function getEnrollments(leadId?: string): Enrollment[] {
  return leadId
    ? g.__orcaEnrollments!.filter((e) => e.leadId === leadId)
    : g.__orcaEnrollments!;
}

export function getEnrollment(id: string): Enrollment | undefined {
  return g.__orcaEnrollments!.find((e) => e.id === id);
}

/**
 * Mark the current step sent/skipped and advance. For an email step marked
 * "sent", the message is dispatched through the configured provider (Gmail
 * draft/send, Resend, SendGrid, or console). Logs an activity either way.
 */
export async function advanceEnrollment(
  id: string,
  action: "sent" | "skipped" = "sent",
): Promise<{ enrollment?: Enrollment; dispatch?: DispatchResult }> {
  const e = getEnrollment(id);
  if (!e || e.status !== "active") return { enrollment: e };
  const step = e.steps[e.currentIndex];
  if (!step) return { enrollment: e };

  let dispatch: DispatchResult | undefined;
  if (action === "sent" && step.channel === "email" && step.subject && step.toEmail) {
    dispatch = await dispatchEmail({ to: step.toEmail, subject: step.subject, body: step.body ?? "" });
  }

  step.status = action;
  const verb = action === "sent" ? (dispatch?.status === "drafted" ? "Drafted" : "Sent") : "Skipped";
  const via = dispatch ? ` via ${dispatch.provider}` : "";
  addActivity(
    e.leadId,
    step.channel === "email" ? "email" : step.channel === "phone" ? "call" : "note",
    `${verb} sequence step (Day ${step.day}): ${step.label}${via}.`,
  );

  // Advance the standing of the lead on first send.
  if (action === "sent" && step.channel === "email") {
    const lead = getLead(e.leadId);
    if (lead && lead.stage === "New Lead") updateLeadStage(e.leadId, "Contacted");
  }

  e.currentIndex += 1;
  if (e.currentIndex >= e.steps.length) e.status = "completed";
  return { enrollment: e, dispatch };
}

export function setEnrollmentStatus(
  id: string,
  status: "active" | "paused" | "completed",
): Enrollment | undefined {
  const e = getEnrollment(id);
  if (e) e.status = status;
  return e;
}

/**
 * Record that a prospect replied: pause their active sequences (you don't keep
 * auto-mailing someone who answered) and advance the pipeline to Responded.
 * A Gmail/IMAP reply watcher calls this; it can also be triggered manually.
 */
export function markReplied(leadId: string, detail?: string): { paused: number } {
  let paused = 0;
  for (const e of g.__orcaEnrollments!) {
    if (e.leadId === leadId && e.status === "active") {
      e.status = "paused";
      paused++;
    }
  }
  addActivity(leadId, "email", `Prospect replied${detail ? `: ${detail}` : ""}. ${paused ? "Sequence paused." : ""}`.trim());
  const lead = getLead(leadId);
  if (lead && (lead.stage === "New Lead" || lead.stage === "Contacted")) {
    updateLeadStage(leadId, "Responded");
  }
  return { paused };
}

export function getProjects(): OrcaProject[] {
  return ORCA_PROJECTS;
}

export function getCampaigns(): Campaign[] {
  return CAMPAIGN_TEMPLATES;
}
