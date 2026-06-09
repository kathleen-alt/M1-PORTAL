// ---------------------------------------------------------------------------
// Enrichment orchestrator.
//
// enrichLead() runs every available source against a lead and merges the
// results non-destructively (real data never overwrites better real data):
//   1. Signal inference  — category-calibrated firmographics (offline)
//   2. Website scraping   — phone, socials, emails, decision-maker names
//   3. Providers          — Hunter / Apollo (people) + Clearbit (company)
//   4. Email finding      — fill contact emails + role inboxes
// It mutates the lead in place and returns a report of what changed, including
// the resulting lift in Opportunity Score.
// ---------------------------------------------------------------------------

import type { Contact, Lead } from "../types";
import { computeScores } from "../prospecting/scoring";
import { inferSignals } from "./signals";
import { enrichFromWebsite } from "./website";
import { hunterDomain, apolloPeople, clearbitCompany, isDecisionMakerRole } from "./providers";
import { domainFromWebsite, findEmailsForLead } from "../sources/emailFinder";

export interface EnrichmentReport {
  domain?: string;
  websiteReachable: boolean;
  signalsAdded: string[];
  contactsAdded: { name: string; role: string; email?: string }[];
  emailsFilled: number;
  socials: string[];
  sources: string[];
  opportunityBefore: number;
  opportunityAfter: number;
  note: string;
}

const norm = (s: string) => s.toLowerCase().trim();

export async function enrichLead(lead: Lead): Promise<EnrichmentReport> {
  const opportunityBefore = computeScores(lead).opportunity;
  const domain = domainFromWebsite(lead.website);
  const sources: string[] = [];
  const contactsAdded: EnrichmentReport["contactsAdded"] = [];

  // 1. Signal inference (offline, always runs).
  const inferred = inferSignals(lead.industry, lead.name, lead.signals);
  Object.assign(lead.signals, inferred.signals);
  if (inferred.notes.length) sources.push("signal inference");

  // Helper to add a contact if we don't already have someone by that name.
  const existingNames = new Set(lead.contacts.map((c) => norm(c.name)));
  const addContact = (c: Omit<Contact, "id">) => {
    if (existingNames.has(norm(c.name))) return;
    existingNames.add(norm(c.name));
    const contact: Contact = { id: `enr_${Date.now()}_${lead.contacts.length}`, ...c };
    lead.contacts.push(contact);
    contactsAdded.push({ name: c.name, role: c.role, email: c.email });
  };

  let socials = lead.socials ?? {};

  if (domain) {
    // 2 + 3 run concurrently.
    const [people, apollo, company, web] = await Promise.all([
      hunterDomain(domain),
      apolloPeople(domain),
      clearbitCompany(domain),
      enrichFromWebsite(domain),
    ]);

    if (people.length) sources.push("Hunter");
    if (apollo.length) sources.push("Apollo");
    if (company) sources.push("Clearbit");
    if (web.reachable) sources.push("website");

    for (const p of [...people, ...apollo]) {
      if (!p.name) continue;
      addContact({
        name: p.name,
        role: p.role,
        email: p.email,
        linkedin: p.linkedin,
        confidence: p.confidence,
        isDecisionMaker: isDecisionMakerRole(p.role),
      });
    }

    for (const c of web.contacts) {
      addContact({ name: c.name, role: c.role, confidence: 55, isDecisionMaker: isDecisionMakerRole(c.role) });
    }

    // Company firmographics (only fill missing).
    if (company?.orgSize && lead.signals.orgSize == null) {
      lead.signals.orgSize = company.orgSize;
      inferred.notes.push(`Org size: ${company.orgSize} (Clearbit)`);
    }

    // Website contact channels.
    if (web.phone && !lead.phone) lead.phone = web.phone;
    socials = { ...web.socials, ...socials, ...(company?.linkedin ? { linkedin: company.linkedin } : {}) };
  }

  // 4. Fill contact emails (pattern/Hunter) + role inboxes when no person known.
  const emailResult = await findEmailsForLead(lead);
  if (emailResult.filled.length) sources.push("email finder");

  lead.socials = socials;
  lead.enrichedAt = new Date().toISOString();
  // Confidence rises with the number of sources that contributed.
  lead.dataConfidence = Math.min(95, lead.dataConfidence + sources.length * 6);

  const opportunityAfter = computeScores(lead).opportunity;

  return {
    domain,
    websiteReachable: domain ? sources.includes("website") : false,
    signalsAdded: inferred.notes,
    contactsAdded,
    emailsFilled: emailResult.filled.length,
    socials: Object.entries(socials)
      .filter(([, v]) => v)
      .map(([k]) => k),
    sources,
    opportunityBefore,
    opportunityAfter,
    note:
      sources.length > 1
        ? `Enriched from ${sources.length} source(s).`
        : "Enriched with category-calibrated estimates. Add HUNTER/APOLLO/CLEARBIT keys (and runtime network) for live contact + firmographic data.",
  };
}
