import { NextResponse } from "next/server";
import { updateLeadStage } from "@/lib/store";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { stage } = (await req.json()) as { stage?: PipelineStage };
  if (!stage || !PIPELINE_STAGES.includes(stage)) {
    return NextResponse.json({ error: "valid stage required" }, { status: 400 });
  }
  const lead = updateLeadStage(params.id, stage);
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
