// ---------------------------------------------------------------------------
// Third-party enrichment providers (key-gated). Each returns a normalized
// shape so the orchestrator can merge them uniformly. All no-op (return null)
// when their API key is absent, so the app runs without them.
// ---------------------------------------------------------------------------

import type { ContactRole } from "../types";

export interface ProviderPerson {
  name: string;
  role: ContactRole;
  email?: string;
  linkedin?: string;
  confidence: number;
}

export interface ProviderCompany {
  orgSize?: number;
  locationCount?: number;
  linkedin?: string;
}

function mapRole(title?: string): ContactRole {
  const t = (title ?? "").toLowerCase();
  if (/executive director/.test(t)) return "Executive Director";
  if (/pastor/.test(t)) return "Pastor";
  if (/recreation/.test(t)) return "Recreation Director";
  if (/facilit/.test(t)) return "Facilities Manager";
  if (/operations/.test(t)) return "Operations Manager";
  if (/administrator/.test(t)) return "Church Administrator";
  if (/(child|youth|family)/.test(t)) return "Child Programming Manager";
  if (/general manager|gm\b/.test(t)) return "General Manager";
  if (/owner|founder/.test(t)) return "Owner";
  return "Other";
}

const DECISION_ROLES = new Set<ContactRole>([
  "Executive Director", "Pastor", "Recreation Director", "Facilities Manager",
  "Operations Manager", "Church Administrator", "General Manager", "Owner",
]);

/** Hunter.io Domain Search → people + emails for a domain. */
export async function hunterDomain(domain: string): Promise<ProviderPerson[]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${key}`,
      { signal: AbortSignal.timeout(12_000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const emails = json?.data?.emails ?? [];
    return emails
      .filter((e: any) => e.first_name && e.last_name)
      .map((e: any): ProviderPerson => {
        const role = mapRole(e.position);
        return {
          name: `${e.first_name} ${e.last_name}`,
          role,
          email: e.value,
          linkedin: e.linkedin || undefined,
          confidence: e.confidence ?? 60,
        };
      });
  } catch {
    return [];
  }
}

/** Apollo.io People Search → decision-makers for a domain. */
export async function apolloPeople(domain: string): Promise<ProviderPerson[]> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        q_organization_domains: domain,
        person_titles: ["executive director", "operations manager", "facilities manager", "owner", "general manager", "pastor"],
        page: 1,
        per_page: 10,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.people ?? []).map((p: any): ProviderPerson => ({
      name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      role: mapRole(p.title),
      email: p.email || undefined,
      linkedin: p.linkedin_url || undefined,
      confidence: 65,
    }));
  } catch {
    return [];
  }
}

/** Clearbit Company → firmographics for a domain. */
export async function clearbitCompany(domain: string): Promise<ProviderCompany | null> {
  const key = process.env.CLEARBIT_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      orgSize: json?.metrics?.employees ?? undefined,
      linkedin: json?.linkedin?.handle ? `https://linkedin.com/${json.linkedin.handle}` : undefined,
    };
  } catch {
    return null;
  }
}

export function isDecisionMakerRole(role: ContactRole): boolean {
  return DECISION_ROLES.has(role);
}
