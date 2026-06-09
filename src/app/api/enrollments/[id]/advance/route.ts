import { NextResponse } from "next/server";
import { advanceEnrollment, getEnrollment, setEnrollmentStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/enrollments/:id/advance
 * Body: { action: "sent" | "skipped" | "pause" | "resume" }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getEnrollment(params.id))
    return NextResponse.json({ error: "enrollment not found" }, { status: 404 });
  const { action } = (await req.json()) as { action?: string };

  if (action === "pause") return NextResponse.json({ enrollment: setEnrollmentStatus(params.id, "paused") });
  if (action === "resume") return NextResponse.json({ enrollment: setEnrollmentStatus(params.id, "active") });

  const { enrollment, dispatch } = await advanceEnrollment(
    params.id,
    action === "skipped" ? "skipped" : "sent",
  );
  return NextResponse.json({ enrollment, dispatch });
}
