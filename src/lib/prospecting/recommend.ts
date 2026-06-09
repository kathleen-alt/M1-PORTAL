// ---------------------------------------------------------------------------
// The Prospect Recommendation Engine — the platform's most important feature.
//
// Given a set of leads and Orca Coast's historical projects, it produces
// ranked recommendations that answer "who should we contact this week?",
// each with scores, value estimates, decision makers, lookalikes, and a
// human-readable rationale.
// ---------------------------------------------------------------------------

import type {
  Lead,
  OrcaProject,
  ProspectRecommendation,
  Tier,
} from "../types";
import { INDUSTRY_META, industryLabel } from "../taxonomy";
import {
  closeProbability,
  computeScores,
  estimateValue,
  qualifyLead,
} from "./scoring";
import { findLookalikes } from "./lookalike";

/** Build a full recommendation for a single lead. */
export function recommendLead(
  lead: Lead,
  projects: OrcaProject[],
): ProspectRecommendation {
  const scores = computeScores(lead);
  const { score: leadScore, category } = qualifyLead(lead);
  const estimatedValue = estimateValue(lead.industry, lead.signals);
  const lookalikes = findLookalikes(lead, projects);
  const prob = closeProbability(scores);
  const decisionMakers = lead.contacts.filter((c) => c.isDecisionMaker);

  return {
    lead,
    scores,
    leadScore,
    category,
    estimatedValue,
    closeProbability: prob,
    reasons: buildReasons(lead, scores, lookalikes[0]?.project),
    lookalikes,
    decisionMakers,
  };
}

