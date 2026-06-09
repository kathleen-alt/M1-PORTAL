// ---------------------------------------------------------------------------
// Bulk lead importer.
//
// Turns a pasted list or CSV into scored, tiered leads. Accepts flexible input
// so users can paste directly from directories, spreadsheets, or Google
// searches. Each line becomes a Lead, classified into the taxonomy and ready
// for the recommendation engine. Works fully offline.
//
// Supported per-line formats (delimiter = comma OR tab OR " - " OR " | "):
//   Name
//   Name, City, REGION
//   Name, City, REGION, Website
//   Name, City, REGION, Website, Phone
// A header row (containing "name") is detected and skipped.
// ---------------------------------------------------------------------------

import type { Country, Industry, Lead } from "../types";
import { classifyIndustry } from "../classify";
import { industryTier } from "../taxonomy";
import { findRegion, countryForRegion } from "./regions";

export interface ImportRow {
  name: string;
  city?: string;
  region?: string;
  country?: Country;
  website?: string;
  phone?: string;
  industry: Industry;
  tier: number;
  confidence: number;
  warning?: string;
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  if (line.includes(",")) return line.split(",");
  if (line.includes(" - ")) return line.split(" - ");
  return [line];
}

const clean = (s?: string) => (s ?? "").trim();

/** Parse raw text into structured, classified rows (no side effects). */
export function parseImport(
  text: string,
  defaults?: { region?: string; country?: Country },
): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ImportRow[] = [];
  for (const line of lines) {
    const parts = splitLine(line).map(clean);
    const name = parts[0];
    if (!name) continue;
    // Skip an obvious header row.
    if (/^name$/i.test(name) || (parts.length > 1 && /^name$/i.test(name))) continue;

    let city = parts[1] || undefined;
    let regionRaw = parts[2] || undefined;
    let website = parts.find((p) => /\.[a-z]{2,}/i.test(p) && /\b(www|http|\.com|\.ca|\.org|\.net)\b/i.test(p));
    let phone = parts.find((p) => /\+?\d[\d\s().-]{6,}\d/.test(p));

    // Region resolution: explicit column → scan whole line → caller default.
    let region: string | undefined;
    let country: Country | undefined;
    if (regionRaw && countryForRegion(regionRaw)) {
      region = regionRaw.toUpperCase();
      country = countryForRegion(region)!;
    } else {
      const found = findRegion(line);
      if (found) {
        region = found.region;
        country = found.country;
      } else if (defaults?.region) {
        region = defaults.region.toUpperCase();
        country = defaults.country ?? countryForRegion(region);
      }
    }

    // If the would-be city is actually a region/website/phone, drop it.
    if (city && (countryForRegion(city) || /\d/.test(city) || /\.[a-z]{2,}/i.test(city))) {
      city = undefined;
    }

    const { industry, confidence } = classifyIndustry(name, regionRaw);
    rows.push({
      name,
      city,
      region,
      country,
      website: website || undefined,
      phone: phone || undefined,
      industry,
      tier: industryTier(industry),
      confidence,
      warning: !region ? "No province/state detected — set a default region." : undefined,
    });
  }
  return rows;
}

/** Convert parsed rows into Leads ready for the store. */
export function rowsToLeads(rows: ImportRow[]): Lead[] {
  return rows
    .filter((r) => r.region && r.country)
    .map((r, i) => ({
      id: `imp_${Date.now()}_${i}`,
      name: r.name,
      industry: r.industry,
      website: r.website,
      phone: r.phone,
      address: { city: r.city ?? "", region: r.region!, country: r.country! },
      contacts: [],
      signals: {
        // Child focus is inferred from the category in taxonomy; left otherwise
        // empty so the user/enrichment can fill real signals later.
      },
      dataConfidence: r.confidence,
      source: "directory" as const,
      stage: "New Lead" as const,
      createdAt: new Date().toISOString(),
    }));
}
