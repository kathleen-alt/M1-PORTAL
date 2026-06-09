// ---------------------------------------------------------------------------
// Website enrichment.
//
// Fetches an organization's homepage (and an obvious staff/team/contact page
// if linked) and extracts public signals: phone, social profiles, mailto
// emails, and candidate decision-maker names paired with relevant titles.
// Pure HTML parsing — no key required — but needs outbound network at runtime;
// returns an empty result with a note when the network is blocked.
// ---------------------------------------------------------------------------

import type { ContactRole, Socials } from "../types";

export interface ScrapedContact {
  name: string;
  role: ContactRole;
}

export interface WebsiteEnrichment {
  phone?: string;
  socials: Socials;
  emails: string[];
  contacts: ScrapedContact[];
  reachable: boolean;
  note: string;
}

const ROLE_PATTERNS: { role: ContactRole; re: RegExp }[] = [
  { role: "Executive Director", re: /executive director/i },
  { role: "Pastor", re: /\b(lead |senior )?pastor\b/i },
  { role: "Recreation Director", re: /recreation (director|manager|coordinator)/i },
  { role: "Facilities Manager", re: /facilit(y|ies) (director|manager)/i },
  { role: "Operations Manager", re: /operations (director|manager)/i },
  { role: "Church Administrator", re: /church administrator|business administrator/i },
  { role: "Child Programming Manager", re: /(children'?s|child|youth|family) (ministry|programs?|director|coordinator|pastor)/i },
  { role: "General Manager", re: /general manager|managing director/i },
  { role: "Owner", re: /owner|founder|proprietor/i },
];

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OrcaCoastGrowthEngine/1.0 (+enrichment)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractSocials(html: string): Socials {
  const grab = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[0].replace(/["'>].*$/, "") : undefined;
  };
  return {
    linkedin: grab(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/[^\s"'<>]+/i),
    facebook: grab(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i),
    instagram: grab(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i),
    twitter: grab(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i),
  };
}

function extractEmails(html: string, domain: string): string[] {
  const found = new Set<string>();
  const re = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  for (const m of html.matchAll(re)) {
    const e = m[0].toLowerCase();
    if (e.endsWith(domain) || found.size < 5) found.add(e);
  }
  return Array.from(found).slice(0, 8);
}

function extractPhone(html: string): string | undefined {
  const tel = html.match(/tel:\+?[\d().\-\s]{7,}/i);
  if (tel) return clean(tel[0].replace(/^tel:/i, ""));
  const text = html.replace(/<[^>]+>/g, " ");
  const m = text.match(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return m ? clean(m[0]) : undefined;
}

/** Look for "Firstname Lastname … Title" pairings near role keywords. */
function extractContacts(html: string): ScrapedContact[] {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const out: ScrapedContact[] = [];
  const seen = new Set<string>();
  for (const { role, re } of ROLE_PATTERNS) {
    const idx = text.search(re);
    if (idx < 0) continue;
    // Window around the title; find a capitalized two-word name nearby.
    const window = text.slice(Math.max(0, idx - 60), idx + 60);
    const nameMatch = window.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/);
    if (nameMatch) {
      const name = `${nameMatch[1]} ${nameMatch[2]}`;
      if (!seen.has(name) && !/Director|Manager|Pastor|Ministry/.test(name)) {
        seen.add(name);
        out.push({ name, role });
      }
    }
    if (out.length >= 4) break;
  }
  return out;
}

export async function enrichFromWebsite(domain: string): Promise<WebsiteEnrichment> {
  const empty: WebsiteEnrichment = {
    socials: {},
    emails: [],
    contacts: [],
    reachable: false,
    note: "Website unreachable (outbound network blocked here). Runs in the deployed app.",
  };

  let html = await fetchText(`https://${domain}`);
  if (!html) return empty;

  // Follow one obvious staff/team/about/contact link for richer people data.
  const linkMatch = html.match(
    /href=["']([^"']*(?:staff|team|about|our-people|leadership|contact)[^"']*)["']/i,
  );
  if (linkMatch) {
    const href = linkMatch[1].startsWith("http")
      ? linkMatch[1]
      : `https://${domain}/${linkMatch[1].replace(/^\//, "")}`;
    const sub = await fetchText(href);
    if (sub) html += " " + sub;
  }

  return {
    phone: extractPhone(html),
    socials: extractSocials(html),
    emails: extractEmails(html, domain),
    contacts: extractContacts(html),
    reachable: true,
    note: "Enriched from organization website.",
  };
}
