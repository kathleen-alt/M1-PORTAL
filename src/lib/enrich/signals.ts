// ---------------------------------------------------------------------------
// Signal inference.
//
// Imported / live-sourced leads arrive with empty signals, so they score low
// and uniformly. This fills the GAPS with category-calibrated baseline
// estimates (facility size, org size, budget band, family traffic, child
// focus, multi-location) so the scoring engine produces a meaningful ranking
// immediately — before any paid enrichment. Real provider data, when
// available, always overrides these estimates (we only fill what's missing).
// ---------------------------------------------------------------------------

import type { Industry, OrgSignals } from "../types";
import { INDUSTRY_META, industryTier } from "../taxonomy";

interface Baseline {
  orgSize: number;
  facilitySqFt: number;
  annualBudgetBand: NonNullable<OrgSignals["annualBudgetBand"]>;
  weeklyFamilyTraffic: number;
}

/** Category-average baselines by tier. Deliberately conservative. */
const TIER_BASELINE: Record<number, Baseline> = {
  1: { orgSize: 80, facilitySqFt: 30_000, annualBudgetBand: "2m_10m", weeklyFamilyTraffic: 2_000 },
  2: { orgSize: 25, facilitySqFt: 7_000, annualBudgetBand: "500k_2m", weeklyFamilyTraffic: 500 },
  3: { orgSize: 45, facilitySqFt: 25_000, annualBudgetBand: "2m_10m", weeklyFamilyTraffic: 1_500 },
  4: { orgSize: 50, facilitySqFt: 35_000, annualBudgetBand: "2m_10m", weeklyFamilyTraffic: 3_000 },
  5: { orgSize: 120, facilitySqFt: 20_000, annualBudgetBand: "2m_10m", weeklyFamilyTraffic: 800 },
  6: { orgSize: 40, facilitySqFt: 15_000, annualBudgetBand: "500k_2m", weeklyFamilyTraffic: 700 },
};

export interface InferenceResult {
  signals: Partial<OrgSignals>;
  /** Human-readable list of what was inferred (for the enrichment report). */
  notes: string[];
}

/**
 * Infer the signals a lead is missing. Returns only the fields it set, plus
 * notes describing each inference, so callers can merge non-destructively.
 */
export function inferSignals(
  industry: Industry,
  name: string,
  existing: OrgSignals,
): InferenceResult {
  const tier = industryTier(industry);
  const base = TIER_BASELINE[tier] ?? TIER_BASELINE[6];
  const meta = INDUSTRY_META[industry];
  const out: Partial<OrgSignals> = {};
  const notes: string[] = [];
  const lower = name.toLowerCase();

  if (existing.childFocused == null) {
    out.childFocused = meta.childFocused;
    notes.push(`Child-focused: ${meta.childFocused ? "yes" : "no"} (from category)`);
  }

  if (existing.facilitySqFt == null) {
    // Size words nudge the estimate up.
    let sqft = base.facilitySqFt;
    if (/\b(flagship|regional|metro|greater|district|county|central)\b/.test(lower)) sqft = Math.round(sqft * 1.3);
    out.facilitySqFt = sqft;
    notes.push(`Facility size: ~${sqft.toLocaleString()} sq ft (estimated)`);
  }

  if (existing.orgSize == null) {
    out.orgSize = base.orgSize;
    notes.push(`Org size: ~${base.orgSize} staff (estimated)`);
  }

  if (existing.annualBudgetBand == null) {
    out.annualBudgetBand = base.annualBudgetBand;
    notes.push(`Budget band: ${base.annualBudgetBand} (estimated)`);
  }

  if (existing.weeklyFamilyTraffic == null) {
    out.weeklyFamilyTraffic = base.weeklyFamilyTraffic;
    notes.push(`Weekly family traffic: ~${base.weeklyFamilyTraffic.toLocaleString()} (estimated)`);
  }

  if (existing.locationCount == null) {
    if (/\b(multi-?campus|multi campus|locations|chain)\b/.test(lower)) {
      out.locationCount = 3;
      notes.push("Multi-location operator detected (×3, estimated)");
    }
  }

  return { signals: out, notes };
}
