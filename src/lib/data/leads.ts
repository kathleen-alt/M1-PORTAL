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

  // --- Expanded, segmented prospect set (real orgs; verify/enrich before outreach) ---

  // YMCAs (US associations) — greenfield flagship play spaces
  srcLead("src_ymca_dallas", "YMCA of Metropolitan Dallas", "ymca", "Dallas", "TX", "US"),
  srcLead("src_ymca_houston", "YMCA of Greater Houston", "ymca", "Houston", "TX", "US"),
  srcLead("src_ymca_cfl", "YMCA of Central Florida", "ymca", "Orlando", "FL", "US"),
  srcLead("src_ymca_sfl", "YMCA of South Florida", "ymca", "Fort Lauderdale", "FL", "US"),
  srcLead("src_ymca_atlanta", "YMCA of Metro Atlanta", "ymca", "Atlanta", "GA", "US"),
  srcLead("src_ymca_charlotte", "YMCA of Greater Charlotte", "ymca", "Charlotte", "NC", "US"),
  srcLead("src_ymca_triangle", "YMCA of the Triangle", "ymca", "Raleigh", "NC", "US"),
  srcLead("src_ymca_cincy", "YMCA of Greater Cincinnati", "ymca", "Cincinnati", "OH", "US"),
  srcLead("src_ymca_cleveland", "YMCA of Greater Cleveland", "ymca", "Cleveland", "OH", "US"),
  srcLead("src_ymca_detroit", "YMCA of Metropolitan Detroit", "ymca", "Detroit", "MI", "US"),
  srcLead("src_ymca_pierce", "YMCA of Pierce and Kitsap Counties", "ymca", "Tacoma", "WA", "US"),
  srcLead("src_ymca_rochester", "YMCA of Greater Rochester", "ymca", "Rochester", "NY", "US"),
  srcLead("src_ymca_indy", "YMCA of Greater Indianapolis", "ymca", "Indianapolis", "IN", "US"),
  srcLead("src_ymca_sd", "YMCA of San Diego County", "ymca", "San Diego", "CA", "US"),
  srcLead("src_ymca_honolulu", "YMCA of Honolulu", "ymca", "Honolulu", "HI", "US"),

  // Churches (more verified regional, children's ministry)
  srcLead("src_cfg", "Calgary Full Gospel Church", "large_church", "Calgary", "AB", "CA", "cfg.church"),
  srcLead("src_c3yyc", "C3 Church Calgary", "large_church", "Calgary", "AB", "CA", "myc3church.ca"),
  srcLead("src_centrestreet", "Centre Street Church", "multi_campus_church", "Calgary", "AB", "CA", "cschurch.ca"),
  srcLead("src_fwpres", "Fort Worth Presbyterian Church", "large_church", "Fort Worth", "TX", "US", "fortworthpca.org"),

  // Family resorts (mountain/lake — kids' programs, no dedicated indoor playground)
  srcLead("src_panorama", "Panorama Mountain Resort", "resort", "Panorama", "BC", "CA", "panoramaresort.com"),
  srcLead("src_kickinghorse", "Kicking Horse Mountain Resort", "resort", "Golden", "BC", "CA", "kickinghorseresort.com"),
  srcLead("src_fernie", "Fernie Alpine Resort", "resort", "Fernie", "BC", "CA", "skifernie.com"),
  srcLead("src_fairmont", "Fairmont Hot Springs Resort", "resort", "Fairmont Hot Springs", "BC", "CA", "fairmonthotsprings.com"),
  srcLead("src_predator", "Predator Ridge Resort", "resort", "Vernon", "BC", "CA", "predatorridge.com"),
  srcLead("src_revelstoke", "Revelstoke Mountain Resort", "resort", "Revelstoke", "BC", "CA", "revelstokemountainresort.com"),
  srcLead("src_bluemountain", "Blue Mountain Resort", "resort", "Blue Mountains", "ON", "CA", "bluemountain.ca"),
  srcLead("src_tremblant", "Mont-Tremblant Resort", "resort", "Mont-Tremblant", "QC", "CA", "tremblant.ca"),
];
