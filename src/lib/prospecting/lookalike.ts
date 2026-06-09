// ---------------------------------------------------------------------------
// Lookalike matching: for any lead, find the most similar past Orca Coast
// projects and explain why they match. Powers "Similar Orca Coast Projects".
// ---------------------------------------------------------------------------

import type { Lead, LookalikeMatch, OrcaProject } from "../types";
import { INDUSTRY_META, industryLabel } from "../taxonomy";

/**
 * Similarity is a weighted blend of:
 *  - industry match (exact / same-tier)         55%
 *  - facility size proximity                     20%
 *  - geographic proximity (same country/region)  15%
 *  - shared child-focus                          10%
 */
export function similarityTo(lead: Lead, project: OrcaProject): LookalikeMatch {
  const reasons: string[] = [];
  let score = 0;

  // Industry / tier.
  if (lead.industry === project.industry) {
    score += 55;
    reasons.push(`Same category as ${project.name} (${industryLabel(project.industry)})`);
  } else if (INDUSTRY_META[lead.industry].tier === INDUSTRY_META[project.industry].tier) {
    score += 33;
    reasons.push(
      `Same prospect tier as ${project.name} (${industryLabel(project.industry)})`,
    );
  } else {
    const tierGap = Math.abs(
      INDUSTRY_META[lead.industry].tier - INDUSTRY_META[project.industry].tier,
    );
    score += Math.max(0, 18 - tierGap * 5);
  }

  // Facility size proximity.
  if (lead.signals.facilitySqFt && project.facilitySqFt) {
    const ratio =
      Math.min(lead.signals.facilitySqFt, project.facilitySqFt) /
      Math.max(lead.signals.facilitySqFt, project.facilitySqFt);
    score += 20 * ratio;
    if (ratio > 0.7) reasons.push("Comparable facility size");
  } else {
    score += 8; // neutral partial credit when unknown
  }

  // Geography.
  if (lead.address.country === project.country) {
    score += 7;
    if (lead.address.region === project.region) {
      score += 8;
      reasons.push(`Same region (${project.region})`);
    } else {
      reasons.push(`Same country (${project.country === "CA" ? "Canada" : "United States"})`);
    }
  }

  // Child focus.
  const leadChild = lead.signals.childFocused ?? INDUSTRY_META[lead.industry].childFocused;
  if (leadChild && INDUSTRY_META[project.industry].childFocused) {
    score += 10;
  }

  return {
    project,
    similarity: Math.round(Math.max(0, Math.min(100, score))),
    reasons,
  };
}

/** Top-N most similar past projects for a lead. */
export function findLookalikes(
  lead: Lead,
  projects: OrcaProject[],
  limit = 4,
): LookalikeMatch[] {
  return projects
    .map((p) => similarityTo(lead, p))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
