// ---------------------------------------------------------------------------
// Revenue Opportunity Scoring Engine.
//
// This is the analytical core of the platform. Every score below is computed
// with deterministic, explainable logic from organization signals — no random
// numbers. Each function returns a 0-100 value and the combiners document the
// weights they apply so the output is auditable.
// ---------------------------------------------------------------------------

import type {
  Contact,
  Industry,
  Lead,
  LeadCategory,
  OpportunityScores,
  OrgSignals,
} from "../types";
import { INDUSTRY_META, industryTier } from "../taxonomy";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

/**
 * Tier contributes a baseline fit. Tier 1 starts high; Tier 6 starts modest
 * because the opportunity is real but unproven for that category.
 */
const TIER_BASE_FIT: Record<number, number> = {
  1: 80,
  2: 68,
  3: 60,
  4: 58,
  5: 48,
  6: 40,
};

/**
 * Playground Fit Score — how well the organization matches the kind of
 * customer that buys an indoor playground from Orca Coast.
 */
export function playgroundFitScore(industry: Industry, signals: OrgSignals): number {
  const meta = INDUSTRY_META[industry];
  let score = TIER_BASE_FIT[meta.tier] ?? 40;

  // Child-focused organizations are dramatically better fits.
  if (signals.childFocused ?? meta.childFocused) score += 8;
  else score -= 6;

  // Larger facilities have the floor space for a meaningful install.
  if (signals.facilitySqFt) {
    if (signals.facilitySqFt >= 40_000) score += 8;
    else if (signals.facilitySqFt >= 15_000) score += 4;
    else if (signals.facilitySqFt < 5_000) score -= 6;
  }

  // Multi-location operators can standardize on Orca Coast across sites.
  if (signals.locationCount && signals.locationCount > 1) {
    score += Math.min(8, signals.locationCount * 2);
  }

  // An existing play area means the need is already validated, but reduces
  // the immediate greenfield opportunity slightly.
  if (signals.hasExistingPlayArea) score -= 4;

  return round(clamp(score));
}

/** Budget Likelihood Score — can they fund a six-figure capital project? */
export function budgetLikelihoodScore(signals: OrgSignals): number {
  let score = 50;

  switch (signals.annualBudgetBand) {
    case "over_10m":
      score = 92;
      break;
    case "2m_10m":
      score = 80;
      break;
    case "500k_2m":
      score = 62;
      break;
    case "under_500k":
      score = 38;
      break;
    default:
      // Infer from org size when no budget band is known.
      if (signals.orgSize) {
        if (signals.orgSize >= 200) score = 78;
        else if (signals.orgSize >= 50) score = 64;
        else if (signals.orgSize >= 15) score = 52;
        else score = 42;
      }
  }

  // Growth signals (capital campaigns, new construction, grants) raise budget
  // confidence — these organizations are actively spending.
  if (signals.growthIndicators?.length) {
    score += Math.min(12, signals.growthIndicators.length * 5);
  }

  return round(clamp(score));
}

/** Family Traffic Score — volume of families who would use the playground. */
export function familyTrafficScore(industry: Industry, signals: OrgSignals): number {
  const meta = INDUSTRY_META[industry];
  let score = (signals.childFocused ?? meta.childFocused) ? 60 : 35;

  if (signals.weeklyFamilyTraffic) {
    if (signals.weeklyFamilyTraffic >= 3_000) score = 95;
    else if (signals.weeklyFamilyTraffic >= 1_000) score = 82;
    else if (signals.weeklyFamilyTraffic >= 300) score = 68;
    else score = 50;
  }

  // Multiple locations multiply family reach.
  if (signals.locationCount && signals.locationCount > 1) score += 5;

  return round(clamp(score));
}

/**
 * Decision Maker Accessibility Score — how reachable are the people who can
 * say yes? Driven by how many decision-makers we have, and the completeness
 * and confidence of their contact data.
 */
export function decisionMakerAccessScore(contacts: Contact[]): number {
  const decisionMakers = contacts.filter((c) => c.isDecisionMaker);
  if (decisionMakers.length === 0) {
    // Fall back to any contact at all.
    if (contacts.length === 0) return 15;
    return 35;
  }

  // Average reachability across decision-makers.
  const perContact = decisionMakers.map((c) => {
    let s = c.confidence * 0.5; // data confidence is half the weight
    if (c.email) s += 25;
    if (c.phone) s += 15;
    if (c.linkedin) s += 10;
    return clamp(s);
  });

  const avg = perContact.reduce((a, b) => a + b, 0) / perContact.length;
  // More than one reachable decision-maker is a meaningful bonus.
  const breadthBonus = Math.min(10, (decisionMakers.length - 1) * 5);
  return round(clamp(avg + breadthBonus));
}

