import { NextResponse } from "next/server";
import { sourceLeads } from "@/lib/sources/overpass";
import { addLeads } from "@/lib/store";
import { recommendLead } from "@/lib/prospecting/recommend";
import { getProjects } from "@/lib/store";
import type { Country } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/discovery/source
 * Body: { city, region, country, categories: string[], commit? }
 * Pulls real organizations from OpenStreetMap, classifies + scores them, and
 * (when commit:true) adds them to the CRM.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    city?: string;
    region?: string;
    country?: Country;
    categories?: string[];
    commit?: boolean;
  };
  if (!body.city || !body.region || !body.country) {
    return NextResponse.json(
      { error: "city, region, and country are required" },
      { status: 400 },
    );
  }

  const result = await sourceLeads({
    city: body.city,
    region: body.region,
    country: body.country,
    categories: body.categories ?? [],
  });

  const projects = getProjects();
  const scored = result.leads.map((lead) => {
    const rec = recommendLead(lead, projects);
    return {
      name: lead.name,
      industry: lead.industry,
      city: lead.address.city,
      region: lead.address.region,
      website: lead.website,
      opportunity: rec.scores.opportunity,
      category: rec.category,
    };
  });

  let added = 0;
  let skipped = 0;
  if (body.commit && result.leads.length) {
    const r = addLeads(result.leads);
    added = r.added;
    skipped = r.skipped;
  }

  return NextResponse.json({
    source: result.source,
    note: result.note,
    found: result.leads.length,
    scored,
    added,
    skipped,
  });
}
