import { NextResponse } from "next/server";
import { getEnrollments } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/enrollments?leadId= — list sequence enrollments. */
export async function GET(req: Request) {
  const leadId = new URL(req.url).searchParams.get("leadId") ?? undefined;
  return NextResponse.json({ enrollments: getEnrollments(leadId) });
}
