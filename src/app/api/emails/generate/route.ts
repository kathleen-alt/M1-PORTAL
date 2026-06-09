import { NextResponse } from "next/server";
import { getLead, getProjects } from "@/lib/store";
import { findLookalikes } from "@/lib/prospecting/lookalike";
import { generateEmail, generateEmailSequence } from "@/lib/ai/email";
import { CAMPAIGN_TEMPLATES } from "@/lib/data/campaigns";
import type { EmailType } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/emails/generate
 * Body: { leadId, emailType?, sequence?, campaignFocus? }
 * If sequence=true, returns the full cadence email set.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    leadId: string;
    emailType?: EmailType;
    sequence?: boolean;
    campaignFocus?: string[];
  };

  const lead = getLead(body.leadId);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const similarProject = findLookalikes(lead, getProjects(), 1)[0]?.project;
  const focus = body.campaignFocus ?? CAMPAIGN_TEMPLATES[3].focusPoints;

  if (body.sequence) {
    const emails = await generateEmailSequence(lead, focus, similarProject);
    return NextResponse.json({ emails });
  }

  const email = await generateEmail({
    lead,
    emailType: body.emailType ?? "first_touch",
    campaignFocus: focus,
    similarProject,
  });
  return NextResponse.json({ email });
}
