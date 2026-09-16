// Company website scanner.
//
// Market data tells you a company is invisible. Its website tells you whether
// anyone is already being paid to fix that — the single most valuable
// qualification signal in the POC model, because an issuer that already retains
// an IR agency is not a prospect, and one whose release footer points at an
// in-house address is.
//
// The crawl is deliberately small and polite: robots.txt is honoured, at most a
// handful of pages per company, and everything is cached.

import { get, HttpError } from '../http.js';

// IR / PR agencies whose names turn up in release footers and IR pages. A hit
// here means the mandate is already held by someone.
const AGENCIES = [
  'ICR Inc', 'ICR, LLC', 'Gateway Group', 'Gateway Investor Relations', 'MZ Group', 'MZ North America',
  'Lytham Partners', 'KCSA Strategic Communications', 'Renmark Financial Communications', 'Adelaide Capital',
  'Sophic Capital', 'RB Milestone Group', 'RBMG', 'Hayden IR', 'CORE IR', 'Skyline Corporate Communications',
  'Alpha IR Group', 'Edison Group', 'Integrous Communications', 'Stern Investor Relations', 'LifeSci Advisors',
  'Investor Cubed', 'Harbor Access', 'PCG Advisory', 'Dolphin Entertainment', 'Crescendo Communications',
  'The Blueshirt Group', 'Gilmartin Group', 'Westwicke', 'Financial Profiles', 'Three Part Advisors',
  'Darrow Associates', 'The Chesapeake Group', 'JTC Team', 'Lambert & Co', 'TTC Group', 'RedChip Companies',
  'Catalyst IR', 'Reevemark', 'Joele Frank', 'Sard Verbinnen', 'FTI Consulting', 'Kingsdale Advisors',
  'Longview Communications', 'NATIONAL Public Relations', 'Proconsul Capital', 'Capital Markets Communications',
  'CHF Capital Markets', 'Arrowhead Business and Investment Decisions', 'Vic Allgeier', 'TiconIR',
  'Elevate IR', 'IBN', 'InvestorBrandNetwork', 'Market One Media Group',
];

const IR_PATHS = [
  '/investors', '/investor-relations', '/investors/', '/ir', '/investor',
  '/en/investors', '/investors/overview', '/investor-relations/overview',
  '/news', '/news-releases', '/press-releases', '/media/news', '/investors/news',
  '/contact', '/contact-us', '/about/contact',
  '/careers', '/jobs',
];

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IR_EMAIL_RE = /^(ir|investors?|investorrelations|investor\.relations|ir-?info|info|contact|media|press|comms?)@/i;
const JOB_RE =
  /\b(investor relations|ir)\s+(manager|director|associate|analyst|specialist|coordinator|lead)\b|\bdirector,?\s+investor relations\b|\bhead of (investor relations|ir|communications)\b/i;

// Ignore the asset/vendor noise that otherwise dominates an email sweep.
const EMAIL_NOISE = /(sentry|wixpress|example|domain|yourcompany|godaddy|\.png|\.jpg|\.webp|@2x)/i;

/** Strip tags, scripts and entities; keep readable text for pattern matching. */
function toText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function absolutize(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Pull every same-origin link with its anchor text. */
function links(html, base) {
  const out = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = absolutize(m[1], base);
    if (!url || !/^https?:/i.test(url)) continue;
    out.push({ url, text: toText(m[2]).slice(0, 120) });
  }
  return out;
}

/** Minimal robots.txt check for our user-agent. */
async function robotsDisallow(origin) {
  const body = await get(`${origin}/robots.txt`, { cacheMs: 7 * 86400e3, retries: 0, allow404: true, timeoutMs: 8000 })
    .catch(() => null);
  if (!body) return () => false;

  const rules = [];
  let applies = false;
  for (const line of body.split('\n')) {
    const [rawKey, ...rest] = line.split('#')[0].split(':');
    const key = (rawKey || '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') applies = value === '*';
    else if (applies && key === 'disallow' && value) rules.push(value);
  }
  return (pathname) => rules.some((r) => r !== '/' && pathname.startsWith(r)) || rules.includes('/');
}

/** The trailing block of a release page, where contact details live. */
function footerOf(text) {
  return text.slice(-2500);
}

function findAgencies(text) {
  const hits = new Set();
  for (const a of AGENCIES) {
    // Loosen punctuation so "ICR, LLC" matches "ICR LLC".
    const re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[,\s]+/g, '[,\\s]+'), 'i');
    if (re.test(text)) hits.add(a);
  }
  return [...hits];
}

function findEmails(text) {
  const all = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
  return all.filter((e) => !EMAIL_NOISE.test(e)).slice(0, 25);
}

