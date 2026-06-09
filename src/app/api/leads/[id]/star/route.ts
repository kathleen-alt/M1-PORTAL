import { NextResponse } from "next/server";
import { setStar } from "@/lib/store";

export const dynamic = "force-dynamic";

/** PATCH /api/leads/:id/star — Body: { starred? } (toggles when omitted). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let starred: boolean | undefined;
  try {
    starred = (await req.json())?.starred;
  } catch {
    /* toggle */
  }
  const lead = setStar(params.id, starred);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  return NextResponse.json({ id: lead.id, starred: !!lead.starred });
}
