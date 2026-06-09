// ---------------------------------------------------------------------------
// AI Email & Proposal generation.
//
// Provider abstraction: if OPENAI_API_KEY is present we call OpenAI with the
// prompts from prompts.ts; otherwise we fall back to a deterministic template
// engine that produces personalized, ready-to-send copy offline. This keeps
// the whole app functional with zero external dependencies.
// ---------------------------------------------------------------------------

import type {
  EmailType,
  GeneratedEmail,
  Lead,
  OrcaProject,
} from "../types";
import { industryLabel } from "../taxonomy";
import { estimateValue } from "../prospecting/scoring";
import {
  SALES_SYSTEM_PROMPT,
  buildEmailPrompt,
  buildProposalPrompt,
  type EmailPromptContext,
} from "./prompts";

function money(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function firstName(full: string): string {
  return full.replace(/^(Dr\.|Pastor|Mr\.|Ms\.|Mrs\.)\s+/i, "").split(" ")[0];
}

// --- Deterministic template engine --------------------------------------

function templateEmail(ctx: EmailPromptContext): GeneratedEmail {
  const { lead, emailType, similarProject } = ctx;
  const dm = lead.contacts.find((c) => c.isDecisionMaker) ?? lead.contacts[0];
  const greeting = dm ? `Hi ${firstName(dm.name)},` : "Hello,";
  const industry = industryLabel(lead.industry).toLowerCase();
  const ref = similarProject
    ? `${similarProject.name} in ${similarProject.city}`
    : "comparable organizations across Canada and the U.S.";
  const cta = "Would you be open to a quick 15-minute call next week?";

  switch (emailType) {
    case "first_touch":
      return {
        type: emailType,
        subject: `A play space families at ${lead.name} would love`,
        body: `${greeting}

I lead business development at Orca Coast Playgrounds — we design and install indoor playgrounds for ${industry}s like ${lead.name}. We recently completed a project for ${ref}, and the response from families has been remarkable.

Given everything happening at ${lead.name} in ${lead.address.city}, I think there's a real opportunity to create a destination play experience that drives engagement and keeps families coming back.

${cta}`,
        cta,
        objectionHandling:
          "If budget is a concern, we scope projects in phases and can work to a defined capital budget.",
      };
    case "follow_up":
      return {
        type: emailType,
        subject: `Following up — indoor play at ${lead.name}`,
        body: `${greeting}

Circling back on my note about an indoor playground for ${lead.name}. One thing worth sharing: organizations we work with typically see measurably higher family visit frequency within the first season.

Happy to send a few concepts tailored to your space. ${cta}`,
        cta,
      };
    case "value":
      return {
        type: emailType,
        subject: `How play space drives family engagement`,
        body: `${greeting}

A quick insight from our work with ${industry}s: a well-designed indoor playground is one of the highest-ROI family amenities you can add — it increases dwell time, repeat visits, and word-of-mouth among parents.

No ask here — just thought it might be useful as you plan. I'm glad to be a resource whenever the timing is right.`,
        cta: "Reply anytime — I'm happy to help.",
      };
    case "case_study":
      return {
        type: emailType,
        subject: `Case study: ${similarProject?.name ?? "a project like yours"}`,
        body: `${greeting}

I thought ${similarProject?.name ?? "this"} might resonate. ${
          similarProject
            ? `${similarProject.summary} The installation became a centrepiece for the families they serve.`
            : "We designed a themed indoor playground that became a centrepiece for the families our client serves."
        }

I'd love to share the full case study and walk through what a similar concept could look like for ${lead.name}. ${cta}`,
        cta,
      };
    case "final_check_in":
      return {
        type: emailType,
        subject: `Should I close the loop?`,
        body: `${greeting}

I haven't heard back, so I'll assume the timing isn't right for an indoor playground at ${lead.name} just yet — totally understand.

I'll leave the door open. Whenever families and facilities are on the agenda again, I'd be glad to help. Wishing you a great season.`,
        cta: "Just reply when the time is right.",
      };
  }
}

// --- OpenAI provider (used when OPENAI_API_KEY is set) -------------------

async function openAiEmail(ctx: EmailPromptContext): Promise<GeneratedEmail | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SALES_SYSTEM_PROMPT },
          { role: "user", content: buildEmailPrompt(ctx) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      type: ctx.emailType,
      subject: parsed.subject ?? "",
      body: parsed.body ?? "",
      cta: parsed.cta ?? "",
      objectionHandling: parsed.objectionHandling,
    };
  } catch {
    return null;
  }
}

export async function generateEmail(ctx: EmailPromptContext): Promise<GeneratedEmail> {
  const ai = await openAiEmail(ctx);
  return ai ?? templateEmail(ctx);
}

/** Generate the full set of cadence emails for a lead at once. */
export async function generateEmailSequence(
  lead: Lead,
  campaignFocus: string[],
  similarProject?: OrcaProject,
): Promise<GeneratedEmail[]> {
  const types: EmailType[] = [
    "first_touch",
    "follow_up",
    "case_study",
    "final_check_in",
    "value",
  ];
  return Promise.all(
    types.map((emailType) =>
      generateEmail({ lead, emailType, campaignFocus, similarProject }),
    ),
  );
}

// --- AI Proposal Assistant -----------------------------------------------

export interface GeneratedProposal {
  summary: string;
  concept: string;
  scope: string[];
  budgetEstimate: { low: number; high: number };
  budgetNarrative: string;
}

export function generateProposal(
  lead: Lead,
  similarProject?: OrcaProject,
): GeneratedProposal {
  const value = estimateValue(lead.industry, lead.signals);
  const sqft = lead.signals.facilitySqFt;
  return {
    summary: `Orca Coast Playgrounds proposes a custom indoor playground for ${lead.name}, a ${industryLabel(
      lead.industry,
    ).toLowerCase()} in ${lead.address.city}, ${lead.address.region}. The installation is designed to increase family engagement, repeat visits, and the organization's standing as a family destination.`,
    concept: similarProject
      ? `Modeled on our work at ${similarProject.name}: ${similarProject.summary} We recommend a comparable concept scaled to your space.`
      : `We recommend a multi-zone structure with dedicated toddler and youth areas, themed to reflect your brand and community.`,
    scope: [
      "Site assessment and 3D design concepts",
      `Custom playground structure${sqft ? ` sized for ~${sqft.toLocaleString()} sq ft` : ""}`,
      "Safety surfacing and ASTM/CSA-compliant components",
      "Manufacturing, delivery, and professional installation",
      "Warranty and ongoing maintenance plan",
    ],
    budgetEstimate: value,
    budgetNarrative: `Based on comparable installations, we estimate a budget range of ${money(
      value.low,
    )}–${money(value.high)}. Scope can be phased to align with capital planning.`,
  };
}

export { buildProposalPrompt };
