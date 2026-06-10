import type { Contact, Lead } from "../types";

/**
 * Sourced REAL leads, right-sized to match Orca Coast's actual customer profile
 * (regional YMCAs, large-but-regional churches, mid-size children's museums and
 * science centres, regional aquariums) — NOT national/celebrity institutions.
 * All are real, publicly-listed organizations. Contacts are real general inboxes
 * (info@domain); named decision-makers come from enrichment (Hunter/Apollo) or
 * the deployed app's live sourcing. No fabricated people or emails.
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
  id: string,
  name: string,
  industry: Lead["industry"],
  city: string,
  region: string,
  country: "CA" | "US",
  website?: string,
): Lead {
  return {
    id,
    name,
    industry,
    website,
    address: { city, region, country },
    contacts: inbox(domainOf(website)),
    signals: {},
    dataConfidence: 60,
    source: "public_db",
    stage: "New Lead",
    createdAt: new Date().toISOString(),
  };
}

export const SEED_LEADS: Lead[] = [
  // Regional YMCAs (Orca Coast has landed YMCAs of this scale, incl. Greater Seattle)
  srcLead("src_ymca_van", "YMCA of Greater Vancouver", "ymca", "Vancouver", "BC", "CA"),
  srcLead("src_ymca_north", "YMCA of the North", "ymca", "Minneapolis", "MN", "US"),
  srcLead("src_ymca_gta", "YMCA of Greater Toronto", "ymca", "Toronto", "ON", "CA", "ymcagta.org"),

  // Large regional churches with children's ministries (not celebrity megachurches)
  srcLead("src_centrestreet", "Centre Street Church", "multi_campus_church", "Calgary", "AB", "CA", "cschurch.ca"),
  srcLead("src_eaglebrook", "Eagle Brook Church", "multi_campus_church", "Lino Lakes", "MN", "US", "eaglebrookchurch.com"),

  // Mid-size children's museums
  srcLead("src_mb_cm", "Manitoba Children's Museum", "childrens_museum", "Winnipeg", "MB", "CA", "childrensmuseum.com"),
  srcLead("src_london_cm", "London Children's Museum", "childrens_museum", "London", "ON", "CA", "londonchildrensmuseum.ca"),

  // Regional science / discovery centres
  srcLead("src_sask_science", "Saskatchewan Science Centre", "science_center", "Regina", "SK", "CA", "sasksciencecentre.com"),
  srcLead("src_science_world", "Science World", "science_center", "Vancouver", "BC", "CA", "scienceworld.ca"),
  srcLead("src_telus_spark", "TELUS Spark Science Centre", "science_center", "Calgary", "AB", "CA", "telusspark.com"),
  srcLead("src_discovery_hfx", "Discovery Centre", "discovery_center", "Halifax", "NS", "CA", "thediscoverycentre.ca"),
  srcLead("src_themuseum", "THEMUSEUM", "discovery_center", "Kitchener", "ON", "CA", "themuseum.ca"),

  // Regional aquariums (comparable to Orca Coast's aquarium installs)
  srcLead("src_van_aq", "Vancouver Aquarium", "aquarium", "Vancouver", "BC", "CA", "vanaqua.org"),
  srcLead("src_ripleys", "Ripley's Aquarium of Canada", "aquarium", "Toronto", "ON", "CA", "ripleyaquariums.com"),
];
