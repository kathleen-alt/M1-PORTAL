// ---------------------------------------------------------------------------
// AI Prompt Architecture.
//
// Centralizes the system prompt and per-task prompt builders used by the AI
// layer (email generation, proposal assistant, recommendation rationale).
// When OPENAI_API_KEY is set these are sent to the model; otherwise the
// deterministic template engine produces equivalent output offline.
// ---------------------------------------------------------------------------

import type { EmailType, Lead, OrcaProject } from "../types";
import { industryLabel } from "../taxonomy";

export const SALES_SYSTEM_PROMPT = `You are the senior business development strategist for Orca Coast Playgrounds,
a company that designs and installs premium indoor playgrounds across Canada and the United States.
You write concise, warm, high-converting B2B outreach for organizations that serve children and families
(YMCAs, recreation & community centres, churches, daycares, schools, museums, family entertainment centres,
resorts, and family-serving organizations that do not yet have a playground).

Voice: confident, helpful, specific, never pushy. Lead with the prospect's mission and the value to the
families they serve, not with product features. Reference relevant Orca Coast projects as social proof.
Keep first-touch emails under 130 words. Always include one clear call to action.`;

const EMAIL_GUIDANCE: Record<EmailType, string> = {
  first_touch:
    "A first-touch cold email. Open with a specific, relevant observation about their organization. Connect their mission to a family play experience. Cite one similar Orca Coast project. End with a low-friction CTA (a 15-minute call).",
  follow_up:
    "A short follow-up to a previous unanswered email. Add one new angle or stat. Stay friendly and brief.",
  value:
    "A value email that shares a useful insight (e.g., how a playground drives membership / attendance / dwell time) with no hard ask.",
  case_study:
    "A case-study email centred on a similar Orca Coast project: the challenge, what was installed, and the measurable outcome. CTA to share the full case study.",
  final_check_in:
    "A polite final check-in (break-up email). Acknowledge timing may be off, leave the door open, and make it easy to re-engage later.",
};

export interface EmailPromptContext {
  lead: Lead;
  emailType: EmailType;
  campaignFocus: string[];
  similarProject?: OrcaProject;
}

export function buildEmailPrompt(ctx: EmailPromptContext): string {
  const { lead, emailType, campaignFocus, similarProject } = ctx;
  const dm = lead.contacts.find((c) => c.isDecisionMaker) ?? lead.contacts[0];
  return [
    `Write ${EMAIL_GUIDANCE[emailType]}`,
    ``,
    `Organization: ${lead.name}`,
    `Industry: ${industryLabel(lead.industry)}`,
    `City: ${lead.address.city}, ${lead.address.region}, ${lead.address.country}`,
    dm ? `Recipient: ${dm.name}, ${dm.role}` : `Recipient: the facility decision maker`,
    `Campaign focus points: ${campaignFocus.join(", ")}`,
    similarProject
      ? `Similar Orca Coast project to reference: ${similarProject.name} (${similarProject.city}, ${similarProject.region}) — ${similarProject.summary}`
      : `No specific reference project; speak generally to Orca Coast's portfolio.`,
    ``,
    `Return JSON with keys: subject, body, cta, objectionHandling.`,
  ].join("\n");
}

export function buildProposalPrompt(lead: Lead, similarProject?: OrcaProject): string {
  return [
    `Draft a project proposal summary for an indoor playground installation.`,
    `Organization: ${lead.name} (${industryLabel(lead.industry)}), ${lead.address.city}, ${lead.address.region}.`,
    `Facility size: ${lead.signals.facilitySqFt ?? "unknown"} sq ft. Locations: ${lead.signals.locationCount ?? 1}.`,
    similarProject ? `Comparable Orca Coast project: ${similarProject.name} — ${similarProject.summary}.` : ``,
    `Include: project summary, recommended playground concept, scope of work, and a budget estimate range.`,
  ]
    .filter(Boolean)
    .join("\n");
}
