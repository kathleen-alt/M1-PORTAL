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

const CANADA = new Set(['TSX', 'TSXV', 'CSE', 'NEO']);

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
    // The TMX directory appends a bare " J" to 158 TSX listings — a market
    // segment code, not part of the name, and it reads as a typo in a merge
    // field ("Alamos Gold Inc. J"). A real trailing class letter comes with a
    // matching ticker suffix (.A/.B) and a spelt-out qualifier, so only the
    // lone J is dropped.
    .replace(/\s+J$/, '')
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
  if (it.proposalHistory?.lastDate) {
    out.push(it.proposalHistory.type === 'contract'
      ? `worked with Market One before — last paperwork ${it.proposalHistory.lastDate}`
      : `we last sent them a proposal on ${it.proposalHistory.lastDate}`);
  }
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
  ['lastProposal', 'Last Proposal'],
  ['proposalOutcome', 'Proposal Outcome'],
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
        // Blank means genuinely cold. Anything here means somebody at Market
        // One has sent this company paper before, and the opening line has to
        // acknowledge it rather than introduce the firm from scratch.
        lastProposal: it.proposalHistory?.lastDate || '',
        proposalOutcome: it.proposalHistory
          ? (it.proposalHistory.type === 'contract' ? 'signed before'
            : it.proposalHistory.type === 'renewal' ? 'renewed before'
            : 'pitched, not signed')
          : '',
      });
    }
  }
  // Best-fit first so a capped send takes the best of the list.
  rows.sort((a, b) => (Number(b.fitScore) || 0) - (Number(a.fitScore) || 0));
  return dedupeByEmail(rows);
}

/**
 * One send per person.
 *
 * A dual-listed issuer appears twice in the universe -- Western Copper and Gold
 * sits on both NYSE American and the TSX -- so the same communications lead
 * comes through on two tickers. Mailing somebody the identical pitch twice is
 * the fastest way to lose a sending domain, so the second row is dropped here
 * rather than left for whoever imports the file to notice.
 *
 * Rows arrive best-fit first, so the first sighting of an address is the one
 * worth keeping; its company name is upgraded to the fuller of the two, because
 * the TMX directory abbreviates where the US one does not.
 */
export function dedupeByEmail(rows) {
  const seen = new Map();
  const out = [];
  for (const r of rows) {
    const k = String(r.email || '').toLowerCase();
    if (!k) { out.push(r); continue; }
    const prev = seen.get(k);
    if (!prev) { seen.set(k, r); out.push(r); continue; }
    if (String(r.company || '').length > String(prev.company || '').length) prev.company = r.company;
  }
  return out;
}

/**
 * The scored evidence, in the words the model used.
 *
 * Only signals that actually fired and carry a detail string, because a merge
 * field has to read as something a human could quote. This is wider than
 * `hooks()`: the peer-liquidity and decay comparisons live here and nowhere
 * else, and they are the strongest lines in the pitch.
 */
export function evidence(it) {
  const out = [];
  for (const t of it.fit?.tests || []) {
    for (const s of t.signals || []) {
      if (s.hit && s.detail) out.push(`${s.label}: ${s.detail}`);
    }
  }
  return out;
}

/**
 * Signals the model could not evaluate, so nobody writes a sentence around a
 * blank. "No agency retained" in this list means we do not know whether they
 * have an IR firm -- not that they do not.
 */
export function unverifiedSignals(it) {
  const missing = new Set();
  for (const t of it.fit?.tests || []) {
    for (const s of t.signals || []) if (s.evaluated === false) missing.add(s.label);
  }
  return [...missing];
}

