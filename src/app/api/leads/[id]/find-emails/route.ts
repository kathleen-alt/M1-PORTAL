import { NextResponse } from "next/server";
import { getLead, addActivity } from "@/lib/store";
import { findEmailsForLead } from "@/lib/sources/emailFinder";

export const dynamic = "force-dynamic";

/** POST /api/leads/:id/find-emails — infer/verify contact emails for a lead. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = getLead(params.id);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const result = await findEmailsForLead(lead);
  if (result.filled.length) {
    addActivity(lead.id, "note", `Found ${result.filled.length} contact email(s).`);
  }
  return NextResponse.json({ ...result, contacts: lead.contacts });
}
