import { NextResponse } from "next/server";
import { enrollLead, getLead } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST /api/leads/:id/enroll — Body: { campaignId }. Moves a lead into a sequence. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getLead(params.id)) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  const { campaignId } = (await req.json()) as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const enrollment = await enrollLead(params.id, campaignId);
  if (!enrollment) return NextResponse.json({ error: "could not enroll" }, { status: 400 });
  return NextResponse.json({ enrollment }, { status: 201 });
}