// The TMX directory truncates long names to a fixed width ("Erdene Res Dev",
// "Nouveau Mond Gra Inc"), and a truncated name in a greeting is worse than no
// name. These are the abbreviations it uses.
const TMX_ABBREV = /\b(Res|Dev|Gra|Mtls|Mtrl|Mnrls|Mng|Mins?|Intl|Int'l|Slvr|Gld|Cppr|Wstrn|Nthrn|Sthrn|Cdn|Amer|Tech(?!nolog)|Hldgs?|Grp|Cap|Ventrs?|Explr|Expl|Energ|Pharm|Therap|Bio)\b/;

/**
 * The detailed export: one row per person, carrying everything a copywriter
 * would otherwise have to come back and ask for. Built for handing to someone
 * -- or some other session -- with none of this context: who to write to, what
 * the company is, which engagement fits, the evidence behind the score, which
 * signals are unknown, and whether Market One has been here before.
 */
export const DETAIL_COLUMNS = [
  ['email', 'Email'],
  ['firstName', 'First Name'],
  ['lastName', 'Last Name'],
  ['fullName', 'Full Name'],
  ['title', 'Title'],
  ['roleReached', 'Role Reached'],
  ['emailStatus', 'Email Status'],
  ['emailRisk', 'Email Risk'],
  ['phone', 'Phone'],
  ['linkedin', 'Contact LinkedIn'],
  ['contactSource', 'Contact Source'],
  ['contactVerifiedOn', 'Contact Verified On'],

  ['company', 'Company'],
  ['legalName', 'Legal Name (as listed)'],
  ['nameCheck', 'Name Check'],
  ['ticker', 'Ticker'],
  ['symbol', 'Symbol'],
  ['exchange', 'Exchange'],
  ['alsoListedAs', 'Also Listed As'],
  ['jurisdiction', 'Jurisdiction'],
  ['caslApplies', 'CASL Applies'],
  ['website', 'Website'],
  ['sector', 'Sector'],
  ['industry', 'Industry'],
  ['listingYear', 'Listed Since'],
  ['genericIrEmail', 'Generic IR Inbox'],

  ['packageFit', 'Package Fit'],
  ['packageWhy', 'Why That Package'],
  ['fitScore', 'Fit Score (0-100)'],
  ['tier', 'Tier'],
  ['coverage', 'Data Coverage %'],
  ['provisional', 'Score Provisional'],

  ['marketCap', 'Market Cap'],
  ['marketCapRaw', 'Market Cap (raw USD)'],
  ['price', 'Share Price'],
  ['dollarVolume', '$ Volume/day'],
  ['peerVolume', 'Peer Median $ Volume/day'],
  ['volumeVsPeer', 'Volume vs Peers'],
  ['drawdown', 'Off 52-Week High'],
  ['watchers', 'StockTwits Watchers'],
  ['perWatcher', '$ Traded per Watcher'],
  ['cash', 'Cash on Hand'],
  ['revenue', 'Revenue'],

  ['irPosture', 'IR Posture'],
  ['incumbentAgency', 'Incumbent Agency'],
  ['incumbentNote', 'Incumbent Evidence'],
  ['newIrHire', 'Recent IR Hire'],

  ['linkedinFollowers', 'LinkedIn Followers'],
  ['youtubeSubs', 'YouTube Subs'],
  ['stocktwits30d', 'StockTwits msgs (30d)'],
  ['outlets', 'Outlets / Newswire'],
  ['noSocial', 'No Social Presence'],

  ['closedRaiseDate', 'Closed Raise (date)'],
  ['closedRaise', 'Closed Raise'],
  ['latestRelease', 'Latest Release'],

  ['lastProposal', 'Last Proposal'],
  ['proposalOutcome', 'Proposal Outcome'],
  ['proposalCount', 'Proposals On File'],
  ['proposalFiles', 'Proposal Documents'],

  ['hook1', 'Why Now 1'],
  ['hook2', 'Why Now 2'],
  ['hook3', 'Why Now 3'],
  ['evidence', 'Scored Evidence'],
  ['gaps', 'Unverified Signals (do not claim)'],
];

/**
 * @param {object[]} issuers  tagged with isClient and proposalHistory
 * @returns {object[]} one row per person, deduplicated by email address
 */
export function toDetailRows(issuers) {
  const rows = [];
  for (const it of issuers) {
    if (it.isClient) continue;
    if (it.fit?.eligible === false) continue;
    if (!hasReachableContact(it)) continue;
    const h = it.proposalHistory || null;
    const svc = serviceTier(it);
    const hk = hooks(it);
    const canada = CANADA.has(it.exchange);

    for (const c of it.apolloContacts || []) {
      if (!c?.email) continue;
      const { first, last } = splitName(c.name);
      rows.push({
        email: c.email,
        firstName: first,
        lastName: last,
        fullName: c.name || '',
        title: c.title || '',
        roleReached: c.role || '',
        emailStatus: c.emailStatus || '',
        emailRisk: c.catchall
          ? 'catch-all domain — the server accepts any address, so "verified" does not prove this mailbox exists'
          : '',
        phone: c.phone || '',
        linkedin: c.linkedin || '',
        contactSource: c.source || 'apollo',
        contactVerifiedOn: String(c.lastRefreshed || it.apolloAt || '').slice(0, 10),

        company: cleanCompany(it.name),
        legalName: it.name || '',
        nameCheck: '',
        ticker: it.key || `${it.exchange}:${it.symbol}`,
        symbol: it.symbol || '',
        exchange: it.exchange || '',
        alsoListedAs: '',
        jurisdiction: canada ? 'Canada' : 'United States',
        caslApplies: canada
          ? 'yes — Canadian recipient, CASL consent and unsubscribe rules apply'
          : 'likely not — US recipient, CAN-SPAM applies',
        website: it.website || '',
        sector: it.sectorLabel || '',
        industry: it.industry || '',
        listingYear: it.listingYear ?? '',
        genericIrEmail: it.irEmail || '',

        packageFit: svc.tier === 'unknown' ? '' : svc.tier,
        packageWhy: svc.why || '',
        fitScore: it.fit?.score ?? '',
        tier: it.fit?.tier ?? '',
        coverage: it.fit?.coverage ?? '',
        provisional: it.fit?.provisional === true
          ? 'yes — thin data, treat the score as indicative'
          : 'no',

        marketCap: money(it.marketCap),
        marketCapRaw: it.marketCap ?? '',
        price: it.price != null ? `$${it.price}` : '',
        dollarVolume: money(it.avgDollarVolume3m),
        peerVolume: money(it.peerMedianDollarVolume),
        volumeVsPeer: it.avgDollarVolume3m != null && it.peerMedianDollarVolume
          ? `${Math.round((it.avgDollarVolume3m / it.peerMedianDollarVolume) * 100)}% of peer median`
          : '',
        drawdown: pctOf(it.drawdownPct),
        watchers: it.watchers ?? '',
        perWatcher: it.watchers && it.avgDollarVolume3m != null
          ? `$${(it.avgDollarVolume3m / it.watchers).toFixed(0)}`
          : '',
        cash: money(it.cash),
        revenue: money(it.revenue),

        irPosture: it.irPosture || '',
        incumbentAgency: it.incumbentAgency || '',
        incumbentNote: it.incumbentNote || it.incumbentEvidence || '',
        newIrHire: it.newIrHire || '',

        linkedinFollowers: it.social?.linkedinFollowers ?? '',
        youtubeSubs: it.social?.youtubeSubs ?? '',
        stocktwits30d: it.social?.stocktwits?.msgs30d ?? '',
        outlets: (it.social?.outlets || []).join(' · '),
        noSocial: it.social?.scannedAt
          ? (!(it.social.linkedin || it.social.x || it.social.youtube) ? 'yes' : 'no')
          : 'not scanned',

        closedRaiseDate: (it.closedFinancings || [])[0]?.date || '',
        closedRaise: (it.closedFinancings || [])[0]
          ? [it.closedFinancings[0].amount, it.closedFinancings[0].type].filter(Boolean).join(' · ')
          : '',
        latestRelease: it.latestRelease || '',

        lastProposal: h?.lastDate || '',
        proposalOutcome: h
          ? (h.type === 'contract' ? 'signed with Market One before'
            : h.type === 'renewal' ? 'renewed with Market One before'
            : 'pitched before, never signed')
          : 'never pitched',
        proposalCount: h?.count ?? '',
        proposalFiles: (h?.docs || []).map((d) => `${d.date} ${d.file}`).join(' | '),

        hook1: hk[0] || '',
        hook2: hk[1] || '',
        hook3: hk[2] || '',
        evidence: evidence(it).join(' | '),
        gaps: unverifiedSignals(it).join(' | '),
      });
    }
  }

  // One send per person, as `dedupeByEmail` does for the narrow export -- but
  // here the surviving row also records the other listing, so the dual listing
  // itself is not lost. Keep the better-covered record's numbers and the fuller
  // of the two names.
  const byEmail = new Map();
  for (const r of rows) {
    const k = r.email.toLowerCase();
    const prev = byEmail.get(k);
    if (!prev) { byEmail.set(k, r); continue; }
    const better = (Number(r.coverage) || 0) > (Number(prev.coverage) || 0) ? r : prev;
    const other = better === r ? prev : r;
    better.alsoListedAs = [better.alsoListedAs, other.ticker].filter(Boolean).join(' · ');
    if (other.company.length > better.company.length) better.company = other.company;
    byEmail.set(k, better);
  }

  const out = [...byEmail.values()];
  for (const r of out) {
    r.nameCheck = TMX_ABBREV.test(r.company)
      ? `LOOKS TRUNCATED by the exchange directory — check ${r.website || 'the company website'} and fix before merging`
      : 'ok';
  }
  out.sort((a, b) => (Number(b.fitScore) || 0) - (Number(a.fitScore) || 0));
  return out;
}

export function toDetailCsv(rows) {
  return csvOf(rows, DETAIL_COLUMNS);
}

function csvOf(rows, columns) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/\s+/g, ' ').trim();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(([, label]) => esc(label)).join(',');
  const body = rows.map((r) => columns.map(([k]) => esc(r[k])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

export function toCampaignCsv(rows) {
  return csvOf(rows, CAMPAIGN_COLUMNS);
}
