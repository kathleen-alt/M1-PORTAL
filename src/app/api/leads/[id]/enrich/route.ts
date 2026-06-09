import { NextResponse } from "next/server";
import { getLead, addActivity } from "@/lib/store";
import { enrichLead } from "@/lib/enrich";

export const dynamic = "force-dynamic";

/** POST /api/leads/:id/enrich — run all enrichment sources against a lead. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = getLead(params.id);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const report = await enrichLead(lead);
  addActivity(
    lead.id,
    "note",
    `Enriched (${report.sources.join(", ") || "estimates"}): +${report.contactsAdded.length} contact(s), opportunity ${report.opportunityBefore}→${report.opportunityAfter}.`,
  );
  return NextResponse.json({ report, lead });
}