function findSocials(all) {
  const pick = (re) => [...new Set(all.filter((l) => re.test(l.url)).map((l) => l.url))].slice(0, 4);
  return {
    linkedin: pick(/linkedin\.com\/(company|in)\//i),
    x: pick(/(twitter\.com|x\.com)\//i),
    youtube: pick(/youtube\.com\//i),
    stocktwits: pick(/stocktwits\.com\//i),
  };
}

/**
 * Crawl a company site for IR posture.
 *
 * @param {string} website  homepage URL
 * @param {object} [opts]
 * @param {number} [opts.maxPages] page budget per company (default 6)
 * @returns {Promise<object>} scan result — never throws for ordinary site errors
 */
export async function scanSite(website, { maxPages = 6, cacheMs = 14 * 86400e3 } = {}) {
  const started = Date.now();
  const result = {
    website: null,
    reachable: false,
    pagesScanned: [],
    irPages: [],
    emails: [],
    irEmails: [],
    agencies: [],
    irJobPosting: null,
    socials: {},
    contactBlocks: [],
    error: null,
    scannedAt: new Date().toISOString(),
  };

  let origin;
  try {
    const u = new URL(/^https?:/i.test(website) ? website : `https://${website}`);
    origin = u.origin;
    result.website = u.origin;
  } catch {
    result.error = 'invalid website URL';
    return result;
  }

  let disallowed;
  try {
    disallowed = await robotsDisallow(origin);
  } catch {
    disallowed = () => false;
  }

  const fetchPage = async (url) => {
    try {
      if (disallowed(new URL(url).pathname)) return null;
      const html = await get(url, { cacheMs, retries: 1, timeoutMs: 15000, allow404: true });
      if (!html || !/<html|<body|<a\b/i.test(html)) return null;
      result.pagesScanned.push(url);
      return html;
    } catch (err) {
      if (err instanceof HttpError) return null;
      return null;
    }
  };

  const home = await fetchPage(origin);
  if (!home) {
    result.error = 'homepage unreachable';
    return result;
  }
  result.reachable = true;

  const homeLinks = links(home, origin);
  result.socials = findSocials(homeLinks);

  // Prefer IR links the site itself advertises; fall back to conventional paths.
  const irLinked = homeLinks
    .filter(
      (l) =>
        new URL(l.url).origin === origin &&
        (/investor|shareholder/i.test(l.url) || /investor|shareholder/i.test(l.text)),
    )
    .map((l) => l.url);

  const queue = [...new Set([...irLinked, ...IR_PATHS.map((p) => `${origin}${p}`)])].slice(0, maxPages * 3);

  const texts = [{ url: origin, text: toText(home) }];
  for (const url of queue) {
    if (result.pagesScanned.length >= maxPages) break;
    if (result.pagesScanned.includes(url)) continue;
    const html = await fetchPage(url);
    if (!html) continue;
    if (/investor|shareholder/i.test(url)) result.irPages.push(url);
    texts.push({ url, text: toText(html) });
  }

  const corpus = texts.map((t) => t.text).join('\n');
  const footers = texts.map((t) => footerOf(t.text)).join('\n');

  result.emails = findEmails(corpus);
  result.irEmails = result.emails.filter((e) => IR_EMAIL_RE.test(e));
  // Footer hits are the "footer-verified" standard from the POC sheet; a stray
  // mention elsewhere on the site is weaker evidence, so record where it came from.
  result.agencies = findAgencies(footers).map((name) => ({ name, evidence: 'footer' }));
  const bodyOnly = findAgencies(corpus).filter((n) => !result.agencies.some((a) => a.name === n));
  result.agencies.push(...bodyOnly.map((name) => ({ name, evidence: 'page body' })));

  const jobPage = texts.find((t) => /career|job/i.test(t.url) && JOB_RE.test(t.text));
  if (jobPage) {
    result.irJobPosting = { url: jobPage.url, excerpt: (jobPage.text.match(JOB_RE) || [''])[0] };
  }

  // Capture the "Investor Relations Contact:" style block verbatim for the CRM.
  for (const t of texts) {
    const m = t.text.match(
      /((?:investor relations|ir|media|press)\s*(?:&|and)?\s*(?:contact|inquiries|relations)?\s*:?[\s\S]{0,320})/i,
    );
    if (m && EMAIL_RE.test(m[1])) {
      result.contactBlocks.push({ url: t.url, text: m[1].replace(/\s+/g, ' ').trim().slice(0, 320) });
      EMAIL_RE.lastIndex = 0;
    }
    if (result.contactBlocks.length >= 3) break;
  }

  result.durationMs = Date.now() - started;
  return result;
}

/** Turn a raw scan into the qualification fields the model consumes. */
export function deriveSiteSignals(scan) {
  if (!scan?.reachable) return { irPosture: 'unknown', hasIncumbentAgency: null };
  const footerAgency = scan.agencies.find((a) => a.evidence === 'footer');
  return {
    irPosture: footerAgency ? 'agency-retained' : scan.irEmails.length ? 'in-house' : 'no-visible-ir',
    hasIncumbentAgency: Boolean(footerAgency),
    incumbentAgency: footerAgency?.name || scan.agencies[0]?.name || null,
    incumbentEvidence: footerAgency ? 'release/page footer' : scan.agencies[0] ? 'page body' : null,
    irEmail: scan.irEmails[0] || null,
    irJobPosting: scan.irJobPosting?.url || null,
    hasIrPage: scan.irPages.length > 0,
    linkedin: scan.socials?.linkedin?.[0] || null,
  };
}

export const meta = { id: 'site', label: 'Company website / IR page scan', agencies: AGENCIES.length };
