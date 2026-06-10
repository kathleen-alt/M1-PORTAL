import type { Lead } from "../types";

/**
 * Sourced REAL leads — well-known organizations across Canada and the U.S. that
 * match Orca Coast's customer profile (large YMCAs, multi-campus churches,
 * children's museums, science centres, aquariums). These are real, publicly
 * listed institutions used as a starter prospect set; the deployed app's live
 * Maps/OpenStreetMap sourcing finds local prospects at scale by city + radius.
 *
 * Each is a bare NEW lead (name, industry, website, location) — no fabricated
 * contacts, firmographics, or pipeline activity. You enrich and work them.
 */
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
    contacts: [],
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

  // Tier 1 — Large / multi-campus churches
  srcLead("src_lakewood", "Lakewood Church", "large_church", "Houston", "TX", "US", "lakewoodchurch.com"),
  srcLead("src_saddleback", "Saddleback Church", "multi_campus_church", "Lake Forest", "CA", "US", "saddleback.com"),
  srcLead("src_lifechurch", "Life.Church", "multi_campus_church", "Edmond", "OK", "US", "life.church"),
  srcLead("src_northpoint", "North Point Community Church", "multi_campus_church", "Alpharetta", "GA", "US", "northpoint.org"),
  srcLead("src_elevation", "Elevation Church", "multi_campus_church", "Charlotte", "NC", "US", "elevationchurch.org"),

  // Tier 3 — Children's museums
  srcLead("src_cmi", "The Children's Museum of Indianapolis", "childrens_museum", "Indianapolis", "IN", "US", "childrensmuseum.org"),
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