function buildReasons(
  lead: Lead,
  scores: ReturnType<typeof computeScores>,
  topMatch?: OrcaProject,
): string[] {
  const reasons: string[] = [];
  const meta = INDUSTRY_META[lead.industry];

  reasons.push(`${industryLabel(lead.industry)} — Tier ${meta.tier} prospect.`);

  if (topMatch) {
    const loc = topMatch.city ? `${topMatch.city}, ${topMatch.region}` : topMatch.region;
    reasons.push(
      `Similar to ${topMatch.name} (${loc}), a ${formatMoney(topMatch.contractValue)} project.`,
    );
  }
  if (scores.budgetLikelihood >= 70) reasons.push("Strong budget likelihood.");
  if (scores.familyTraffic >= 75) reasons.push("High family foot traffic.");
  if (scores.decisionMakerAccess >= 70)
    reasons.push("Decision makers are reachable.");
  if (lead.signals.growthIndicators?.length)
    reasons.push(`Growth signals: ${lead.signals.growthIndicators.join(", ")}.`);
  if (meta.tier === 6)
    reasons.push("Hidden opportunity — serves families but likely lacks a playground.");

  return reasons;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface RecommendOptions {
  tiers?: Tier[];
  minOpportunity?: number;
  region?: string;
  country?: string;
  limit?: number;
  /** Exclude leads already advanced past these stages. */
  excludeStages?: string[];
}

/**
 * Rank a pool of leads into recommendations. Sorted by opportunity score, then
 * close probability. This is what the "Who Should We Contact This Week?" and
 * "AI Territory Manager (Top 100)" views consume.
 */
export function recommendProspects(
  leads: Lead[],
  projects: OrcaProject[],
  opts: RecommendOptions = {},
): ProspectRecommendation[] {
  let recs = leads.map((l) => recommendLead(l, projects));

  if (opts.tiers?.length) recs = recs.filter((r) => opts.tiers!.includes(r.scores.tier));
  if (opts.minOpportunity != null)
    recs = recs.filter((r) => r.scores.opportunity >= opts.minOpportunity!);
  if (opts.region) recs = recs.filter((r) => r.lead.address.region === opts.region);
  if (opts.country) recs = recs.filter((r) => r.lead.address.country === opts.country);
  if (opts.excludeStages?.length)
    recs = recs.filter((r) => !opts.excludeStages!.includes(r.lead.stage));

  recs.sort(
    (a, b) =>
      b.scores.opportunity - a.scores.opportunity ||
      b.closeProbability - a.closeProbability,
  );

  return opts.limit ? recs.slice(0, opts.limit) : recs;
}

// --- Market Expansion Finder --------------------------------------------

export interface MarketExpansionInsight {
  tier: Tier;
  industry: string;
  penetration: "none" | "low" | "moderate" | "strong";
  pastProjects: number;
  openLeads: number;
  estimatedMarketSize: number;
  recommendation: string;
}

/**
 * Compare where Orca Coast has WON business against where open leads exist to
 * surface under-penetrated categories worth a dedicated campaign.
 */
export function marketExpansion(
  leads: Lead[],
  projects: OrcaProject[],
): MarketExpansionInsight[] {
  const industries = new Set<string>([
    ...projects.map((p) => p.industry),
    ...leads.map((l) => l.industry),
  ]);

  const insights: MarketExpansionInsight[] = [];
  for (const industry of industries) {
    const pastProjects = projects.filter((p) => p.industry === industry).length;
    const openLeads = leads.filter((l) => l.industry === industry).length;
    const meta = INDUSTRY_META[industry as keyof typeof INDUSTRY_META];
    if (!meta) continue;

    const penetration =
      pastProjects === 0 ? "none" : pastProjects === 1 ? "low" : pastProjects <= 3 ? "moderate" : "strong";

    // Rough addressable market estimate by tier (organizations in CA+US).
    const tierMarket: Record<number, number> = {
      1: 4200,
      2: 38000,
      3: 900,
      4: 6500,
      5: 21000,
      6: 52000,
    };
    const estimatedMarketSize = Math.round((tierMarket[meta.tier] ?? 1000) / 12);

    let recommendation = "";
    if (penetration === "none" && openLeads > 0) {
      recommendation = `Untapped: ${openLeads} open lead(s) in ${meta.label} but no closed projects yet. Launch a dedicated outreach campaign.`;
    } else if (penetration === "low") {
      recommendation = `Low penetration in ${meta.label}. Strong category to expand — build a vertical campaign.`;
    } else if (penetration === "moderate") {
      recommendation = `Proven in ${meta.label}. Scale outreach to capture more share.`;
    } else {
      recommendation = `Strong presence in ${meta.label}. Use as reference accounts for adjacent tiers.`;
    }

    insights.push({
      tier: meta.tier,
      industry: meta.label,
      penetration,
      pastProjects,
      openLeads,
      estimatedMarketSize,
      recommendation,
    });
  }

  // Surface the biggest gaps first: proven-adjacent categories with low/no
  // penetration and the largest market.
  return insights.sort((a, b) => {
    const rank = { none: 0, low: 1, moderate: 2, strong: 3 } as const;
    return rank[a.penetration] - rank[b.penetration] || b.estimatedMarketSize - a.estimatedMarketSize;
  });
}

// --- Opportunity Heat Map ------------------------------------------------

export interface HeatMapCell {
  region: string;
  country: string;
  leadCount: number;
  avgOpportunity: number;
  totalPotential: number; // sum of high-end estimates
  hotLeads: number;
}

export function opportunityHeatMap(
  leads: Lead[],
  projects: OrcaProject[],
): HeatMapCell[] {
  const byRegion = new Map<string, HeatMapCell>();

  for (const lead of leads) {
    const rec = recommendLead(lead, projects);
    const key = `${lead.address.country}:${lead.address.region}`;
    const cell =
      byRegion.get(key) ??
      ({
        region: lead.address.region,
        country: lead.address.country,
        leadCount: 0,
        avgOpportunity: 0,
        totalPotential: 0,
        hotLeads: 0,
      } as HeatMapCell);

    cell.leadCount += 1;
    cell.avgOpportunity += rec.scores.opportunity;
    cell.totalPotential += rec.estimatedValue.high;
    if (rec.scores.opportunity >= 80) cell.hotLeads += 1;
    byRegion.set(key, cell);
  }

  const cells = Array.from(byRegion.values()).map((c) => ({
    ...c,
    avgOpportunity: Math.round(c.avgOpportunity / c.leadCount),
  }));

  return cells.sort((a, b) => b.totalPotential - a.totalPotential);
}
