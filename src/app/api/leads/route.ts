import { NextResponse } from "next/server";
import { addLead, getLeads, getProjects } from "@/lib/store";
import { recommendLead } from "@/lib/prospecting/recommend";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = getProjects();
  const leads = getLeads().map((lead) => ({
    lead,
    recommendation: recommendLead(lead, projects),
  }));
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Lead>;
  if (!body.name || !body.industry || !body.address) {
    return NextResponse.json(
      { error: "name, industry, and address are required" },
      { status: 400 },
    );
  }
  const lead: Lead = {
    id: body.id ?? `lead_${Date.now()}`,
    name: body.name,
    industry: body.industry,
    website: body.website,
    phone: body.phone,
    address: body.address,
    contacts: body.contacts ?? [],
    signals: body.signals ?? {},
    dataConfidence: body.dataConfidence ?? 50,
    source: body.source ?? "manual",
    stage: body.stage ?? "New Lead",
    createdAt: new Date().toISOString(),
    notes: body.notes,
  };
  addLead(lead);
  return NextResponse.json({ lead }, { status: 201 });
}
