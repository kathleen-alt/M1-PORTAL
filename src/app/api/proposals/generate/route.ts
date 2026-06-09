import { NextResponse } from "next/server";
import { getLead, getProjects } from "@/lib/store";
import { findLookalikes } from "@/lib/prospecting/lookalike";
import { generateProposal } from "@/lib/ai/email";

export const dynamic = "force-dynamic";

/** POST /api/proposals/generate — Body: { leadId } */
export async function POST(req: Request) {
  const { leadId } = (await req.json()) as { leadId: string };
  const lead = getLead(leadId);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const similarProject = findLookalikes(lead, getProjects(), 1)[0]?.project;
  const proposal = generateProposal(lead, similarProject);
  return NextResponse.json({ proposal, similarProject });
}
