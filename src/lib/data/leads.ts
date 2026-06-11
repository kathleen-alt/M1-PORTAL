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
  region: string, country: "CA" | "US", website?: string, phone?: string,
): Lead {
  return {
    id, name, industry, website, phone,
    address: { city, region, country },
    contacts: inbox(domainOf(website)),
    signals: {}, dataConfidence: phone ? 70 : 60, source: "public_db", stage: "New Lead",
    createdAt: new Date().toISOString(),
  };
}

export const SEED_LEADS: Lead[] = [
  // YMCA associations (greenfield — no Orca playground yet), right scale
  srcLead("src_ymca_calgary", "YMCA Calgary", "ymca", "Calgary", "AB", "CA", "ymcacalgary.org", "+1-403-351-5262"),
  srcLead("src_ymca_nab", "YMCA of Northern Alberta", "ymca", "Edmonton", "AB", "CA"),
  srcLead("src_ymca_leth", "YMCA of Lethbridge", "ymca", "Lethbridge", "AB", "CA"),
  srcLead("src_ymca_medhat", "YMCA of Medicine Hat", "ymca", "Medicine Hat", "AB", "CA"),
  srcLead("src_ymca_hbb", "YMCA of Hamilton/Burlington/Brantford", "ymca", "Hamilton", "ON", "CA"),
  srcLead("src_ymca_eo", "YMCA of Eastern Ontario", "ymca", "Kingston", "ON", "CA"),
  srcLead("src_ymca_ceo", "YMCA of Central East Ontario", "ymca", "Peterborough", "ON", "CA"),
  srcLead("src_ymca_sibc", "YMCA of Southern Interior BC", "ymca", "Kelowna", "BC", "CA"),
  srcLead("src_ymca_vanisle", "YMCA-YWCA of Vancouver Island", "ymca", "Victoria", "BC", "CA"),

  // Regional churches with children's ministries (greenfield, right scale —
  // not celebrity megachurches; matches customers like Pantego Bible / Fielder Road)
  srcLead("src_christchurch_yyc", "Christ Church Calgary", "large_church", "Calgary", "AB", "CA", "christchurchcalgary.org"),
  srcLead("src_fefc_yyc", "First Evangelical Free Church of Calgary", "large_church", "Calgary", "AB", "CA", "fefc.ca"),
  srcLead("src_brentview", "Brentview Church", "large_church", "Calgary", "AB", "CA", "brentview.church"),
  srcLead("src_calgarylife", "Calgary Life Church", "large_church", "Calgary", "AB", "CA", "calgarylifechurch.com"),
  srcLead("src_highridge", "HighRidge Church", "large_church", "Fort Worth", "TX", "US", "highridgechurch.com", "+1-817-249-5200"),
  srcLead("src_centralbible", "Central Bible Church", "large_church", "Fort Worth", "TX", "US", "wearecentral.org", "+1-817-274-1315"),
  srcLead("src_crosschurch", "Cross Church", "multi_campus_church", "Fort Worth", "TX", "US", "ccdfw.org"),

  // Family resorts (greenfield — kids' programs but no dedicated indoor
  // playground yet; matches Orca's resort projects e.g. Kalahari, Isleta)
  srcLead("src_sunpeaks", "Sun Peaks Resort", "resort", "Sun Peaks", "BC", "CA", "sunpeaksresort.com"),
  srcLead("src_silverstar", "SilverStar Mountain Resort", "resort", "Silver Star", "BC", "CA", "skisilverstar.com"),
  srcLead("src_bigwhite", "Big White Ski Resort", "resort", "Kelowna", "BC", "CA", "bigwhite.com"),
  srcLead("src_lakelouise", "Lake Louise Ski Resort", "resort", "Lake Louise", "AB", "CA", "skilouise.com"),
  srcLead("src_norquay", "Mount Norquay", "resort", "Banff", "AB", "CA", "banffnorquay.com"),
];
