import { NextResponse } from "next/server";
import { getLeads, getProjects } from "@/lib/store";
import { recommendProspects } from "@/lib/prospecting/recommend";
import type { Tier } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/prospects/recommendations
 * Query params: tiers (csv 1-6), minOpportunity, region, country, limit
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tiers = url.searchParams
    .get("tiers")
    ?.split(",")
    .map((t) => Number(t) as Tier)
    .filter((t) => t >= 1 && t <= 6);

  const recommendations = recommendProspects(getLeads(), getProjects(), {
    tiers: tiers?.length ? tiers : undefined,
    minOpportunity: url.searchParams.has("minOpportunity")
      ? Number(url.searchParams.get("minOpportunity"))
      : undefined,
    region: url.searchParams.get("region") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
    excludeStages: ["Closed Won", "Closed Lost"],
  });

  return NextResponse.json({ count: recommendations.length, recommendations });
}
