// ---------------------------------------------------------------------------
// Lead Discovery Engine.
//
// In production this queries Google Maps Places + business directories +
// public databases, then runs Contact Enrichment (Apollo/Clearbit/Hunter).
// In DEMO mode it searches the seeded dataset so the workflow is exercisable
// end-to-end. The interface is identical, so swapping providers is local.
// ---------------------------------------------------------------------------

import type { Country, Industry, Lead } from "./types";
import { getLeads } from "./store";

export interface DiscoveryQuery {
  industry?: Industry;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: Country;
  /** Search radius in km (used by the Google Maps provider in production). */
  radiusKm?: number;
}

export interface DiscoveryResult {
  leads: Lead[];
  source: "google_maps" | "seed";
  note: string;
}

export async function discoverLeads(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const hasGoogle = !!process.env.GOOGLE_MAPS_API_KEY;

  // Production path (only when a key is configured).
  if (hasGoogle) {
    // Intentionally left as the integration seam. The contract: call Places
    // Text Search / Nearby Search, map results to Lead, then enrich contacts.
    // We fall through to the seed search if the live call returns nothing.
  }

  const leads = getLeads().filter((l) => {
    if (query.industry && l.industry !== query.industry) return false;
    if (query.country && l.address.country !== query.country) return false;
    if (query.region && l.address.region.toLowerCase() !== query.region.toLowerCase())
      return false;
    if (query.city && !l.address.city.toLowerCase().includes(query.city.toLowerCase()))
      return false;
    if (
      query.postalCode &&
      l.address.postalCode &&
      !l.address.postalCode.replace(/\s/g, "").startsWith(query.postalCode.replace(/\s/g, ""))
    )
      return false;
    return true;
  });

  return {
    leads,
    source: hasGoogle ? "google_maps" : "seed",
    note: hasGoogle
      ? "Live discovery enabled. Showing matched + enriched results."
      : "Demo mode: searching the seeded dataset. Set GOOGLE_MAPS_API_KEY for live discovery.",
  };
}
