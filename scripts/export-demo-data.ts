// Exports the live engine output (real portfolio + scored recommendations) to
// a JSON blob that gets inlined into a self-contained static demo.html.
import { getLeads, getProjects } from "../src/lib/store";
import {
  recommendProspects,
  marketExpansion,
  opportunityHeatMap,
} from "../src/lib/prospecting/recommend";
import { computeAnalytics } from "../src/lib/analytics";
import { generateEmail } from "../src/lib/ai/email";
import { CAMPAIGN_TEMPLATES } from "../src/lib/data/campaigns";
import { industryLabel, ALL_INDUSTRIES, industryTier } from "../src/lib/taxonomy";

function focusFor(industry: string): string[] {
  if (industry.includes("church")) return CAMPAIGN_TEMPLATES[1].focusPoints;
  if (industry.includes("daycare") || industry.includes("preschool") || industry.includes("childcare"))
    return CAMPAIGN_TEMPLATES[2].focusPoints;
  if (industry === "ymca") return CAMPAIGN_TEMPLATES[0].focusPoints;
  return CAMPAIGN_TEMPLATES[3].focusPoints;
}

async function main() {
  const leads = getLeads();
  const projects = getProjects();
  const recs = recommendProspects(leads, projects, {
    excludeStages: ["Closed Won", "Closed Lost"],
  });

  const recsWithEmail = await Promise.all(
    recs.map(async (r) => {
      const email = await generateEmail({
        lead: r.lead,
        emailType: "first_touch",
        campaignFocus: focusFor(r.lead.industry),
        similarProject: r.lookalikes[0]?.project,
      });
      return {
        id: r.lead.id,
        name: r.lead.name,
        industry: industryLabel(r.lead.industry),
        city: r.lead.address.city,
        region: r.lead.address.region,
        country: r.lead.address.country,
        website: r.lead.website,
        phone: r.lead.phone,
        stage: r.lead.stage,
        scores: r.scores,
        leadScore: r.leadScore,
        category: r.category,
        estimatedValue: r.estimatedValue,
        closeProbability: r.closeProbability,
        reasons: r.reasons,
        decisionMakers: r.decisionMakers.map((c) => ({
          name: c.name,
          role: c.role,
          email: c.email,
          phone: c.phone,
        })),
        lookalikes: r.lookalikes.map((m) => ({
          name: m.project.name,
          similarity: m.similarity,
          reasons: m.reasons,
        })),
        email,
      };
    }),
  );

  const taxonomy: Record<string, { label: string; tier: number }> = {};
  for (const ind of ALL_INDUSTRIES) taxonomy[ind] = { label: industryLabel(ind), tier: industryTier(ind) };

  const data = {
    generatedAt: new Date().toISOString(),
    taxonomy,
    analytics: computeAnalytics(leads),
    recommendations: recsWithEmail,
    market: marketExpansion(leads, projects),
    heatmap: opportunityHeatMap(leads, projects),
    campaigns: CAMPAIGN_TEMPLATES,
    portfolio: projects.map((p) => ({
      name: p.name,
      industry: industryLabel(p.industry),
      city: p.city,
      region: p.region,
      country: p.country,
      website: p.website,
      value: p.contractValue,
      year: p.year,
    })),
  };

  process.stdout.write(JSON.stringify(data));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
