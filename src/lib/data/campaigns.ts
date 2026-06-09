import type { Campaign, CadenceStep } from "../types";

/**
 * Default automated cadence (the spec's example). Users can clone & customize
 * timing per campaign in the Campaign Builder.
 */
export const DEFAULT_CADENCE: CadenceStep[] = [
  { day: 1, channel: "email", emailType: "first_touch", label: "Initial email" },
  { day: 4, channel: "email", emailType: "follow_up", label: "Follow-up email" },
  { day: 8, channel: "email", emailType: "case_study", label: "Case study email" },
  { day: 14, channel: "phone", label: "Phone call reminder" },
  { day: 21, channel: "email", emailType: "final_check_in", label: "Final email" },
  { day: 30, channel: "email", emailType: "value", label: "Long-term nurture sequence" },
];

export const CAMPAIGN_TEMPLATES: Campaign[] = [
  {
    id: "camp_ymca",
    name: "YMCA Campaign",
    vertical: "ymca",
    focusPoints: [
      "Family engagement",
      "Membership growth",
      "Child programming",
      "Facility modernization",
    ],
    cadence: DEFAULT_CADENCE,
  },
  {
    id: "camp_church",
    name: "Church Campaign",
    vertical: "church",
    focusPoints: [
      "Family ministry",
      "Children's programs",
      "Community engagement",
      "Youth growth",
    ],
    cadence: DEFAULT_CADENCE,
  },
  {
    id: "camp_daycare",
    name: "Daycare Campaign",
    vertical: "daycare",
    focusPoints: [
      "Child development",
      "Indoor activity space",
      "Safety",
      "Parent attraction",
    ],
    cadence: DEFAULT_CADENCE,
  },
  {
    id: "camp_recreation",
    name: "Recreation & Community Campaign",
    vertical: "recreation",
    focusPoints: [
      "Facility utilization",
      "Family memberships",
      "Community programming",
      "Capital improvement ROI",
    ],
    cadence: DEFAULT_CADENCE,
  },
];
