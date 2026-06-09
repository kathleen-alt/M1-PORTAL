// ---------------------------------------------------------------------------
// Core domain types for the Orca Coast Growth Engine.
// ---------------------------------------------------------------------------

/** Prospect tiers, ordered by Orca Coast historical fit (Tier 1 = highest). */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Industry categories mapped to tiers. This taxonomy drives lookalike matching
 * and the prospect recommendation engine.
 */
export type Industry =
  // Tier 1
  | "ymca"
  | "ywca"
  | "recreation_center"
  | "community_center"
  | "municipal_recreation"
  | "parks_recreation"
  | "church_family_center"
  | "large_church"
  | "multi_campus_church"
  // Tier 2
  | "daycare"
  | "childcare_operator"
  | "montessori"
  | "preschool"
  | "early_learning"
  | "private_school"
  // Tier 3
  | "museum"
  | "childrens_museum"
  | "aquarium"
  | "science_center"
  | "aviation_museum"
  | "discovery_center"
  | "cultural_center"
  // Tier 4
  | "family_entertainment_center"
  | "indoor_playground_operator"
  | "trampoline_park"
  | "adventure_park"
  | "play_cafe"
  | "childrens_activity_center"
  | "birthday_party_center"
  // Tier 5
  | "resort"
  | "hotel"
  | "campground"
  | "rv_resort"
  | "waterpark"
  | "sports_complex"
  | "athletic_facility"
  // Tier 6 (hidden opportunities)
  | "pediatric_clinic"
  | "childrens_hospital"
  | "indigenous_community_center"
  | "library"
  | "shopping_center"
  | "airport_family_zone"
  | "military_family_resource"
  | "housing_development"
  | "mixed_use_development"
  | "apartment_developer"
  | "community_association"
  | "nonprofit_family_org";

export type Country = "CA" | "US";

export type LeadCategory = "Hot" | "Warm" | "Cold";

export type PipelineStage =
  | "New Lead"
  | "Contacted"
  | "Responded"
  | "Discovery Call"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export const PIPELINE_STAGES: PipelineStage[] = [
  "New Lead",
  "Contacted",
  "Responded",
  "Discovery Call",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export type ContactRole =
  | "Executive Director"
  | "Operations Manager"
  | "Recreation Director"
  | "Facilities Manager"
  | "Church Administrator"
  | "Pastor"
  | "Child Programming Manager"
  | "Owner"
  | "General Manager"
  | "Other";

export interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  email?: string;
  phone?: string;
  linkedin?: string;
  /** 0-100 confidence that this contact data is accurate. */
  confidence: number;
  isDecisionMaker: boolean;
}

export interface Address {
  line1?: string;
  city: string;
  region: string; // Province / State
  postalCode?: string;
  country: Country;
  lat?: number;
  lng?: number;
}

/**
 * Signals gathered about an organization. These feed every score in the
 * Revenue Opportunity model. All fields are optional — the engine degrades
 * gracefully when data is missing.
 */
export interface OrgSignals {
  /** Estimated number of staff. */
  orgSize?: number;
  /** Estimated facility square footage. */
  facilitySqFt?: number;
  /** Number of physical locations operated. */
  locationCount?: number;
  /** Does the org serve children / families as a core function? */
  childFocused?: boolean;
  /** Does the org already operate a play area? (lowers fit slightly) */
  hasExistingPlayArea?: boolean;
  /** Growth indicators (new construction, hiring, funding, expansion). */
  growthIndicators?: string[];
  /** Estimated annual budget band, used for budget likelihood. */
  annualBudgetBand?: "under_500k" | "500k_2m" | "2m_10m" | "over_10m";
  /** Estimated weekly family foot traffic. */
  weeklyFamilyTraffic?: number;
}

export interface Socials {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export interface Lead {
  id: string;
  name: string;
  industry: Industry;
  website?: string;
  phone?: string;
  address: Address;
  contacts: Contact[];
  signals: OrgSignals;
  socials?: Socials;
  /** ISO timestamp of the last successful enrichment pass. */
  enrichedAt?: string;
  /** 0-100 confidence the lead record itself is real / well-formed. */
  dataConfidence: number;
  source: "google_maps" | "directory" | "public_db" | "website" | "manual";
  stage: PipelineStage;
  campaignId?: string;
  createdAt: string;
  notes?: string;
}

/** A historical Orca Coast project — the reference set for lookalike matching. */
export interface OrcaProject {
  id: string;
  name: string;
  industry: Industry;
  city?: string;
  region: string;
  country: Country;
  website?: string;
  /** Final installed contract value in CAD. */
  contractValue: number;
  facilitySqFt?: number;
  year: number;
  summary: string;
}

// --- Scoring -------------------------------------------------------------

/** The five component scores that combine into the Opportunity Score. */
export interface OpportunityScores {
  playgroundFit: number; // 0-100
  budgetLikelihood: number; // 0-100
  familyTraffic: number; // 0-100
  decisionMakerAccess: number; // 0-100
  revenuePotential: number; // 0-100
  /** Weighted combination, 0-100. */
  opportunity: number;
  tier: Tier;
}

export interface LookalikeMatch {
  project: OrcaProject;
  /** 0-100 similarity. */
  similarity: number;
  reasons: string[];
}

/** Output of the recommendation engine for a single account. */
export interface ProspectRecommendation {
  lead: Lead;
  scores: OpportunityScores;
  leadScore: number; // 0-100 qualification score
  category: LeadCategory;
  /** Estimated playground opportunity value range in CAD. */
  estimatedValue: { low: number; high: number };
  /** Probability of closing, 0-100. */
  closeProbability: number;
  reasons: string[];
  lookalikes: LookalikeMatch[];
  decisionMakers: Contact[];
}

// --- Campaigns & Cadence -------------------------------------------------

export type Channel = "email" | "linkedin" | "phone" | "sms";

export type EmailType =
  | "first_touch"
  | "follow_up"
  | "value"
  | "case_study"
  | "final_check_in";

export interface CadenceStep {
  day: number;
  channel: Channel;
  emailType?: EmailType;
  label: string;
}

export interface Campaign {
  id: string;
  name: string;
  /** Which industry vertical this campaign targets. */
  vertical: "ymca" | "church" | "daycare" | "recreation" | "general";
  focusPoints: string[];
  cadence: CadenceStep[];
}

export interface GeneratedEmail {
  type: EmailType;
  subject: string;
  body: string;
  cta: string;
  objectionHandling?: string;
}

/** A logged interaction with an account (outreach, calls, notes, stage moves). */
export type ActivityType =
  | "note"
  | "email"
  | "call"
  | "linkedin"
  | "sms"
  | "meeting"
  | "stage_change";

export interface ActivityLog {
  id: string;
  leadId: string;
  type: ActivityType;
  summary: string;
  createdAt: string;
}

// --- Email sequence enrollment ------------------------------------------

export type StepStatus = "pending" | "sent" | "skipped";

export interface EnrollmentStep {
  day: number;
  channel: Channel;
  emailType?: EmailType;
  label: string;
  /** ISO date this step is due (startedAt + day). */
  dueAt: string;
  status: StepStatus;
  /** Generated content for email steps. */
  subject?: string;
  body?: string;
  /** The address this step would send to. */
  toEmail?: string;
}

export interface Enrollment {
  id: string;
  leadId: string;
  leadName: string;
  campaignId: string;
  campaignName: string;
  status: "active" | "paused" | "completed";
  startedAt: string;
  steps: EnrollmentStep[];
  /** Index of the next pending step. */
  currentIndex: number;
}
