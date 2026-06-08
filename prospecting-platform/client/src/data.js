// Prospecting & Outreach Platform — bundled demo dataset + client-side engine.
//
// Everything here is clearly sample data so the platform is fully explorable
// with no API key. With a real ANTHROPIC_API_KEY the enrichment / research /
// outreach calls hit the live /api/* endpoints instead (see ./api.js).
//
// NOTE: companies, people and emails below are illustrative samples for a demo
// — not real individuals. The prospect-scoring and CSV import logic, however, is
// the same code that runs in production (live mode).

export const EXCHANGES = ['TSX', 'TSXV', 'CSE'];

export const STATUSES = [
  'New Prospect', 'Researching', 'Ready for Outreach', 'In Sequence',
  'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost',
  'Current Client', 'Former Client',
];

// Pipeline stages shown on the Kanban board (the "live deal" statuses).
export const PIPELINE_STAGES = [
  'New Prospect', 'Researching', 'Ready for Outreach', 'In Sequence',
  'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won',
];

export const TAGS = [
  'Mining', 'Technology', 'Life Sciences', 'Energy', 'TSXV', 'CSE', 'TSX',
  'Financing Candidate', 'Investor Awareness', 'Conference Prospect',
];

// Signal / trigger taxonomy.
export const SIGNAL_TYPES = {
  financing: { label: 'Financing', accent: '#3B82F6' },
  'management-change': { label: 'Management change', accent: '#8B5CF6' },
  'm&a': { label: 'M&A', accent: '#EC4899' },
  'new-listing': { label: 'New listing', accent: '#06B6D4' },
  'drill-results': { label: 'Drill results', accent: '#F59E0B' },
  'price-move': { label: 'Share-price move', accent: '#22C55E' },
  'volume-spike': { label: 'Volume spike', accent: '#10B981' },
  earnings: { label: 'Earnings', accent: '#64748B' },
  'ir-initiative': { label: 'IR initiative', accent: '#A78BFA' },
};

const day = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * day).toISOString();
const ymd = (daysAgo) => iso(daysAgo).slice(0, 10);

let _id = 0;
const uid = (p = 'x') => `${p}-${(++_id).toString(36)}-${Date.now().toString(36)}`;

// ── Prospect scoring (1-100) ─────────────────────────────────────────────────
// Deterministic, explainable score from financing / IR / growth signals — the
// Smart Opportunity Engine. Same function powers demo and live mode.
export function scoreCompany(c) {
  const now = Date.now();
  const parts = [];
  let score = 18; // base interest for any public company

  const sigs = c.signals || [];
  const fins = c.financings || [];
  if (fins.length) {
    const newest = fins.reduce((m, f) => Math.min(m, (now - new Date(f.date).getTime()) / day), 9999);
    const recency = Math.max(0, 26 - newest * 0.25); // decays over ~100 days
    if (recency > 0) { score += recency; parts.push({ label: 'Recent financing', pts: Math.round(recency) }); }
    const biggest = Math.max(...fins.map((f) => f.amountValue || 0));
    const sizePts = Math.min(14, Math.round(biggest / 1.2));
    if (sizePts) { score += sizePts; parts.push({ label: `Financing size ($${biggest}M)`, pts: sizePts }); }
    if (fins.length >= 2) { score += 8; parts.push({ label: 'Repeat raiser', pts: 8 }); }
  }

  const ir = sigs.filter((s) => ['management-change', 'ir-initiative'].includes(s.type)).length;
  if (ir) { const p = Math.min(18, ir * 9); score += p; parts.push({ label: 'IR / management change', pts: p }); }

  const growth = sigs.filter((s) => ['m&a', 'new-listing', 'volume-spike', 'price-move', 'drill-results'].includes(s.type)).length;
  if (growth) { const p = Math.min(16, growth * 6); score += p; parts.push({ label: 'Growth signals', pts: p }); }

  const fresh = sigs.some((s) => (now - new Date(s.date).getTime()) / day <= 10);
  if (fresh) { score += 6; parts.push({ label: 'Active this week', pts: 6 }); }

  score = Math.max(1, Math.min(100, Math.round(score)));
  return { score, parts };
}

export function scoreBand(score) {
  if (score >= 75) return { label: 'Hot', accent: '#22c55e' };
  if (score >= 50) return { label: 'Warm', accent: '#f59e0b' };
  return { label: 'Cool', accent: '#64748b' };
}

