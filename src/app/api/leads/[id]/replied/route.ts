import { NextResponse } from "next/server";
import { getLead, markReplied } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/replied
 * Body: { detail? }. Marks a prospect reply: pauses active sequences and moves
 * the lead to "Responded". A Gmail reply-watcher (or the rep) calls this.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getLead(params.id)) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  let detail: string | undefined;
  try {
    detail = (await req.json())?.detail;
  } catch {
    /* body optional */
  }
  const result = markReplied(params.id, detail);
  return NextResponse.json({ ok: true, ...result });
}
