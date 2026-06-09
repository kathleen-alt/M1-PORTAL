// ---------------------------------------------------------------------------
// Email finder.
//
// Produces deliverable contact emails two ways:
//   1. Pattern inference from a person's name + the org's website domain
//      (first.last@, flast@, …) — works offline, ranked by how common each
//      pattern is. This is the same fallback strategy commercial finders use.
//   2. Hunter.io Email Finder when HUNTER_API_KEY is set (verified + scored).
//
// For organizations with no known person yet, it generates role inboxes
// (info@, office@) so the team always has a first-touch address.
// ---------------------------------------------------------------------------

import type { Contact, Lead } from "../types";

export interface EmailCandidate {
  email: string;
  pattern: string;
  confidence: number;
  source: "pattern" | "hunter" | "role";
}

/** Extract a bare domain from a website URL or string. */
export function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  let d = website.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split(/[/?#]/)[0];
  return d && d.includes(".") ? d : undefined;
}

function nameParts(full: string): { first?: string; last?: string } {
  const cleaned = full.replace(/^(dr\.?|pastor|mr\.?|ms\.?|mrs\.?|rev\.?)\s+/i, "").trim();
  const bits = cleaned.split(/\s+/).filter(Boolean);
  if (bits.length === 0) return {};
  if (bits.length === 1) return { first: bits[0] };
  return { first: bits[0], last: bits[bits.length - 1] };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Ranked candidate emails for a person at a domain (most common first). */
export function guessEmails(fullName: string, domain: string): EmailCandidate[] {
  const { first, last } = nameParts(fullName);
  if (!first) return [];
  const f = norm(first);
  const out: EmailCandidate[] = [];
  const add = (local: string, pattern: string, confidence: number) =>
    out.push({ email: `${local}@${domain}`, pattern, confidence, source: "pattern" });

  if (last) {
    const l = norm(last);
    add(`${f}.${l}`, "first.last", 62);
    add(`${f[0]}${l}`, "flast", 55);
    add(`${f}${l}`, "firstlast", 45);
    add(`${f}_${l}`, "first_last", 40);
    add(`${f}`, "first", 35);
    add(`${l}.${f}`, "last.first", 28);
  } else {
    add(`${f}`, "first", 40);
  }
  return out;
}

async function hunterFind(
  fullName: string,
  domain: string,
): Promise<EmailCandidate | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  const { first, last } = nameParts(fullName);
  if (!first || !last) return null;
  try {
    const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(
      domain,
    )}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(
      last,
    )}&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const json = await res.json();
    const email = json?.data?.email;
    if (!email) return null;
    return { email, pattern: "hunter", confidence: json.data.score ?? 75, source: "hunter" };
  } catch {
    return null;
  }
}

/** Best available email for one contact at a domain (Hunter, else top guess). */
export async function findEmailForContact(
  name: string,
  domain: string,
): Promise<EmailCandidate | null> {
  const hunter = await hunterFind(name, domain);
  if (hunter) return hunter;
  return guessEmails(name, domain)[0] ?? null;
}

function roleInboxes(domain: string): Contact[] {
  return [
    { id: `role_info_${domain}`, name: "General Inbox", role: "Other", email: `info@${domain}`, confidence: 45, isDecisionMaker: false },
    { id: `role_office_${domain}`, name: "Office", role: "Other", email: `office@${domain}`, confidence: 40, isDecisionMaker: false },
  ];
}

export interface FindEmailsResult {
  domain?: string;
  filled: { name: string; email: string; source: string; confidence: number }[];
  note: string;
}

/**
 * Fill in emails on a lead's contacts (mutates the lead). Contacts that already
 * have an email are left untouched. When the lead has no contacts, role inboxes
 * are added so there's always a first-touch address.
 */
export async function findEmailsForLead(lead: Lead): Promise<FindEmailsResult> {
  const domain = domainFromWebsite(lead.website);
  if (!domain) {
    return { filled: [], note: "No website on this lead — add one to infer emails, or set HUNTER_API_KEY." };
  }

  const filled: FindEmailsResult["filled"] = [];

  for (const c of lead.contacts) {
    if (c.email) continue;
    const found = await findEmailForContact(c.name, domain);
    if (found) {
      c.email = found.email;
      // Blend contact data confidence with the email pattern confidence.
      c.confidence = Math.round((c.confidence + found.confidence) / 2);
      filled.push({ name: c.name, email: found.email, source: found.source, confidence: found.confidence });
    }
  }

  if (lead.contacts.length === 0) {
    for (const inbox of roleInboxes(domain)) {
      lead.contacts.push(inbox);
      filled.push({ name: inbox.name, email: inbox.email!, source: "role", confidence: inbox.confidence });
    }
  }

  return {
    domain,
    filled,
    note: filled.length
      ? `Found ${filled.length} email(s) for ${domain}.`
      : "All contacts already have emails.",
  };
}