// ── Sample companies ─────────────────────────────────────────────────────────
const contact = (name, title, role, domain, status, confidence, location, first) => ({
  id: uid('ct'),
  name, title, role,
  email: `${(first || name.split(' ')[0]).toLowerCase().replace(/[^a-z]/g, '')}.${name.split(' ').slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')}@${domain}`,
  emailStatus: status, confidence,
  linkedin: `https://www.linkedin.com/in/${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  location,
});

const sig = (type, headline, daysAgo, source = 'Newsfile') => ({ id: uid('sg'), type, headline, date: iso(daysAgo), source, url: '#' });
const fin = (type, amount, amountValue, daysAgo) => ({ type, amount, amountValue, date: ymd(daysAgo) });
const act = (type, text, daysAgo) => ({ id: uid('ac'), type, text, date: iso(daysAgo) });

function company(o) {
  return {
    watchlist: false, tags: [], contacts: [], financings: [], signals: [],
    activities: [], opportunity: null, addedAt: iso(o._added ?? 30), notes: o.notes || '', ...o,
  };
}

export const DEMO_COMPANIES = [
  company({
    id: 'co-aurelia', name: 'Aurelia Gold Corp.', ticker: 'AUG', exchange: 'TSXV',
    industry: 'Mining', sector: 'Gold', marketCap: 142, marketCapStr: 'C$142M', sharePrice: 1.18,
    hq: 'Vancouver, BC', website: 'aureliagold.ca', irContact: 'ir@aureliagold.ca',
    status: 'Ready for Outreach', tags: ['Mining', 'TSXV', 'Financing Candidate'], watchlist: true, _added: 5,
    contacts: [
      contact('Marcus Delaney', 'Chief Executive Officer', 'CEO', 'aureliagold.ca', 'verified', 92, 'Vancouver, BC'),
      contact('Priya Nair', 'Chief Financial Officer', 'CFO', 'aureliagold.ca', 'verified', 88, 'Vancouver, BC'),
      contact('Tom Whitfield', 'VP Investor Relations', 'VP Investor Relations', 'aureliagold.ca', 'risky', 64, 'Toronto, ON'),
    ],
    financings: [fin('Bought-deal financing', 'C$18M', 18, 6), fin('Private placement', 'C$6M', 6, 92)],
    signals: [
      sig('financing', 'Aurelia Gold closes C$18M bought-deal financing to advance Coyote Creek', 4),
      sig('drill-results', 'Aurelia intersects 12.4 g/t gold over 9.2m at Coyote Creek', 11),
      sig('volume-spike', 'AUG.V trading volume up 320% on financing news', 4),
    ],
    activities: [
      act('news', 'Signal flagged: C$18M bought-deal financing', 4),
      act('note', 'Strong candidate for a post-raise investor-awareness program.', 3),
    ],
    notes: 'Closed an $18M raise — classic post-financing awareness opportunity.',
  }),
  company({
    id: 'co-northpeak', name: 'NorthPeak Lithium Ltd.', ticker: 'NPL', exchange: 'TSXV',
    industry: 'Mining', sector: 'Lithium', marketCap: 78, marketCapStr: 'C$78M', sharePrice: 0.42,
    hq: 'Toronto, ON', website: 'northpeaklithium.com', irContact: 'investors@northpeaklithium.com',
    status: 'In Sequence', tags: ['Mining', 'TSXV', 'Investor Awareness'], watchlist: true, _added: 9,
    contacts: [
      contact('Elena Vasquez', 'President & CEO', 'CEO', 'northpeaklithium.com', 'verified', 90, 'Toronto, ON'),
      contact('David Chen', 'VP Corporate Development', 'VP Corporate Development', 'northpeaklithium.com', 'risky', 70, 'Toronto, ON'),
    ],
    financings: [fin('Private placement', 'C$9.5M', 9.5, 22)],
    signals: [
      sig('drill-results', 'NorthPeak reports record lithium grades at Wabigoon pegmatite', 8),
      sig('ir-initiative', 'NorthPeak launches new investor website and fact sheet', 16),
    ],
    activities: [
      act('email', 'Sent: "Following your Wabigoon results" (Step 1)', 6),
      act('email', 'Opened intro email · 2 opens', 5),
      act('note', 'Enrolled in "Mining — Post-Results" sequence.', 6),
    ],
    opportunity: { value: 60000, stage: 'In Sequence' },
  }),
  company({
    id: 'co-cascade', name: 'Cascade Copper Inc.', ticker: 'CCU', exchange: 'TSXV',
    industry: 'Mining', sector: 'Copper', marketCap: 211, marketCapStr: 'C$211M', sharePrice: 2.64,
    hq: 'Vancouver, BC', website: 'cascadecopper.com', irContact: 'ir@cascadecopper.com',
    status: 'Meeting Booked', tags: ['Mining', 'TSXV', 'Conference Prospect'], _added: 14,
    contacts: [
      contact('Robert Klein', 'Chief Executive Officer', 'CEO', 'cascadecopper.com', 'verified', 95, 'Vancouver, BC'),
      contact('Sarah Osei', 'IR Manager', 'IR Manager', 'cascadecopper.com', 'verified', 86, 'Vancouver, BC'),
    ],
    financings: [fin('Bought-deal financing', 'C$25M', 25, 40)],
    signals: [
      sig('m&a', 'Cascade Copper to acquire Highland Resources in C$40M all-share deal', 9),
      sig('management-change', 'Cascade appoints new VP Corporate Development', 20),
    ],
    activities: [
      act('meeting', 'Discovery call booked for next week with R. Klein', 2),
      act('email', 'Reply received: "Happy to chat — send a time"', 3),
    ],
    opportunity: { value: 120000, stage: 'Meeting Booked' },
  }),
  company({
    id: 'co-helix', name: 'Helix Biosciences Corp.', ticker: 'HLX', exchange: 'TSX',
    industry: 'Life Sciences', sector: 'Biotech', marketCap: 540, marketCapStr: 'C$540M', sharePrice: 8.90,
    hq: 'Montréal, QC', website: 'helixbio.com', irContact: 'ir@helixbio.com',
    status: 'Researching', tags: ['Life Sciences', 'TSX'], watchlist: true, _added: 7,
    contacts: [
      contact('Amara Okafor', 'Chief Executive Officer', 'CEO', 'helixbio.com', 'verified', 91, 'Montréal, QC'),
      contact('Julien Caron', 'Chief Financial Officer', 'CFO', 'helixbio.com', 'risky', 66, 'Montréal, QC'),
    ],
    financings: [fin('Public offering', 'C$60M', 60, 12)],
    signals: [
      sig('financing', 'Helix Biosciences prices C$60M public offering to fund Phase 2 trial', 11),
      sig('earnings', 'Helix reports Q1 results; cash runway extended to 2028', 25),
    ],
    activities: [act('note', 'Large raise — strong fit for an institutional awareness campaign.', 6)],
  }),
  company({
    id: 'co-quantum', name: 'Quantum Edge Systems', ticker: 'QES', exchange: 'CSE',
    industry: 'Technology', sector: 'AI / Software', marketCap: 96, marketCapStr: 'C$96M', sharePrice: 0.78,
    hq: 'Kitchener, ON', website: 'quantumedge.io', irContact: 'ir@quantumedge.io',
    status: 'New Prospect', tags: ['Technology', 'CSE', 'Financing Candidate'], _added: 2,
    contacts: [contact('Nathan Brooks', 'Founder & CEO', 'CEO', 'quantumedge.io', 'risky', 72, 'Kitchener, ON')],
    financings: [fin('Private placement', 'C$7M', 7, 5)],
    signals: [
      sig('financing', 'Quantum Edge closes C$7M placement to scale its AI inference platform', 3),
      sig('new-listing', 'Quantum Edge begins trading on the CSE under "QES"', 60),
    ],
    activities: [act('news', 'Signal flagged: C$7M placement', 3)],
  }),
  company({
    id: 'co-borealis', name: 'Borealis Renewables Inc.', ticker: 'BRN', exchange: 'TSX',
    industry: 'Energy', sector: 'Cleantech', marketCap: 320, marketCapStr: 'C$320M', sharePrice: 4.10,
    hq: 'Calgary, AB', website: 'borealisrenew.com', irContact: 'ir@borealisrenew.com',
    status: 'Proposal Sent', tags: ['Energy', 'TSX', 'Investor Awareness'], _added: 21,
    contacts: [
      contact('Hannah Lindqvist', 'Chief Executive Officer', 'CEO', 'borealisrenew.com', 'verified', 93, 'Calgary, AB'),
      contact('Marc Dubois', 'VP Investor Relations', 'VP Investor Relations', 'borealisrenew.com', 'verified', 84, 'Calgary, AB'),
    ],
    financings: [fin('Green bond', 'C$120M', 120, 34)],
    signals: [
      sig('m&a', 'Borealis acquires 200MW solar portfolio in Alberta', 15),
      sig('ir-initiative', 'Borealis to present at the Cleantech Capital conference', 6),
    ],
    activities: [
      act('meeting', 'Proposal walkthrough completed with the IR team', 4),
      act('note', 'Sent C$90k annual IR-program proposal.', 4),
    ],
    opportunity: { value: 90000, stage: 'Proposal Sent' },
  }),
  company({
    id: 'co-summit', name: 'Summit Silver Mines', ticker: 'SSM', exchange: 'TSXV',
    industry: 'Mining', sector: 'Silver', marketCap: 54, marketCapStr: 'C$54M', sharePrice: 0.31,
    hq: 'Vancouver, BC', website: 'summitsilver.ca', irContact: 'ir@summitsilver.ca',
    status: 'New Prospect', tags: ['Mining', 'TSXV'], _added: 3,
    contacts: [contact('Grace Yamamoto', 'CEO & Director', 'CEO', 'summitsilver.ca', 'risky', 61, 'Vancouver, BC')],
    financings: [],
    signals: [
      sig('drill-results', 'Summit Silver hits 480 g/t silver over 6.1m at Eagle Ridge', 7),
      sig('price-move', 'SSM.V up 41% week-over-week on drill results', 6),
    ],
    activities: [act('news', 'Signal flagged: high-grade silver intercept', 7)],
  }),
  company({
    id: 'co-meridian', name: 'Meridian HealthTech', ticker: 'MHT', exchange: 'CSE',
    industry: 'Life Sciences', sector: 'Digital Health', marketCap: 41, marketCapStr: 'C$41M', sharePrice: 0.55,
    hq: 'Ottawa, ON', website: 'meridianhealthtech.com', irContact: 'ir@meridianhealthtech.com',
    status: 'Current Client', tags: ['Life Sciences', 'CSE', 'Investor Awareness'], _added: 60,
    contacts: [contact('Olivia Tremblay', 'Chief Executive Officer', 'CEO', 'meridianhealthtech.com', 'verified', 89, 'Ottawa, ON')],
    financings: [fin('Private placement', 'C$4.5M', 4.5, 70)],
    signals: [sig('ir-initiative', 'Meridian retains Market One for an investor-awareness program', 18)],
    activities: [
      act('meeting', 'Kickoff completed — 6-month program live', 18),
      act('note', 'Won: C$72k engagement.', 18),
    ],
    opportunity: { value: 72000, stage: 'Won' },
  }),
  company({
    id: 'co-titan', name: 'Titan Uranium Corp.', ticker: 'TUC', exchange: 'TSXV',
    industry: 'Mining', sector: 'Uranium', marketCap: 188, marketCapStr: 'C$188M', sharePrice: 1.92,
    hq: 'Saskatoon, SK', website: 'titanuranium.com', irContact: 'ir@titanuranium.com',
    status: 'New Prospect', tags: ['Mining', 'TSXV', 'Financing Candidate'], _added: 1,
    contacts: [contact('Liam O Connor', 'President & CEO', 'CEO', 'titanuranium.com', 'risky', 68, 'Saskatoon, SK')],
    financings: [fin('Bought-deal financing', 'C$30M', 30, 2)],
    signals: [
      sig('financing', 'Titan Uranium closes upsized C$30M bought-deal financing', 1),
      sig('volume-spike', 'TUC.V volume spikes 5x on financing close', 1),
    ],
    activities: [act('news', 'Signal flagged: upsized C$30M raise', 1)],
  }),
  company({
    id: 'co-vertex', name: 'Vertex Data Centers', ticker: 'VDC', exchange: 'TSX',
    industry: 'Technology', sector: 'Infrastructure', marketCap: 870, marketCapStr: 'C$870M', sharePrice: 14.20,
    hq: 'Toronto, ON', website: 'vertexdc.com', irContact: 'ir@vertexdc.com',
    status: 'Lost', tags: ['Technology', 'TSX'], _added: 50,
    contacts: [contact('Priscilla Adeyemi', 'Chief Financial Officer', 'CFO', 'vertexdc.com', 'verified', 87, 'Toronto, ON')],
    financings: [fin('Public offering', 'C$150M', 150, 45)],
    signals: [sig('management-change', 'Vertex names new CFO ahead of AI-datacenter expansion', 30)],
    activities: [act('note', 'Lost: went with an in-house team.', 12)],
    opportunity: { value: 110000, stage: 'Lost' },
  }),
  company({
    id: 'co-emberly', name: 'Emberly Mining Ltd.', ticker: 'EMB', exchange: 'CSE',
    industry: 'Mining', sector: 'Gold', marketCap: 33, marketCapStr: 'C$33M', sharePrice: 0.22,
    hq: 'Vancouver, BC', website: 'emberlymining.com', irContact: 'ir@emberlymining.com',
    status: 'Former Client', tags: ['Mining', 'CSE'], _added: 120,
    contacts: [contact('Kofi Mensah', 'Chief Executive Officer', 'CEO', 'emberlymining.com', 'risky', 60, 'Vancouver, BC')],
    financings: [fin('Private placement', 'C$3M', 3, 140)],
    signals: [sig('drill-results', 'Emberly resumes drilling at the Halcyon project', 22)],
    activities: [act('note', 'Former client — re-engagement candidate as drilling resumes.', 10)],
  }),
  company({
    id: 'co-novacore', name: 'NovaCore Semiconductors', ticker: 'NVC', exchange: 'TSX',
    industry: 'Technology', sector: 'Semiconductors', marketCap: 1240, marketCapStr: 'C$1.24B', sharePrice: 22.50,
    hq: 'Markham, ON', website: 'novacoresemi.com', irContact: 'ir@novacoresemi.com',
    status: 'Researching', tags: ['Technology', 'TSX', 'Conference Prospect'], watchlist: true, _added: 11,
    contacts: [
      contact('Wei Zhang', 'Chief Executive Officer', 'CEO', 'novacoresemi.com', 'verified', 90, 'Markham, ON'),
      contact('Rebecca Stone', 'VP Investor Relations', 'VP Investor Relations', 'novacoresemi.com', 'risky', 71, 'Markham, ON'),
    ],
    financings: [],
    signals: [
      sig('earnings', 'NovaCore beats Q2 estimates; raises full-year guidance', 9),
      sig('price-move', 'NVC up 18% after earnings beat', 9),
    ],
    activities: [act('note', 'Large-cap — awareness + sell-side targeting angle.', 5)],
  }),
];

// ── Sample email sequences ───────────────────────────────────────────────────
export const DEMO_SEQUENCES = [
  {
    id: 'seq-mining-postraise',
    name: 'Mining — Post-Financing Awareness',
    status: 'Active',
    audience: 'Mining issuers that just closed a raise',
    steps: [
      { day: 1, channel: 'Email', subject: 'Congrats on the {{financingAmount}} raise, {{firstName}}', body: 'Hi {{firstName}},\n\nCongratulations on closing your recent {{financingAmount}} financing. We work with public companies like {{companyName}} to increase investor awareness following capital raises — turning a successful close into sustained trading interest.\n\nWorth a short call?' },
      { day: 4, channel: 'Email', subject: 'Quick follow-up for {{companyName}}', body: 'Hi {{firstName}}, circling back — a 15-minute call to share how we\'d approach awareness for {{companyName}} post-raise?' },
      { day: 8, channel: 'Email', subject: 'How {{exchange}} issuers sustain post-raise momentum', body: 'A quick case study on how we helped a comparable {{industry}} issuer 3x their retail reach after a financing.' },
      { day: 14, channel: 'Email', subject: 'Closing the loop', body: 'Hi {{firstName}}, I\'ll stop here for now — if investor awareness becomes a priority for {{companyName}}, I\'m a reply away.' },
    ],
    stats: { enrolled: 12, sent: 34, opens: 22, replies: 5, meetings: 2 },
  },
  {
    id: 'seq-tech-awareness',
    name: 'Technology — Investor Awareness',
    status: 'Active',
    audience: 'TSX/CSE technology issuers',
    steps: [
      { day: 1, channel: 'Email', subject: '{{companyName}} — your investor story', body: 'Hi {{firstName}},\n\nSaw the news on {{latestHeadline}}. We help {{exchange}}-listed technology companies sharpen their investor narrative and reach the right funds.\n\nOpen to a quick intro?' },
      { day: 5, channel: 'LinkedIn', subject: '', body: 'Hi {{firstName}} — following up on my note about investor awareness for {{companyName}}. Happy to share a few ideas tailored to {{industry}}.' },
      { day: 10, channel: 'Email', subject: 'Three ideas for {{companyName}}', body: 'A short list of three awareness levers we\'d pull for {{companyName}} this quarter.' },
    ],
    stats: { enrolled: 8, sent: 17, opens: 11, replies: 3, meetings: 1 },
  },
];

// Personalization variables exposed in the sequence builder.
export const SEQUENCE_VARS = [
  { token: 'firstName', label: 'First Name' },
  { token: 'companyName', label: 'Company Name' },
  { token: 'financingAmount', label: 'Financing Amount' },
  { token: 'latestHeadline', label: 'Latest News Headline' },
  { token: 'exchange', label: 'Exchange' },
  { token: 'industry', label: 'Industry' },
];

export function fillTemplate(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null && vars[k] !== '' ? vars[k] : `{{${k}}}`));
}

export function varsForCompany(c, contactObj) {
  const newestSignal = (c.signals || [])[0];
  const newestFin = (c.financings || [])[0];
  return {
    firstName: (contactObj?.name || c.contacts?.[0]?.name || 'there').split(' ')[0],
    companyName: c.name,
    financingAmount: newestFin?.amount || '',
    latestHeadline: newestSignal?.headline || '',
    exchange: c.exchange,
    industry: c.industry,
  };
}

// ── CSV import (real logic — runs in demo + live mode) ────────────────────────
// Minimal, dependency-free CSV parser that tolerates quoted fields.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((c) => c.trim() !== '')) rows.push(row); }
  return rows;
}

const COLUMN_ALIASES = {
  name: ['company', 'company name', 'name', 'issuer'],
  ticker: ['ticker', 'symbol', 'ticker symbol'],
  exchange: ['exchange', 'listing'],
  industry: ['industry', 'sector'],
  marketCapStr: ['market cap', 'marketcap', 'market capitalization'],
  hq: ['headquarters', 'hq', 'location', 'city'],
  website: ['website', 'url', 'domain'],
  irContact: ['ir', 'ir contact', 'investor relations', 'ir email'],
};

// Map a CSV into company objects, then dedupe against existing records (by
// ticker, else by normalized name). Returns { created, updated, companies }.
export function importCompaniesFromCsv(text, existing) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { created: 0, updated: 0, duplicates: 0, companies: existing };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = header.findIndex((h) => aliases.includes(h));
    if (idx !== -1) colIndex[field] = idx;
  }
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const byTicker = new Map(existing.filter((c) => c.ticker).map((c) => [c.ticker.toUpperCase(), c]));
  const byName = new Map(existing.map((c) => [norm(c.name), c]));

  let created = 0, updated = 0, duplicates = 0;
  let companies = [...existing];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (f) => (colIndex[f] != null ? (cells[colIndex[f]] || '').trim() : '');
    const name = get('name');
    if (!name) continue;
    const ticker = get('ticker').toUpperCase();
    const match = (ticker && byTicker.get(ticker)) || byName.get(norm(name));
    const fields = {
      name,
      ticker: ticker || match?.ticker || '',
      exchange: get('exchange') || match?.exchange || '',
      industry: get('industry') || match?.industry || '',
      marketCapStr: get('marketCapStr') || match?.marketCapStr || '',
      hq: get('hq') || match?.hq || '',
      website: get('website') || match?.website || '',
      irContact: get('irContact') || match?.irContact || '',
    };
    if (match) {
      const merged = { ...match, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) };
      companies = companies.map((c) => (c.id === match.id ? merged : c));
      byTicker.set((merged.ticker || '').toUpperCase(), merged);
      byName.set(norm(merged.name), merged);
      updated++; duplicates++;
    } else {
      const co = company({
        id: uid('co'), ...fields, sharePrice: null, marketCap: null,
        status: 'New Prospect', tags: [fields.exchange].filter(Boolean), _added: 0,
      });
      companies.push(co);
      if (co.ticker) byTicker.set(co.ticker.toUpperCase(), co);
      byName.set(norm(co.name), co);
      created++;
    }
  }
  return { created, updated, duplicates, companies };
}

export const SAMPLE_CSV = `Company,Ticker,Exchange,Industry,Market Cap,Headquarters,Website
Pinnacle Zinc Corp,PZC,TSXV,Mining,C$64M,Vancouver BC,pinnaclezinc.ca
Lumen AI Holdings,LMN,CSE,Technology,C$120M,Toronto ON,lumenai.io
Cascade Copper Inc,CCU,TSXV,Mining,C$211M,Vancouver BC,cascadecopper.com
Apex Therapeutics,APX,TSX,Life Sciences,C$430M,Montreal QC,apextx.com`;

// ── Demo generators (no API key — mirror the live AI endpoints) ───────────────
const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

function demoEnrich(c) {
  const domain = (c.website || `${c.name.toLowerCase().replace(/[^a-z]+/g, '')}.com`).replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const seed = [
    ['Jordan Avery', 'Chief Executive Officer', 'CEO', 'verified', 88],
    ['Casey Morgan', 'Chief Financial Officer', 'CFO', 'risky', 67],
    ['Riley Bennett', 'VP Investor Relations', 'VP Investor Relations', 'risky', 62],
    ['Sam Patel', 'Communications Lead', 'Communications Lead', 'risky', 58],
  ];
  const have = new Set((c.contacts || []).map((x) => x.role));
  const extra = seed.filter(([, , role]) => !have.has(role)).slice(0, 3)
    .map(([name, title, role, status, conf]) => contact(name, title, role, domain, status, conf, c.hq || ''));
  return [...(c.contacts || []), ...extra];
}

function demoResearch(c) {
  const f = c.financings?.[0];
  return {
    summary: `${c.name} (${c.ticker}:${c.exchange}) is a ${c.marketCapStr || ''} ${c.sector || c.industry} issuer based in ${c.hq}. ${f ? `It recently completed a ${f.amount} ${f.type.toLowerCase()}, ` : ''}positioning it well for an investor-awareness push.`,
    financingHistory: c.financings?.length
      ? `Recent activity: ${c.financings.map((x) => `${x.amount} ${x.type.toLowerCase()} (${x.date})`).join('; ')}. ${c.financings.length > 1 ? 'A repeat raiser — capital-markets relationships matter.' : 'A fresh raise creates a natural awareness window.'}`
      : 'No financings on file — watch for an upcoming raise as a trigger.',
    competitiveLandscape: `Competes with other ${c.exchange}-listed ${c.industry.toLowerCase()} names for the same retail and institutional attention. Differentiation in the investor narrative is the lever.`,
    irOpportunities: [
      'Post-news investor-awareness campaign to convert headlines into trading interest.',
      'Refreshed investor deck and fact sheet aligned to the current catalyst.',
      `Targeted outreach to funds active in ${c.industry.toLowerCase()} on ${c.exchange}.`,
      'Conference and non-deal roadshow support.',
    ],
    outreachAngle: f
      ? `Lead with the ${f.amount} raise — congratulate, then frame awareness as the way to protect and extend post-financing momentum.`
      : `Lead with ${c.signals?.[0]?.headline || 'the recent catalyst'} and position awareness as the multiplier.`,
  };
}

function demoOutreach(c, contactObj, channel) {
  const v = varsForCompany(c, contactObj);
  const f = c.financings?.[0];
  const firstLine = f
    ? `Congratulations on closing your ${f.amount} ${f.type.toLowerCase()} — a strong vote of confidence in ${c.name}'s story.`
    : `${v.latestHeadline || `Saw the latest from ${c.name}`} caught my eye.`;
  const subject = channel === 'LinkedIn' ? '' : `Investor awareness for ${c.name} after the raise`;
  const body = `Hi ${v.firstName},\n\n${firstLine} We work with ${c.exchange}-listed ${c.industry.toLowerCase()} companies to turn moments like this into sustained investor interest — the right narrative, in front of the right funds and retail audiences.\n\nWould a 15-minute call next week be worth it to share how we'd approach ${c.name}?\n\nBest,\nMarket One`;
  return { firstLine, subject, body };
}

export const demoEngine = {
  async enrich(c) { await wait(700); return { contacts: demoEnrich(c) }; },
  async research(c) { await wait(800); return { research: demoResearch(c) }; },
  async outreach(c, contactObj, channel) { await wait(750); return { draft: demoOutreach(c, contactObj, channel) }; },
  async firstLine(c) { await wait(450); const f = c.financings?.[0]; return { firstLine: f ? `Congratulations on closing your ${f.amount} ${f.type.toLowerCase()}.` : `Saw the latest from ${c.name} — impressive momentum.` }; },
};
