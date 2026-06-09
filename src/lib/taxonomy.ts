import type { Industry, Tier } from "./types";

interface IndustryMeta {
  label: string;
  tier: Tier;
  /** Baseline installed playground value band in CAD, before signal adjustment. */
  baseValue: { low: number; high: number };
  /** Whether the category inherently serves children/families. */
  childFocused: boolean;
}

/**
 * The master taxonomy. Tier ordering encodes Orca Coast's historical fit:
 * Tier 1 organizations close most readily and at the highest values.
 * Tier 6 are "hidden opportunities" — they serve families but rarely have
 * playgrounds, so fit is real but must be argued.
 */
export const INDUSTRY_META: Record<Industry, IndustryMeta> = {
  // --- Tier 1 ---
  ymca: { label: "YMCA", tier: 1, baseValue: { low: 150_000, high: 500_000 }, childFocused: true },
  ywca: { label: "YWCA", tier: 1, baseValue: { low: 120_000, high: 400_000 }, childFocused: true },
  recreation_center: { label: "Recreation Center", tier: 1, baseValue: { low: 120_000, high: 450_000 }, childFocused: true },
  community_center: { label: "Community Center", tier: 1, baseValue: { low: 100_000, high: 400_000 }, childFocused: true },
  municipal_recreation: { label: "Municipal Recreation Facility", tier: 1, baseValue: { low: 150_000, high: 600_000 }, childFocused: true },
  parks_recreation: { label: "Parks & Recreation Dept.", tier: 1, baseValue: { low: 150_000, high: 700_000 }, childFocused: true },
  church_family_center: { label: "Church Family Center", tier: 1, baseValue: { low: 80_000, high: 350_000 }, childFocused: true },
  large_church: { label: "Large Church (Children's Ministry)", tier: 1, baseValue: { low: 90_000, high: 400_000 }, childFocused: true },
  multi_campus_church: { label: "Multi-Campus Church", tier: 1, baseValue: { low: 120_000, high: 500_000 }, childFocused: true },

  // --- Tier 2 ---
  daycare: { label: "Daycare", tier: 2, baseValue: { low: 40_000, high: 150_000 }, childFocused: true },
  childcare_operator: { label: "Childcare Operator", tier: 2, baseValue: { low: 60_000, high: 250_000 }, childFocused: true },
  montessori: { label: "Montessori School", tier: 2, baseValue: { low: 50_000, high: 180_000 }, childFocused: true },
  preschool: { label: "Preschool", tier: 2, baseValue: { low: 40_000, high: 150_000 }, childFocused: true },
  early_learning: { label: "Early Learning Centre", tier: 2, baseValue: { low: 45_000, high: 160_000 }, childFocused: true },
  private_school: { label: "Private School", tier: 2, baseValue: { low: 80_000, high: 350_000 }, childFocused: true },

  // --- Tier 3 ---
  museum: { label: "Museum", tier: 3, baseValue: { low: 100_000, high: 400_000 }, childFocused: false },
  childrens_museum: { label: "Children's Museum", tier: 3, baseValue: { low: 150_000, high: 600_000 }, childFocused: true },
  aquarium: { label: "Aquarium", tier: 3, baseValue: { low: 120_000, high: 500_000 }, childFocused: true },
  science_center: { label: "Science Centre", tier: 3, baseValue: { low: 150_000, high: 550_000 }, childFocused: true },
  aviation_museum: { label: "Aviation Museum", tier: 3, baseValue: { low: 100_000, high: 400_000 }, childFocused: false },
  discovery_center: { label: "Discovery Centre", tier: 3, baseValue: { low: 120_000, high: 450_000 }, childFocused: true },
  cultural_center: { label: "Cultural Centre", tier: 3, baseValue: { low: 90_000, high: 350_000 }, childFocused: false },

  // --- Tier 4 ---
  family_entertainment_center: { label: "Family Entertainment Centre", tier: 4, baseValue: { low: 150_000, high: 700_000 }, childFocused: true },
  indoor_playground_operator: { label: "Indoor Playground Operator", tier: 4, baseValue: { low: 120_000, high: 600_000 }, childFocused: true },
  trampoline_park: { label: "Trampoline Park", tier: 4, baseValue: { low: 100_000, high: 500_000 }, childFocused: true },
  adventure_park: { label: "Adventure Park", tier: 4, baseValue: { low: 120_000, high: 550_000 }, childFocused: true },
  play_cafe: { label: "Play Cafe", tier: 4, baseValue: { low: 40_000, high: 150_000 }, childFocused: true },
  childrens_activity_center: { label: "Children's Activity Centre", tier: 4, baseValue: { low: 60_000, high: 250_000 }, childFocused: true },
  birthday_party_center: { label: "Birthday Party Centre", tier: 4, baseValue: { low: 60_000, high: 220_000 }, childFocused: true },

  // --- Tier 5 ---
  resort: { label: "Resort", tier: 5, baseValue: { low: 100_000, high: 500_000 }, childFocused: false },
  hotel: { label: "Hotel", tier: 5, baseValue: { low: 60_000, high: 300_000 }, childFocused: false },
  campground: { label: "Campground", tier: 5, baseValue: { low: 50_000, high: 200_000 }, childFocused: false },
  rv_resort: { label: "RV Resort", tier: 5, baseValue: { low: 60_000, high: 250_000 }, childFocused: false },
  waterpark: { label: "Waterpark", tier: 5, baseValue: { low: 120_000, high: 500_000 }, childFocused: true },
  sports_complex: { label: "Sports Complex", tier: 5, baseValue: { low: 100_000, high: 450_000 }, childFocused: true },
  athletic_facility: { label: "Athletic Facility", tier: 5, baseValue: { low: 80_000, high: 350_000 }, childFocused: false },

  // --- Tier 6 (hidden opportunities) ---
  pediatric_clinic: { label: "Pediatric Clinic", tier: 6, baseValue: { low: 30_000, high: 120_000 }, childFocused: true },
  childrens_hospital: { label: "Children's Hospital", tier: 6, baseValue: { low: 80_000, high: 350_000 }, childFocused: true },
  indigenous_community_center: { label: "Indigenous Community Centre", tier: 6, baseValue: { low: 80_000, high: 350_000 }, childFocused: true },
  library: { label: "Library", tier: 6, baseValue: { low: 40_000, high: 180_000 }, childFocused: true },
  shopping_center: { label: "Shopping Centre", tier: 6, baseValue: { low: 80_000, high: 400_000 }, childFocused: false },
  airport_family_zone: { label: "Airport Family Zone", tier: 6, baseValue: { low: 60_000, high: 250_000 }, childFocused: true },
  military_family_resource: { label: "Military Family Resource Centre", tier: 6, baseValue: { low: 70_000, high: 280_000 }, childFocused: true },
  housing_development: { label: "Housing Development", tier: 6, baseValue: { low: 60_000, high: 300_000 }, childFocused: false },
  mixed_use_development: { label: "Mixed-Use Development", tier: 6, baseValue: { low: 80_000, high: 400_000 }, childFocused: false },
  apartment_developer: { label: "Apartment Developer", tier: 6, baseValue: { low: 70_000, high: 350_000 }, childFocused: false },
  community_association: { label: "Community Association", tier: 6, baseValue: { low: 50_000, high: 200_000 }, childFocused: true },
  nonprofit_family_org: { label: "Non-Profit Family Organization", tier: 6, baseValue: { low: 40_000, high: 180_000 }, childFocused: true },
};

export const ALL_INDUSTRIES = Object.keys(INDUSTRY_META) as Industry[];

export function industryLabel(industry: Industry): string {
  return INDUSTRY_META[industry]?.label ?? industry;
}

export function industryTier(industry: Industry): Tier {
  return INDUSTRY_META[industry]?.tier ?? 6;
}

export function industriesByTier(tier: Tier): Industry[] {
  return ALL_INDUSTRIES.filter((i) => INDUSTRY_META[i].tier === tier);
}

export const TIER_LABELS: Record<Tier, string> = {
  1: "Tier 1 — Core Fit (Recreation, Community & Faith)",
  2: "Tier 2 — Childcare & Education",
  3: "Tier 3 — Museums & Discovery",
  4: "Tier 4 — Entertainment & Play",
  5: "Tier 5 — Hospitality & Sport",
  6: "Tier 6 — Hidden Opportunities",
};