/** Revenue Potential Score — scaled from the estimated deal value. */
export function revenuePotentialScore(industry: Industry, signals: OrgSignals): number {
  const { high } = estimateValue(industry, signals);
  // Map $50k..$700k onto roughly 40..98.
  const score = 40 + ((high - 50_000) / (700_000 - 50_000)) * 58;
  return round(clamp(score));
}

/**
 * Estimate the installed playground value for an account by adjusting the
 * industry base band with facility-size and multi-location multipliers.
 */
export function estimateValue(
  industry: Industry,
  signals: OrgSignals,
): { low: number; high: number } {
  const base = INDUSTRY_META[industry].baseValue;
  let mult = 1;

  if (signals.facilitySqFt) {
    if (signals.facilitySqFt >= 40_000) mult *= 1.3;
    else if (signals.facilitySqFt >= 15_000) mult *= 1.1;
    else if (signals.facilitySqFt < 5_000) mult *= 0.8;
  }
  if (signals.locationCount && signals.locationCount > 1) {
    mult *= 1 + Math.min(1, (signals.locationCount - 1) * 0.15);
  }

  const r = (n: number) => Math.round((n * mult) / 1000) * 1000;
  return { low: r(base.low), high: r(base.high) };
}

// --- Combined scores -----------------------------------------------------

/**
 * Opportunity Score = weighted blend of the five component scores.
 * Weights reflect Orca Coast's sales reality: fit and revenue matter most,
 * but a deal you can't fund or can't reach won't close.
 */
const OPPORTUNITY_WEIGHTS = {
  playgroundFit: 0.3,
  budgetLikelihood: 0.2,
  familyTraffic: 0.2,
  decisionMakerAccess: 0.15,
  revenuePotential: 0.15,
} as const;

export function computeScores(lead: Lead): OpportunityScores {
  const playgroundFit = playgroundFitScore(lead.industry, lead.signals);
  const budgetLikelihood = budgetLikelihoodScore(lead.signals);
  const familyTraffic = familyTrafficScore(lead.industry, lead.signals);
  const decisionMakerAccess = decisionMakerAccessScore(lead.contacts);
  const revenuePotential = revenuePotentialScore(lead.industry, lead.signals);

  const opportunity = round(
    playgroundFit * OPPORTUNITY_WEIGHTS.playgroundFit +
      budgetLikelihood * OPPORTUNITY_WEIGHTS.budgetLikelihood +
      familyTraffic * OPPORTUNITY_WEIGHTS.familyTraffic +
      decisionMakerAccess * OPPORTUNITY_WEIGHTS.decisionMakerAccess +
      revenuePotential * OPPORTUNITY_WEIGHTS.revenuePotential,
  );

  return {
    playgroundFit,
    budgetLikelihood,
    familyTraffic,
    decisionMakerAccess,
    revenuePotential,
    opportunity,
    tier: industryTier(lead.industry),
  };
}

/**
 * Lead Qualification Score (0-100) and Hot/Warm/Cold category.
 * Distinct from Opportunity Score: this leans harder on the explicit
 * qualification factors in the spec (size, facility, locations, child focus,
 * existing play areas, budget, growth).
 */
export function qualifyLead(lead: Lead): { score: number; category: LeadCategory } {
  const s = lead.signals;
  let score = 30;

  if (s.orgSize) score += s.orgSize >= 100 ? 12 : s.orgSize >= 30 ? 8 : 4;
  if (s.facilitySqFt) score += s.facilitySqFt >= 20_000 ? 12 : s.facilitySqFt >= 8_000 ? 7 : 3;
  if (s.locationCount && s.locationCount > 1) score += Math.min(10, s.locationCount * 3);
  if (s.childFocused ?? INDUSTRY_META[lead.industry].childFocused) score += 12;
  if (s.hasExistingPlayArea) score += 6; // validated need
  score += budgetLikelihoodScore(s) * 0.15;
  if (s.growthIndicators?.length) score += Math.min(12, s.growthIndicators.length * 4);

  score = round(clamp(score));
  const category: LeadCategory = score >= 75 ? "Hot" : score >= 50 ? "Warm" : "Cold";
  return { score, category };
}

/**
 * Probability of closing (0-100). Combines opportunity score with tier and
 * decision-maker accessibility — the things most predictive of a close.
 */
export function closeProbability(scores: OpportunityScores): number {
  const tierFactor = { 1: 1.0, 2: 0.9, 3: 0.82, 4: 0.8, 5: 0.7, 6: 0.62 }[scores.tier] ?? 0.6;
  const base = scores.opportunity * 0.6 + scores.decisionMakerAccess * 0.4;
  return round(clamp(base * tierFactor));
}
