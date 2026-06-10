import type { Contact, Lead } from "../types";

/**
 * Sourced REAL leads + contacts. Organizations are real, publicly-listed
 * institutions matching Orca Coast's customer profile. Named contacts are REAL,
 * publicly-listed leaders (verified via public sources) — we do NOT fabricate
 * personal email addresses; named people are attached by name + title and the
 * "Find emails / Enrich" feature infers a pattern address on demand. Each lead
 * also carries a standard general inbox (info@domain) as a first-touch address.
 *
 * The deployed app's live enrichment (Hunter / Apollo / website scraping)
 * sources verified per-person emails at scale.
 */
function domainOf(website?: string): string | undefined {
  if (!website) return undefined;
  return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

function inbox(domain?: string): Contact[] {
  if (!domain) return [];
  return [{ id: `c_info_${domain}`, name: "General Inbox", role: "Other", email: `info@${domain}`, confidence: 50, isDecisionMaker: false }];
}

function person(name: string, role: Contact["role"]): Contact {
  // Real, publicly-listed leader. No email asserted — inferred on enrichment.
  return { id: `c_${name.toLowerCase().replace(/[^a-z]/g, "")}`, name, role, confidence: 75, isDecisionMaker: true };
}

function srcLead(
  id: string,
  name: string,
  industry: Lead["industry"],
  city: string,
  region: string,
  country: "CA" | "US",
  website?: string,
  leaders: Contact[] = [],
): Lead {
  const domain = domainOf(website);
  return {
    id,
    name,
    industry,
    website,
    address: { city, region, country },
    contacts: [...leaders, ...inbox(domain)],
    signals: {},
    dataConfidence: 60,
    source: "public_db",
    stage: "New Lead",
    createdAt: new Date().toISOString(),
  };
}

export const SEED_LEADS: Lead[] = [
  // Tier 1 — YMCAs
  srcLead("src_ymca_gta", "YMCA of Greater Toronto", "ymca", "Toronto", "ON", "CA", "ymcagta.org"),
  srcLead("src_ymca_van", "YMCA of Greater Vancouver", "ymca", "Vancouver", "BC", "CA"),
  srcLead("src_ymca_hou", "YMCA of Greater Houston", "ymca", "Houston", "TX", "US", "ymcahouston.org"),
  srcLead("src_ymca_la", "YMCA of Metropolitan Los Angeles", "ymca", "Los Angeles", "CA", "US", "ymcala.org"),
  srcLead("src_ymca_sd", "YMCA of San Diego County", "ymca", "San Diego", "CA", "US", "ymcasd.org"),
  srcLead("src_ymca_north", "YMCA of the North", "ymca", "Minneapolis", "MN", "US"),

  // Tier 1 — Large / multi-campus churches (senior pastors are public figures)
  srcLead("src_lakewood", "Lakewood Church", "large_church", "Houston", "TX", "US", "lakewoodchurch.com", [person("Joel Osteen", "Pastor")]),
  srcLead("src_saddleback", "Saddleback Church", "multi_campus_church", "Lake Forest", "CA", "US", "saddleback.com", [person("Andy Wood", "Pastor")]),
  srcLead("src_lifechurch", "Life.Church", "multi_campus_church", "Edmond", "OK", "US", "life.church", [person("Craig Groeschel", "Pastor")]),
  srcLead("src_northpoint", "North Point Community Church", "multi_campus_church", "Alpharetta", "GA", "US", "northpoint.org", [person("Andy Stanley", "Pastor")]),
  srcLead("src_elevation", "Elevation Church", "multi_campus_church", "Charlotte", "NC", "US", "elevationchurch.org", [person("Steven Furtick", "Pastor")]),

  // Tier 3 — Children's museums
  srcLead("src_cmi", "The Children's Museum of Indianapolis", "childrens_museum", "Indianapolis", "IN", "US", "childrensmuseum.org", [person("Jennifer Pace Robinson", "Executive Director")]),
  srcLead("src_boston_cm", "Boston Children's Museum", "childrens_museum", "Boston", "MA", "US", "bostonchildrensmuseum.org"),
  srcLead("src_please_touch", "Please Touch Museum", "childrens_museum", "Philadelphia", "PA", "US", "pleasetouchmuseum.org"),
  srcLead("src_chicago_cm", "Chicago Children's Museum", "childrens_museum", "Chicago", "IL", "US", "chicagochildrensmuseum.org"),

  // Tier 3 — Science centres
  srcLead("src_science_world", "Science World", "science_center", "Vancouver", "BC", "CA", "scienceworld.ca"),
  srcLead("src_telus_spark", "TELUS Spark Science Centre", "science_center", "Calgary", "AB", "CA", "telusspark.com"),

  // Tier 3 — Aquariums
  srcLead("src_georgia_aq", "Georgia Aquarium", "aquarium", "Atlanta", "GA", "US", "georgiaaquarium.org"),
  srcLead("src_ripleys", "Ripley's Aquarium of Canada", "aquarium", "Toronto", "ON", "CA", "ripleyaquariums.com"),
  srcLead("src_van_aq", "Vancouver Aquarium", "aquarium", "Vancouver", "BC", "CA", "vanaqua.org"),
];
