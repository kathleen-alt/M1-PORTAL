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
import { INDUSTRY_META } from "../src/lib/taxonomy";
import { findLookalikes } from "../src/lib/prospecting/lookalike";

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

  // Industry metadata + full lead records for the interactive in-browser app.
  const industryMeta: Record<string, any> = {};
  for (const ind of ALL_INDUSTRIES) {
    const m = INDUSTRY_META[ind];
    industryMeta[ind] = { label: m.label, tier: m.tier, baseLow: m.baseValue.low, baseHigh: m.baseValue.high, childFocused: m.childFocused };
  }

  // A few illustrative "freshly sourced" raw prospects (empty signals / no
  // contacts) so the interactive demo can show what Enrich does to a new lead.
  const rawProspects = [
    { name: "Northwood Community Centre", industry: "community_center", city: "Surrey", region: "BC", country: "CA" as const, website: "northwoodcc.ca" },
    { name: "Cornerstone Family Church", industry: "large_church", city: "Mississauga", region: "ON", country: "CA" as const, website: "cornerstonefamily.ca" },
    { name: "Bright Horizons Childcare", industry: "daycare", city: "Ottawa", region: "ON", country: "CA" as const, website: "brighthorizonsott.ca" },
    { name: "Lakeview Family YMCA", industry: "ymca", city: "Hamilton", region: "ON", country: "CA" as const, website: "lakeviewymca.ca" },
  ].map((r, i) => {
    const lead = {
      id: `src_${i}`,
      name: r.name,
      industry: r.industry as any,
      website: r.website,
      phone: undefined,
      address: { city: r.city, region: r.region, country: r.country },
      contacts: [],
      signals: {},
      dataConfidence: 55,
      source: "google_maps" as const,
      stage: "New Lead" as const,
      createdAt: new Date().toISOString(),
    };
    return {
      ...lead,
      socials: {},
      lookalikes: findLookalikes(lead as any, projects, 3).map((m) => ({
        name: m.project.name,
        similarity: m.similarity,
        reasons: m.reasons,
      })),
    };
  });

  const fullLeads = leads.map((l) => ({
    id: l.id,
    name: l.name,
    industry: l.industry,
    website: l.website,
    phone: l.phone,
    address: l.address,
    contacts: l.contacts,
    signals: l.signals,
    socials: l.socials ?? {},
    dataConfidence: l.dataConfidence,
    source: l.source,
    stage: l.stage,
    lookalikes: findLookalikes(l, projects, 3).map((m) => ({
      name: m.project.name,
      similarity: m.similarity,
      reasons: m.reasons,
    })),
  }));
  fullLeads.push(...(rawProspects as any));

  // A sample sequence enrollment for the top recommendation: cadence steps with
  // due dates and pre-generated emails — demonstrates "move into a sequence".
  const top = recs[0];
  const cadence = CAMPAIGN_TEMPLATES[3].cadence;
  const start = Date.now();
  const sampleSequence = {
    leadName: top.lead.name,
    campaignName: "Recreation & Community Campaign",
    steps: await Promise.all(
      cadence.map(async (step) => {
        let subject: string | undefined;
        let body: string | undefined;
        if (step.channel === "email" && step.emailType) {
          const e = await generateEmail({
            lead: top.lead,
            emailType: step.emailType,
            campaignFocus: CAMPAIGN_TEMPLATES[3].focusPoints,
            similarProject: top.lookalikes[0]?.project,
          });
          subject = e.subject;
          body = e.body;
        }
        return {
          day: step.day,
          channel: step.channel,
          label: step.label,
          dueAt: new Date(start + step.day * 86_400_000).toISOString(),
          subject,
          body,
        };
      }),
    ),
  };

  const data = {
    generatedAt: new Date().toISOString(),
    taxonomy,
    industryMeta,
    leads: fullLeads,
    sampleSequence,
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
