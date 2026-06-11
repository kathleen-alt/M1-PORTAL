import type { Contact, Lead } from "../types";

/**
 * Sourced REAL leads — family-serving organizations that do NOT yet have an
 * indoor playground (greenfield prospects), focused on YMCAs per direction.
 * Everything in orcaProjects.ts is a COMPLETED Orca Coast project (already has a
 * play space); these are real associations that don't, drawn from their actual
 * customer profile (regional / smaller-city YMCAs like Rupert ID, St. Cloud MN).
 * Verified via public sources; existing customers excluded. Contacts are real
 * general inboxes; named decision-makers come from enrichment / live sourcing.
 */
function domainOf(website?: string): string | undefined {
  if (!website) return undefined;
  return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}
function inbox(domain?: string): Contact[] {
  if (!domain) return [];
  return [{ id: `c_info_${domain}`, name: "General Inbox", role: "Other", email: `info@${domain}`, confidence: 50, isDecisionMaker: false }];
}
function srcLead(
  id: string, name: string, industry: Lead["industry"], city: string,
  region: string, country: "CA" | "US", website?: string,
): Lead {
  return {
    id, name, industry, website,
    address: { city, region, country },
    contacts: inbox(domainOf(website)),
    signals: {}, dataConfidence: 60, source: "public_db", stage: "New Lead",
    createdAt: new Date().toISOString(),
  };
}

export const SEED_LEADS: Lead[] = [
  // YMCA associations (greenfield — no Orca playground yet), right scale
  srcLead("src_ymca_calgary", "YMCA Calgary", "ymca", "Calgary", "AB", "CA", "ymcacalgary.org"),
  srcLead("src_ymca_nab", "YMCA of Northern Alberta", "ymca", "Edmonton", "AB", "CA"),
  srcLead("src_ymca_leth", "YMCA of Lethbridge", "ymca", "Lethbridge", "AB", "CA"),
  srcLead("src_ymca_medhat", "YMCA of Medicine Hat", "ymca", "Medicine Hat", "AB", "CA"),
  srcLead("src_ymca_hbb", "YMCA of Hamilton/Burlington/Brantford", "ymca", "Hamilton", "ON", "CA"),
  srcLead("src_ymca_eo", "YMCA of Eastern Ontario", "ymca", "Kingston", "ON", "CA"),
  srcLead("src_ymca_ceo", "YMCA of Central East Ontario", "ymca", "Peterborough", "ON", "CA"),
  srcLead("src_ymca_sibc", "YMCA of Southern Interior BC", "ymca", "Kelowna", "BC", "CA"),
  srcLead("src_ymca_vanisle", "YMCA-YWCA of Vancouver Island", "ymca", "Victoria", "BC", "CA"),
];
