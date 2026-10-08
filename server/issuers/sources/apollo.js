// Apollo.io — decision-maker contacts for a prospect.
//
// Reading contacts out of press-release footers reached roughly a third of the
// list: plenty of issuers never print a name, and page furniture matches the
// same shape as a contact block. Apollo answers the question the footers could
// not -- who to call, and how -- so it supersedes the scraped contact rather
// than supplementing it, while the scraped one is kept for comparison.
//
// Needs APOLLO_API_KEY in the environment. Without it every call here is a
// no-op that reports `configured: false`, so a sweep still runs end to end on
// the public sources alone.
//
// Credits: search costs nothing. Revealing a work email costs one credit per
// person matched, so the caller decides how many people per company are worth
// buying (`maxPerCompany`) and nothing is revealed for a company that already
// has a fresh Apollo contact on file.

import { postJson } from '../http.js';

const BASE = process.env.APOLLO_API_BASE || 'https://api.apollo.io/api/v1';
const KEY = () => process.env.APOLLO_API_KEY || '';

export const configured = () => Boolean(KEY());

// Titles worth paying for, best first. An investor-relations lead is the whole
// point of the exercise; the chief executive is the fallback at an issuer too
// small to employ one, which is most of this universe.
const TITLE_QUERY = [
  'Investor Relations',
  'Corporate Communications',
  'Chief Communications Officer',
  'Chief Marketing Officer',
  'Chief Executive Officer',
  'President',
];

// A deputy or an assistant is not the principal: "Chief of Staff, Office of
// the CEO" must not be ranked as the chief executive.
const PROXY = /\b(chief of staff|office of the|assistant|deputy|interim deputy|executive assistant|advisor|advisory)\b/i;

// "Vice President" contains "President". Matching the latter naively ranked
// every vice president as the principal, so VP-shaped titles are detected
// first and excluded from the president rank.
const VP = /\b(vice[-\s]?president|VP|SVP|EVP|AVP)\b/i;

// Titles that are never the right call for investor-awareness work, however
// senior. Without this the search's similar-title matching returns every vice
// president in the company -- quality assurance, supply chain, engineering.
const OFF_TARGET =
  /\b(engineering|quality|supply chain|procurement|human resources|people|talent|legal|counsel|compliance|security|information technology|\bIT\b|clinical|regulatory|medical|scientific|research|manufactur|production|operations|retail|sales|customer|logistics|exploration|geolog|metallurg|sustainability|facilit)\b/i;

// Marketing that is not corporate communications. A product or demand-gen
// marketer is the wrong call for investor awareness, so only a company-level
// communications remit counts.
const NARROW_MARKETING =
  /\b(product|demand|growth|performance|field|channel|partner|content|digital|social|lifecycle|retail|trade|category|portfolio)\b/i;

// A divisional president runs a business unit, not the company: "President,
// Adult Use" and "President, Global Head Health & Innovation" are not the chief
// executive. An unqualified "President" at a junior issuer usually is.
function isDivisional(t) {
  const after = t.split(/\bpresident\b/i)[1] || '';
  return /^[\s]*[,|/&-]?\s*(of\s+|for\s+)?[A-Za-z]/.test(after) && !/^\s*(&|and)\s*(ceo|chief executive)/i.test(after);
}

/**
 * Rank a title against the three roles worth contacting, best first:
 * the investor-relations lead, then whoever owns corporate communications,
 * then the chief executive. Everything else -- finance, operations, divisional
 * presidents -- is not a target and returns null.
 */
function rankTitle(title) {
  const t = String(title || '');

  // Investor relations, however the title spells it: "Investor Relations",
  // "Investor and Public Relations", "Marketing and IR".
  if ((/investor/i.test(t) && /relations?/i.test(t)) || /\bIR\b/.test(t)) {
    return { rank: 0, label: 'investor relations' };
  }

  // Corporate communications: a company-level comms or PR remit, or a chief
  // marketing officer. Product and demand-gen marketing do not qualify.
  const commsRemit = /communications|public relations|\bPR\b/i.test(t)
    || /chief marketing officer|\bCMO\b/i.test(t);
  if (commsRemit && !NARROW_MARKETING.test(t) && !PROXY.test(t)) {
    return { rank: 1, label: 'corporate communications' };
  }

  if (/chief executive|\bCEO\b/i.test(t) && !PROXY.test(t)) {
    return { rank: 2, label: 'chief executive' };
  }

  // An unqualified president is the chief executive at most issuers this size;
  // a divisional one is not, and is dropped.
  if (/\bpresident\b/i.test(t) && !VP.test(t) && !PROXY.test(t) && !isDivisional(t)) {
    return { rank: 2, label: 'chief executive' };
  }

  return null;
}

/**
 * Score a person for how much we want their contact details.
 *
 * @returns {{rank:number, label:string}|null} null when the title is off-target
 */
