// Campaign export — one row per person, not per issuer.
//
// The prospect workbook is organised around the company and carries forty
// columns of evidence, which is right for deciding who to approach and wrong
// for a mail-merge. A sending tool wants a contact, a first name to greet them
// by, and a couple of fields worth writing a sentence around.
//
// Only issuers that clear the model are exported: past the floors, not a
// current client, and with somebody reachable in one of the three buying roles.
// Everything else is noise in a campaign.

import { serviceTier, hasReachableContact } from './score.js';

const money = (v) => {
  if (v == null) return '';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
};
const pctOf = (v) => (v == null ? '' : `${Math.round(v * 100)}%`);

/**
 * Exchange directories append the instrument to the issuer name. In a merge
 * field that reads as "...at Westwater Resources Inc. Common Stock", so strip
 * it here rather than leaving it for whoever writes the email.
 */
export function cleanCompany(name) {
  return String(name || '')
    .replace(/\s*[-,]?\s*(Class\s+[A-Z]\s+)?(Common\s+(Stock|Shares)|Ordinary\s+Shares?|Subordinate\s+Voting\s+Shares?|Shares?\s+of\s+Beneficial\s+Interest|American\s+Depositary\s+Shares?|ADS)\b.*$/i, '')
    .replace(/\s*\((?:Nasdaq|NYSE|TSXV?|CSE|OTCQ[XB])[^)]*\)\s*$/i, '')
    .trim();
}

/** Split a full name for the merge fields a sending tool expects. */
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  // A middle initial belongs with neither half; drop it from the surname.
  const last = parts[parts.length - 1];
  return { first: parts[0], last };
}

/**
 * The reasons this issuer is worth a message, strongest first.
 *
 * These are merge fields, so each one has to read as a clause a human could
 * drop into a sentence rather than as a statistic.
 */
export function hooks(it) {
  const out = [];
  const r = it.newsReaction;
  if (r?.flatShare != null && r.measured >= 3 && r.flatShare >= 0.5) {
    out.push(`${Math.round(r.flatShare * 100)}% of their last ${r.measured} releases moved neither price nor volume`);
  }
  const raise = (it.closedFinancings || [])[0];
  if (raise?.date) {
    out.push(`closed ${raise.amount || 'a financing'}${raise.type ? ` (${raise.type})` : ''} on ${raise.date}`);
  }
  if (it.hasIncumbentAgency === false) out.push('no IR agency named in their release footers');
  if (it.drawdownPct != null && it.drawdownPct <= -0.5) {
    out.push(`trading ${Math.abs(Math.round(it.drawdownPct * 100))}% below its 52-week high`);
  }
  if (it.watchers && it.avgDollarVolume3m != null && it.watchers >= 500) {
    const per = it.avgDollarVolume3m / it.watchers;
    if (per < 40) out.push(`${it.watchers.toLocaleString()} StockTwits watchers but only $${per.toFixed(0)} traded per watcher`);
  }
  if (it.social?.scannedAt && !(it.social.linkedin || it.social.x || it.social.youtube)) {
    out.push('no LinkedIn, X or YouTube presence found');
  }
  if (it.undervaluedQuote?.quote) out.push('management has called the company undervalued in its own release');
  return out;
}

export const CAMPAIGN_COLUMNS = [
  ['email', 'Email'],
  ['firstName', 'First Name'],
  ['lastName', 'Last Name'],
  ['title', 'Title'],
  ['role', 'Role Reached'],
  ['company', 'Company'],
  ['symbol', 'Symbol'],
  ['exchange', 'Exchange'],
  ['website', 'Website'],
  ['package', 'Package Fit'],
  ['fitScore', 'Fit Score'],
  ['tier', 'Tier'],
  ['marketCap', 'Market Cap'],
  ['dollarVolume', '$ Volume/day'],
  ['drawdown', 'Drawdown'],
  ['watchers', 'Watchers'],
  ['hook1', 'Why Now 1'],
  ['hook2', 'Why Now 2'],
  ['hook3', 'Why Now 3'],
  ['phone', 'Phone'],
  ['linkedin', 'LinkedIn'],
  ['emailStatus', 'Email Status'],
  ['emailRisk', 'Email Risk'],
  ['contactSource', 'Contact Source'],
];

/**
 * @param {object[]} issuers
 * @param {object} [opts]
 * @param {boolean} [opts.verifiedOnly] drop anything but a verified address
 * @param {boolean} [opts.excludeCatchall] drop catch-all domains
 * @returns {object[]} one row per contact
 */
export function toCampaignRows(issuers, { verifiedOnly = false, excludeCatchall = false } = {}) {
  const rows = [];
  for (const it of issuers) {
    if (it.isClient) continue;
    if (it.fit?.eligible === false) continue;
    if (!hasReachableContact(it)) continue;

    for (const c of it.apolloContacts || []) {
      if (!c?.email) continue;
      if (verifiedOnly && c.emailStatus && c.emailStatus !== 'verified') continue;
      if (excludeCatchall && c.catchall) continue;

      const { first, last } = splitName(c.name);
      const h = hooks(it);
      rows.push({
        email: c.email,
        firstName: first,
        lastName: last,
        title: c.title || '',
        role: c.role || '',
        company: cleanCompany(it.name),
        symbol: it.symbol || '',
        exchange: it.exchange || '',
        website: it.website || '',
        package: serviceTier(it).tier === 'unknown' ? '' : serviceTier(it).tier,
        fitScore: it.fit?.score ?? '',
        tier: it.fit?.tier ?? '',
        marketCap: money(it.marketCap),
        dollarVolume: money(it.avgDollarVolume3m),
        drawdown: pctOf(it.drawdownPct),
        watchers: it.watchers ?? '',
        hook1: h[0] || '',
        hook2: h[1] || '',
        hook3: h[2] || '',
        phone: c.phone || '',
        linkedin: c.linkedin || '',
        emailStatus: c.emailStatus || '',
        // A catch-all server accepts any address, so "verified" there means the
        // domain answered, not that this mailbox exists. Sending to those first
        // is how a domain's reputation gets burned.
        emailRisk: c.catchall ? 'catch-all domain — verify before sending' : '',
        contactSource: c.source || 'apollo',
      });
    }
  }
  // Best-fit first so a capped send takes the best of the list.
  rows.sort((a, b) => (Number(b.fitScore) || 0) - (Number(a.fitScore) || 0));
  return rows;
}

export function toCampaignCsv(rows) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/\s+/g, ' ').trim();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = CAMPAIGN_COLUMNS.map(([, label]) => esc(label)).join(',');
  const body = rows.map((r) => CAMPAIGN_COLUMNS.map(([k]) => esc(r[k])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}
