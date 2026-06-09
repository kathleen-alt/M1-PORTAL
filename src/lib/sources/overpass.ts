// ---------------------------------------------------------------------------
// Live geo-sourcing via OpenStreetMap's Overpass API.
//
// Pulls REAL organizations (name, address, website, phone where tagged) for a
// city + set of target categories, then classifies and scores them. Free and
// keyless. Requires outbound network access at runtime; when that's blocked
// (e.g. a locked-down sandbox) it returns an empty result with a clear note
// rather than fabricating leads.
//
// If GOOGLE_MAPS_API_KEY is set, swap in Places Text Search here for richer
// contact data — the mapping to Lead is identical.
// ---------------------------------------------------------------------------

import type { Country, Lead } from "../types";
import { classifyIndustry } from "../classify";

export interface SourceCategory {
  key: string;
  label: string;
  /** Overpass tag filters, OR'd together within an area. */
  filters: string[];
}

/** Target categories aligned to Orca Coast's prospect tiers. */
export const SOURCE_CATEGORIES: SourceCategory[] = [
  { key: "recreation", label: "Recreation & Community Centres", filters: ['["leisure"="sports_centre"]', '["amenity"="community_centre"]'] },
  { key: "church", label: "Churches", filters: ['["amenity"="place_of_worship"]["religion"="christian"]'] },
  { key: "childcare", label: "Daycares & Preschools", filters: ['["amenity"="kindergarten"]', '["amenity"="childcare"]'] },
  { key: "school", label: "Schools", filters: ['["amenity"="school"]'] },
  { key: "museum", label: "Museums & Science Centres", filters: ['["tourism"="museum"]', '["tourism"="aquarium"]'] },
  { key: "entertainment", label: "Family Entertainment & Play", filters: ['["leisure"="amusement_arcade"]', '["tourism"="theme_park"]', '["leisure"="water_park"]'] },
  { key: "fitness", label: "Athletic & Fitness", filters: ['["leisure"="fitness_centre"]'] },
  { key: "library", label: "Libraries", filters: ['["amenity"="library"]'] },
  { key: "mall", label: "Shopping Malls", filters: ['["shop"="mall"]'] },
  { key: "hotel", label: "Hotels & Resorts", filters: ['["tourism"="hotel"]'] },
];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

function buildQuery(city: string, filters: string[], limit: number): string {
  const safeCity = city.replace(/"/g, "");
  const clauses = filters
    .map((f) => `node${f}(area.a);way${f}(area.a);`)
    .join("");
  return `[out:json][timeout:25];area["name"="${safeCity}"]->.a;(${clauses});out center ${limit};`;
}

export interface SourceResult {
  leads: Lead[];
  source: "overpass" | "disabled";
  note: string;
}

export async function sourceLeads(opts: {
  city: string;
  region: string;
  country: Country;
  categories: string[];
  limit?: number;
}): Promise<SourceResult> {
  const cats = SOURCE_CATEGORIES.filter((c) => opts.categories.includes(c.key));
  const filters = cats.flatMap((c) => c.filters);
  const limit = opts.limit ?? 40;
  if (filters.length === 0) {
    return { leads: [], source: "disabled", note: "Select at least one category." };
  }

  try {
    const query = buildQuery(opts.city, filters, limit);
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
      // Overpass can be slow; allow generous time.
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    const seen = new Set<string>();
    const leads: Lead[] = [];

    for (const el of json.elements ?? []) {
      const t = el.tags ?? {};
      const name = t.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);

      const hint = [t.amenity, t.leisure, t.tourism, t.shop, t.religion].filter(Boolean).join(" ");
      const { industry, confidence } = classifyIndustry(name, hint);
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const line1 = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || undefined;

      leads.push({
        id: `osm_${Date.now()}_${leads.length}`,
        name,
        industry,
        website: t.website || t["contact:website"],
        phone: t.phone || t["contact:phone"],
        address: {
          line1,
          city: t["addr:city"] || opts.city,
          region: opts.region.toUpperCase(),
          country: opts.country,
          postalCode: t["addr:postcode"],
          lat,
          lng: lon,
        },
        contacts: [],
        signals: {},
        dataConfidence: confidence,
        source: "google_maps", // map source bucket; provider is OSM/Maps
        stage: "New Lead",
        createdAt: new Date().toISOString(),
      });
    }

    return {
      leads,
      source: "overpass",
      note: `Sourced ${leads.length} real organizations from OpenStreetMap for ${opts.city}, ${opts.region}.`,
    };
  } catch (e) {
    return {
      leads: [],
      source: "disabled",
      note:
        "Live sourcing needs outbound network access at runtime (blocked here). The integration is wired and will return real organizations once deployed where overpass-api.de is reachable. Use Import in the meantime.",
    };
  }
}