export function classifyContact(title) {
  const t = String(title || '');
  const hit = rankTitle(t);
  if (!hit) return null;
  // An off-target word disqualifies unless the title is explicitly IR: "VP,
  // Investor Relations & Corporate Development" should survive, "VP Operations"
  // should not.
  if (OFF_TARGET.test(t) && hit.rank !== 0) return null;
  return hit;
}

function headers() {
  return { 'x-api-key': KEY() };
}

/**
 * Find candidate people at a set of company domains. Costs no credits and
 * returns no email addresses -- Apollo masks those until enrichment.
 *
 * @param {string[]} domains
 * @param {object} [opts]
 * @param {number} [opts.perPage]
 * @returns {Promise<object[]>} raw people records
 */
export async function searchPeople(domains, { perPage = 100, page = 1, cacheMs = 7 * 86400e3 } = {}) {
  if (!configured() || !domains.length) return [];
  const data = await postJson(`${BASE}/mixed_people/search`, {
    q_organization_domains_list: domains,
    person_titles: TITLE_QUERY,
    person_seniorities: ['c_suite', 'vp', 'director'],
    page,
    per_page: perPage,
  }, { headers: headers(), cacheMs });
  return data?.people || [];
}

/**
 * Pick the people worth revealing, best title first, capped per company.
 *
 * Apollo returns the employer on each person, so grouping is by the employer's
 * domain rather than by the query that found them.
 *
 * @param {object[]} people  raw search results
 * @param {number} maxPerCompany  default 1: the best of the three roles
 * @returns {Map<string, object[]>} domain -> chosen people
 */
export function selectContacts(people, maxPerCompany = 1) {
  const byDomain = new Map();

  for (const p of people) {
    const cls = classifyContact(p.title);
    if (!cls) continue;
    const domain = String(
      p.organization?.primary_domain || p.organization?.website_url || p.organization_domain || '',
    ).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
    if (!domain) continue;
    const list = byDomain.get(domain) || [];
    list.push({ ...p, _rank: cls.rank, _role: cls.label });
    byDomain.set(domain, list);
  }

  for (const [domain, list] of byDomain) {
    list.sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      // Prefer a record Apollo already knows an email for: a reveal that finds
      // nothing still costs the round trip and tells the caller nothing.
      const ae = a.has_email ? 0 : 1;
      const be = b.has_email ? 0 : 1;
      if (ae !== be) return ae - be;
      return String(b.last_refreshed_at || '').localeCompare(String(a.last_refreshed_at || ''));
    });
    // One person per role at most, so two CEOs never crowd out the IR lead.
    const seen = new Set();
    const picked = [];
    for (const p of list) {
      if (seen.has(p._role)) continue;
      seen.add(p._role);
      picked.push(p);
      if (picked.length >= maxPerCompany) break;
    }
    byDomain.set(domain, picked);
  }

  return byDomain;
}

/**
 * Reveal work emails for up to ten people. One credit per person matched.
 *
 * Phone numbers are deliberately not requested: Apollo returns those
 * asynchronously against a separate credit pool, which belongs in its own
 * stage rather than silently inside a contact sweep.
 *
 * @param {object[]} people  records carrying at least an Apollo `id`
 * @returns {Promise<object[]>} matched people, with email where Apollo had one
 */
export async function revealEmails(people) {
  if (!configured() || !people.length) return [];
  if (people.length > 10) throw new Error('revealEmails takes at most 10 people per call');
  const data = await postJson(`${BASE}/people/bulk_match`, {
    details: people.map((p) => (p.id ? { id: p.id } : { name: p.name, domain: p.domain })),
    reveal_personal_emails: false,
  }, { headers: headers(), cacheMs: 30 * 86400e3 });
  return data?.matches || [];
}

/** Flatten an Apollo person into the shape the store keeps. */
export function toContact(person, { role = null, revealed = null } = {}) {
  const src = revealed || person;
  const name = [src.first_name, src.last_name].filter(Boolean).join(' ').trim();
  return {
    apolloId: person.id || src.id || null,
    name: name || null,
    title: src.title || person.title || null,
    role,
    email: src.email && !/email_not_unlocked/i.test(src.email) ? src.email : null,
    emailStatus: src.email_status || null,
    phone: src.sanitized_phone || src.phone_number || null,
    linkedin: src.linkedin_url || null,
    city: src.city || null,
    state: src.state || null,
    country: src.country || null,
    seniority: src.seniority || null,
    lastRefreshed: person.last_refreshed_at || src.updated_at || null,
    source: 'apollo',
  };
}

export const meta = {
  id: 'apollo',
  label: 'Apollo.io (decision-maker contacts)',
  configured: configured(),
  note: configured()
    ? 'APOLLO_API_KEY present'
    : 'set APOLLO_API_KEY to enable; search is free, each revealed email costs 1 credit',
};
