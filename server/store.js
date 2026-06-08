// In-memory data store for the prospecting platform.
// Seeded with illustrative public-company data so every module is usable on
// first run. Resets on restart (per the chosen MVP storage mode) — swap this
// module for a Postgres-backed implementation later without touching the routes.

let SEQ = 1000;
export const newId = (prefix = 'id') => `${prefix}_${++SEQ}`;
const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// ── Reference data ───────────────────────────────────────────────────────────
export const PROSPECT_STATUSES = [
  { id: 'new', label: 'New Prospect', accent: '#64748B' },
  { id: 'researching', label: 'Researching', accent: '#06B6D4' },
  { id: 'ready', label: 'Ready for Outreach', accent: '#3B82F6' },
  { id: 'in_sequence', label: 'In Sequence', accent: '#8B5CF6' },
  { id: 'meeting', label: 'Meeting Booked', accent: '#F59E0B' },
  { id: 'proposal', label: 'Proposal Sent', accent: '#EC4899' },
  { id: 'negotiation', label: 'Negotiation', accent: '#F97316' },
  { id: 'won', label: 'Won', accent: '#22C55E' },
  { id: 'lost', label: 'Lost', accent: '#EF4444' },
  { id: 'client', label: 'Current Client', accent: '#10B981' },
  { id: 'former_client', label: 'Former Client', accent: '#94A3B8' },
];
export const STATUS_IDS = PROSPECT_STATUSES.map((s) => s.id);

export const EXCHANGES = ['TSX', 'TSXV', 'CSE', 'Nasdaq', 'NYSE', 'ASX', 'LSE'];

export const TRIGGER_TYPES = [
  { id: 'financing', label: 'Financing', accent: '#22C55E' },
  { id: 'bought_deal', label: 'Bought Deal', accent: '#16A34A' },
  { id: 'private_placement', label: 'Private Placement', accent: '#84CC16' },
  { id: 'management_change', label: 'Management Change', accent: '#F59E0B' },
  { id: 'ma', label: 'M&A Activity', accent: '#EC4899' },
  { id: 'new_listing', label: 'New Listing', accent: '#3B82F6' },
  { id: 'uplisting', label: 'Exchange Uplisting', accent: '#6366F1' },
  { id: 'drill_results', label: 'Drill Results', accent: '#A16207' },
  { id: 'earnings', label: 'Earnings', accent: '#06B6D4' },
  { id: 'price_move', label: 'Share Price Move', accent: '#F97316' },
  { id: 'volume_spike', label: 'Volume Spike', accent: '#EF4444' },
  { id: 'ir_initiative', label: 'IR Initiative', accent: '#8B5CF6' },
];
export const TRIGGER_IDS = TRIGGER_TYPES.map((t) => t.id);

export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task'];

// ── Collections ──────────────────────────────────────────────────────────────
export const db = {
  companies: [],
  contacts: [],
  triggers: [],
  activities: [],
  tasks: [],
  sequences: [],
  enrollments: [],
};

// ── Seed ─────────────────────────────────────────────────────────────────────
function seedCompany(c) {
  const id = newId('co');
  db.companies.push({
    id,
    name: c.name,
    ticker: c.ticker,
    exchange: c.exchange,
    industry: c.industry,
    marketCap: c.marketCap,
    sharePrice: c.sharePrice,
    headquarters: c.headquarters,
    website: c.website,
    irContact: c.irContact || '',
    description: c.description || '',
    status: c.status || 'new',
    tags: c.tags || [],
    score: c.score ?? null,
    scoreBreakdown: c.scoreBreakdown || null,
    watchlist: c.watchlist ?? true,
    recentFinancings: c.recentFinancings || [],
    createdAt: daysAgo(c.ageDays ?? 20),
    updatedAt: now(),
  });
  return id;
}

function seedContact(companyId, c) {
  db.contacts.push({
    id: newId('ct'),
    companyId,
    name: c.name,
    title: c.title,
    role: c.role,
    email: c.email,
    linkedin: c.linkedin || '',
    location: c.location || '',
    emailStatus: c.emailStatus || 'unverified', // verified | risky | invalid | unverified
    confidence: c.confidence ?? null,
    source: c.source || 'seed',
    createdAt: now(),
  });
}

function seedTrigger(companyId, t) {
  db.triggers.push({
    id: newId('tg'),
    companyId,
    type: t.type,
    headline: t.headline,
    detail: t.detail || '',
    amount: t.amount || null,
    url: t.url || '',
    source: t.source || '',
    flagged: t.flagged ?? true,
    date: daysAgo(t.ageDays ?? 3),
  });
}

