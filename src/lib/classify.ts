// ---------------------------------------------------------------------------
// Industry classifier — maps a free-text organization name (and optional
// category hint) to the tiered Industry taxonomy. Used by bulk import and the
// live geo-sourcing provider so any inbound org gets tiered and scored.
// ---------------------------------------------------------------------------

import type { Industry } from "./types";

/** Ordered keyword rules — first match wins, so specific terms come first. */
const RULES: { industry: Industry; terms: string[] }[] = [
  { industry: "ymca", terms: ["ymca"] },
  { industry: "ywca", terms: ["ywca"] },
  { industry: "multi_campus_church", terms: ["multi-campus", "multi campus"] },
  { industry: "large_church", terms: ["church", "baptist", "fellowship", "ministry", "parish", "chapel", "tabernacle", "worship", "christian center", "christian centre", "cathedral"] },
  { industry: "church_family_center", terms: ["family church", "family center church"] },
  { industry: "montessori", terms: ["montessori"] },
  { industry: "preschool", terms: ["preschool", "pre-school", "pre school"] },
  { industry: "early_learning", terms: ["early learning", "early childhood"] },
  { industry: "daycare", terms: ["daycare", "day care", "child care", "childcare", "nursery", "kindergarten"] },
  { industry: "private_school", terms: ["academy", "private school", "school"] },
  { industry: "childrens_museum", terms: ["children's museum", "childrens museum", "kids museum"] },
  { industry: "science_center", terms: ["science centre", "science center", "discovery science"] },
  { industry: "aviation_museum", terms: ["aviation", "air museum", "space center", "space centre"] },
  { industry: "aquarium", terms: ["aquarium", "sea life", "marine"] },
  { industry: "discovery_center", terms: ["discovery centre", "discovery center"] },
  { industry: "museum", terms: ["museum", "zoo", "heritage"] },
  { industry: "cultural_center", terms: ["cultural centre", "cultural center"] },
  { industry: "trampoline_park", terms: ["trampoline", "jump", "bounce"] },
  { industry: "play_cafe", terms: ["play cafe", "play café", "cafe & play", "café & play", "playcare cafe"] },
  { industry: "birthday_party_center", terms: ["party place", "party centre", "party center"] },
  { industry: "indoor_playground_operator", terms: ["indoor playground", "playland", "play centre", "play center", "playground", "play place", "soft play", "playzone", "play zone"] },
  { industry: "family_entertainment_center", terms: ["family entertainment", "family fun", "fun center", "fun centre", "fec", "entertainment center", "entertainment centre", "arcade"] },
  { industry: "childrens_activity_center", terms: ["activity centre", "activity center", "kids club", "day camp"] },
  { industry: "waterpark", terms: ["waterpark", "water park", "waterslide", "water slide"] },
  { industry: "rv_resort", terms: ["rv resort", "rv park", "campground", "jellystone"] },
  { industry: "resort", terms: ["resort", "casino", "lodge"] },
  { industry: "hotel", terms: ["hotel", "inn", "suites"] },
  { industry: "sports_complex", terms: ["sports complex", "sportzone", "sports arena", "sportsplex", "dek hockey", "soccer centre", "soccer center"] },
  { industry: "athletic_facility", terms: ["fitness", "gym", "gymnastics", "athletic", "health club", "country club", "recreation club", "dance academy"] },
  { industry: "municipal_recreation", terms: ["aquatic centre", "aquatic center", "leisure centre", "leisure center"] },
  { industry: "parks_recreation", terms: ["parks & recreation", "parks and recreation", "park district", "parks dept", "parks department"] },
  { industry: "recreation_center", terms: ["recreation center", "recreation centre", "rec center", "rec centre", "leisure"] },
  { industry: "community_center", terms: ["community center", "community centre", "community & cultural", "spark center", "spark centre"] },
  { industry: "pediatric_clinic", terms: ["pediatric", "paediatric", "children's clinic", "kids dental", "pediatric dentist"] },
  { industry: "childrens_hospital", terms: ["children's hospital", "childrens hospital", "pediatric hospital"] },
  { industry: "indigenous_community_center", terms: ["first nation", "indigenous", "metis", "inuit", "nation of", "band office", "friendship centre"] },
  { industry: "library", terms: ["library"] },
  { industry: "shopping_center", terms: ["mall", "shopping centre", "shopping center", "town centre", "outlet"] },
  { industry: "airport_family_zone", terms: ["airport", "terminal"] },
  { industry: "military_family_resource", terms: ["military family", "mfrc", "base resource", "cfb"] },
  { industry: "apartment_developer", terms: ["apartments", "apartment", "residences", "lofts"] },
  { industry: "mixed_use_development", terms: ["mixed-use", "mixed use", "town center development"] },
  { industry: "housing_development", terms: ["housing", "developments", "estates"] },
  { industry: "community_association", terms: ["community association", "residents association", "homeowners"] },
  { industry: "nonprofit_family_org", terms: ["non-profit", "nonprofit", "foundation", "society", "club for kids", "boys & girls"] },
];

/**
 * Classify an org by name + optional hint (e.g. an OSM category or a CSV
 * "type" column). Returns the matched industry and a confidence (lower when we
 * fall back to the generic default).
 */
export function classifyIndustry(
  name: string,
  hint?: string,
): { industry: Industry; confidence: number } {
  const hay = `${name} ${hint ?? ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.terms.some((t) => hay.includes(t))) {
      return { industry: rule.industry, confidence: 80 };
    }
  }
  // Unknown but family-adjacent default: treat as a non-profit family org so it
  // still surfaces as a Tier-6 hidden opportunity rather than being dropped.
  return { industry: "nonprofit_family_org", confidence: 35 };
}
