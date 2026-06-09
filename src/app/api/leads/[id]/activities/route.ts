import { NextResponse } from "next/server";
import { addActivity, getActivities, getLead } from "@/lib/store";
import type { ActivityType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: ActivityType[] = ["note", "email", "call", "linkedin", "sms", "meeting", "stage_change"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getLead(params.id)) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  return NextResponse.json({ activities: getActivities(params.id) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getLead(params.id)) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  const { type, summary } = (await req.json()) as { type?: ActivityType; summary?: string };
  if (!type || !TYPES.includes(type) || !summary?.trim()) {
    return NextResponse.json({ error: "valid type and summary required" }, { status: 400 });
  }
  const activity = addActivity(params.id, type, summary.trim());
  return NextResponse.json({ activity }, { status: 201 });
}
