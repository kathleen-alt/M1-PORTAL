import type { Lead } from "../types";

/**
 * No seeded leads. The app does not ship fabricated prospects — leads are REAL
 * organizations you bring in via Import (paste a list / CSV) or live sourcing
 * (OpenStreetMap / Google Places), then enrich and work. The only seeded data
 * in this app is the real historical PORTFOLIO in orcaProjects.ts.
 */
export const SEED_LEADS: Lead[] = [];