function seedActivity(companyId, a) {
  db.activities.push({
    id: newId('ac'),
    companyId,
    contactId: a.contactId || null,
    type: a.type,
    subject: a.subject,
    body: a.body || '',
    date: daysAgo(a.ageDays ?? 1),
    createdBy: a.createdBy || 'you',
  });
}

(function seed() {
  // 1 — Aurelia Gold (mining, TSXV) — fresh financing, hot prospect
  const aurelia = seedCompany({
    name: 'Aurelia Gold Corp.', ticker: 'AUG', exchange: 'TSXV', industry: 'Mining & Metals',
    marketCap: 84_000_000, sharePrice: 0.62, headquarters: 'Vancouver, BC',
    website: 'https://aureliagold.example', irContact: 'ir@aureliagold.example',
    description: 'Gold exploration and development company advancing district-scale projects in the Abitibi belt.',
    status: 'ready', tags: ['Mining', 'TSXV', 'Financing Candidate'], score: 88, ageDays: 35,
    recentFinancings: [{ amount: 10_000_000, type: 'Bought Deal', date: daysAgo(4) }],
  });
  seedContact(aurelia, { name: 'Daniel Mercer', title: 'Chief Executive Officer', role: 'CEO', email: 'dmercer@aureliagold.example', linkedin: 'https://linkedin.com/in/danielmercer', location: 'Vancouver, BC', emailStatus: 'verified', confidence: 96 });
  seedContact(aurelia, { name: 'Priya Anand', title: 'Chief Financial Officer', role: 'CFO', email: 'panand@aureliagold.example', linkedin: 'https://linkedin.com/in/priyaanand', location: 'Vancouver, BC', emailStatus: 'verified', confidence: 91 });
  seedContact(aurelia, { name: 'Tom Reilly', title: 'VP Investor Relations', role: 'VP Investor Relations', email: 'treilly@aureliagold.example', location: 'Toronto, ON', emailStatus: 'risky', confidence: 68 });
  seedTrigger(aurelia, { type: 'bought_deal', headline: 'Aurelia Gold closes $10M bought-deal financing', detail: 'Priced at $0.55 with full warrant; proceeds for resource expansion drilling.', amount: 10_000_000, ageDays: 4, source: 'Stockhouse' });
  seedTrigger(aurelia, { type: 'drill_results', headline: 'Aurelia intersects 4.2 g/t Au over 18m at Eastern Zone', ageDays: 12, source: 'The Northern Miner' });
  seedActivity(aurelia, { type: 'note', subject: 'Flagged after $10M raise', body: 'Strong IR opportunity post-financing. Warrant coverage means investor-awareness budget likely.', ageDays: 3 });

  // 2 — Northwind Lithium (mining, CSE)
  const northwind = seedCompany({
    name: 'Northwind Lithium Ltd.', ticker: 'NWL', exchange: 'CSE', industry: 'Mining & Metals',
    marketCap: 42_000_000, sharePrice: 0.31, headquarters: 'Toronto, ON',
    website: 'https://northwindlithium.example', irContact: 'investors@northwindlithium.example',
    description: 'Hard-rock lithium explorer with claims in James Bay, Quebec.',
    status: 'researching', tags: ['Mining', 'CSE', 'Financing Candidate'], score: 74, ageDays: 18,
    recentFinancings: [{ amount: 5_000_000, type: 'Private Placement', date: daysAgo(22) }],
  });
  seedContact(northwind, { name: 'Sara Whitfield', title: 'Chief Executive Officer', role: 'CEO', email: 'swhitfield@northwindlithium.example', linkedin: 'https://linkedin.com/in/sarawhitfield', location: 'Toronto, ON', emailStatus: 'verified', confidence: 89 });
  seedContact(northwind, { name: 'Marc Lefebvre', title: 'VP Corporate Development', role: 'VP Corporate Development', email: 'mlefebvre@northwindlithium.example', location: 'Montreal, QC', emailStatus: 'unverified', confidence: null });
  seedTrigger(northwind, { type: 'private_placement', headline: 'Northwind Lithium announces $5M non-brokered private placement', amount: 5_000_000, ageDays: 22, source: 'Stockhouse' });
  seedTrigger(northwind, { type: 'management_change', headline: 'Northwind appoints new VP Corporate Development', ageDays: 9, source: 'Company release' });

  // 3 — Helios Renewables (energy, TSX)
  const helios = seedCompany({
    name: 'Helios Renewables Inc.', ticker: 'HLR', exchange: 'TSX', industry: 'Energy & Cleantech',
    marketCap: 310_000_000, sharePrice: 7.85, headquarters: 'Calgary, AB',
    website: 'https://heliosrenewables.example', irContact: 'ir@heliosrenewables.example',
    description: 'Utility-scale solar and battery-storage developer operating across western Canada.',
    status: 'in_sequence', tags: ['Energy', 'TSX', 'Investor Awareness'], score: 71, ageDays: 40,
  });
  seedContact(helios, { name: 'Elena Vasquez', title: 'Chief Executive Officer', role: 'CEO', email: 'evasquez@heliosrenewables.example', linkedin: 'https://linkedin.com/in/elenavasquez', location: 'Calgary, AB', emailStatus: 'verified', confidence: 94 });
  seedContact(helios, { name: 'James Okafor', title: 'VP Investor Relations', role: 'VP Investor Relations', email: 'jokafor@heliosrenewables.example', location: 'Calgary, AB', emailStatus: 'verified', confidence: 87 });
  seedTrigger(helios, { type: 'earnings', headline: 'Helios reports record Q2 revenue, raises full-year guidance', ageDays: 6, source: 'Financial Post' });
  seedActivity(helios, { type: 'email', subject: 'Intro email sent (Sequence: IR Awareness)', body: 'Day 1 introduction delivered to Elena Vasquez.', ageDays: 5 });
  seedActivity(helios, { type: 'call', subject: 'Discovery call with James Okafor', body: 'Discussed investor-awareness goals ahead of fall conference season.', ageDays: 2 });

  // 4 — Quantra Biosciences (life sciences, Nasdaq)
  const quantra = seedCompany({
    name: 'Quantra Biosciences', ticker: 'QNTB', exchange: 'Nasdaq', industry: 'Life Sciences',
    marketCap: 540_000_000, sharePrice: 14.20, headquarters: 'Boston, MA',
    website: 'https://quantrabio.example', irContact: 'ir@quantrabio.example',
    description: 'Clinical-stage biotech developing precision oncology therapeutics.',
    status: 'meeting', tags: ['Life Sciences', 'Nasdaq', 'Conference Prospect'], score: 66, ageDays: 50,
  });
  seedContact(quantra, { name: 'Rachel Stein', title: 'Chief Financial Officer', role: 'CFO', email: 'rstein@quantrabio.example', linkedin: 'https://linkedin.com/in/rachelstein', location: 'Boston, MA', emailStatus: 'verified', confidence: 92 });
  seedContact(quantra, { name: 'David Chu', title: 'Director, Investor Relations', role: 'IR Manager', email: 'dchu@quantrabio.example', location: 'Boston, MA', emailStatus: 'risky', confidence: 61 });
  seedTrigger(quantra, { type: 'ir_initiative', headline: 'Quantra to present at the Cantor Oncology Conference', ageDays: 8, source: 'Business Wire' });
  seedActivity(quantra, { type: 'meeting', subject: 'Intro meeting booked with Rachel Stein', body: 'Calendar hold for next Tuesday to walk through our IR program.', ageDays: 1 });

  // 5 — Meridian Data Systems (tech, NYSE) — current client
  const meridian = seedCompany({
    name: 'Meridian Data Systems', ticker: 'MDS', exchange: 'NYSE', industry: 'Technology & Innovation',
    marketCap: 1_200_000_000, sharePrice: 28.40, headquarters: 'Austin, TX',
    website: 'https://meridiandata.example', irContact: 'ir@meridiandata.example',
    description: 'Enterprise data-infrastructure and analytics platform.',
    status: 'client', tags: ['Technology', 'NYSE', 'Investor Awareness'], score: 58, ageDays: 120,
  });
  seedContact(meridian, { name: 'Karen Liu', title: 'VP Investor Relations', role: 'VP Investor Relations', email: 'kliu@meridiandata.example', linkedin: 'https://linkedin.com/in/karenliu', location: 'Austin, TX', emailStatus: 'verified', confidence: 98 });
  seedActivity(meridian, { type: 'meeting', subject: 'Quarterly program review', body: 'Reviewed coverage and engagement metrics; renewed for another quarter.', ageDays: 7 });

  // 6 — Cascade Copper (mining, ASX) — new listing
  const cascade = seedCompany({
    name: 'Cascade Copper Ltd.', ticker: 'CSC', exchange: 'ASX', industry: 'Mining & Metals',
    marketCap: 28_000_000, sharePrice: 0.18, headquarters: 'Perth, WA',
    website: 'https://cascadecopper.example', irContact: 'ir@cascadecopper.example',
    description: 'Copper-gold explorer recently listed on the ASX with assets in Chile.',
    status: 'new', tags: ['Mining', 'Financing Candidate'], score: 79, ageDays: 6,
  });
  seedContact(cascade, { name: 'Owen Pritchard', title: 'Managing Director', role: 'CEO', email: 'opritchard@cascadecopper.example', location: 'Perth, WA', emailStatus: 'unverified', confidence: null });
  seedTrigger(cascade, { type: 'new_listing', headline: 'Cascade Copper begins trading on the ASX following $8M IPO', amount: 8_000_000, ageDays: 6, source: 'ASX' });

  // ── Sequences ───────────────────────────────────────────────────────────────
  const irSeq = {
    id: newId('sq'),
    name: 'Post-Financing IR Awareness',
    description: 'Outreach to companies that just closed a raise.',
    status: 'active',
    steps: [
      { id: newId('st'), day: 1, channel: 'email', subject: 'Congrats on the {{financingAmount}} raise, {{firstName}}', body: 'Hi {{firstName}},\n\nCongratulations on closing your recent {{financingAmount}} financing. We help public companies like {{companyName}} translate capital raises into sustained investor awareness.\n\nWorth a quick conversation?' },
      { id: newId('st'), day: 4, channel: 'email', subject: 'Following up — {{companyName}} investor awareness', body: 'Hi {{firstName}},\n\nJust circling back on my note about an investor-awareness program for {{companyName}} on the {{exchange}}. Happy to share a one-pager.' },
      { id: newId('st'), day: 8, channel: 'email', subject: 'How {{industry}} issuers grow their shareholder base', body: 'Hi {{firstName}},\n\nThought this case study on a comparable {{industry}} issuer might be useful — they grew retail engagement materially within two quarters.' },
      { id: newId('st'), day: 14, channel: 'email', subject: 'Last note, {{firstName}}', body: 'Hi {{firstName}},\n\nI’ll leave it here for now — if increasing investor awareness for {{companyName}} becomes a priority, I’m one reply away.' },
    ],
    createdAt: daysAgo(30),
  };
  db.sequences.push(irSeq);

  db.sequences.push({
    id: newId('sq'),
    name: 'Conference Season Outreach',
    description: 'For companies presenting at upcoming investor conferences.',
    status: 'draft',
    steps: [
      { id: newId('st'), day: 1, channel: 'email', subject: 'Meeting at the conference, {{firstName}}?', body: 'Hi {{firstName}},\n\nI saw {{companyName}} is presenting — would love to connect on the sidelines.' },
      { id: newId('st'), day: 5, channel: 'email', subject: 'Quick follow-up', body: 'Hi {{firstName}},\n\nFollowing up in case my last note got buried ahead of the conference.' },
    ],
    createdAt: daysAgo(12),
  });

  // Enroll Helios CEO in the IR sequence (matches its "in_sequence" status)
  const heliosCo = db.companies.find((c) => c.id === helios);
  const heliosContact = db.contacts.find((c) => c.companyId === helios && c.role === 'CEO');
  db.enrollments.push({
    id: newId('en'),
    sequenceId: irSeq.id,
    companyId: heliosCo.id,
    contactId: heliosContact.id,
    status: 'active', // active | paused | replied | completed
    currentStep: 1,
    enrolledAt: daysAgo(5),
    events: [
      { type: 'sent', step: 0, date: daysAgo(5) },
      { type: 'open', step: 0, date: daysAgo(5) },
      { type: 'open', step: 0, date: daysAgo(4) },
    ],
  });

  // Tasks
  db.tasks.push({ id: newId('tk'), companyId: aurelia, title: 'Send personalized intro to Daniel Mercer', due: daysAgo(-1), done: false, createdAt: daysAgo(2) });
  db.tasks.push({ id: newId('tk'), companyId: quantra, title: 'Prep deck for Rachel Stein meeting', due: daysAgo(-2), done: false, createdAt: daysAgo(1) });
  db.tasks.push({ id: newId('tk'), companyId: northwind, title: 'Verify Marc Lefebvre email', due: daysAgo(0), done: false, createdAt: daysAgo(1) });
})();

// ── Query helpers ────────────────────────────────────────────────────────────
export const findCompany = (id) => db.companies.find((c) => c.id === id);
export const contactsFor = (companyId) => db.contacts.filter((c) => c.companyId === companyId);
export const triggersFor = (companyId) => db.triggers.filter((t) => t.companyId === companyId);
export const activitiesFor = (companyId) => db.activities.filter((a) => a.companyId === companyId);
export const tasksFor = (companyId) => db.tasks.filter((t) => t.companyId === companyId);
export const enrollmentsFor = (companyId) => db.enrollments.filter((e) => e.companyId === companyId);

export const touch = (company) => { company.updatedAt = now(); return company; };
