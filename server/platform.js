// Public-company prospecting platform — API routes.
// Covers all 8 modules at MVP depth over the in-memory store in store.js.
import express from 'express';
import {
  db, newId,
  PROSPECT_STATUSES, STATUS_IDS, EXCHANGES, TRIGGER_TYPES, TRIGGER_IDS, ACTIVITY_TYPES,
  findCompany, contactsFor, triggersFor, activitiesFor, tasksFor, enrollmentsFor, touch,
} from './store.js';
import { hasClaude, requireClaude, callJson, callText } from './ai.js';

export const platform = express.Router();

const within = (iso, days) => (Date.now() - Date.parse(iso)) <= days * 86400000;
const labelFor = (list, id) => list.find((x) => x.id === id)?.label || id;

// Email-pattern guesser for inferred contacts (kept deterministic & transparent).
function emailFromName(name, website) {
  const host = (website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'example.com';
  const parts = name.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || 'contact';
  const last = parts[parts.length - 1] || '';
  return `${first}.${last}@${host}`.replace(/[^a-z0-9._@-]/g, '');
}

// ── Meta / reference ─────────────────────────────────────────────────────────
platform.get('/meta', (_req, res) => {
  const tags = [...new Set(db.companies.flatMap((c) => c.tags))].sort();
  res.json({
    statuses: PROSPECT_STATUSES,
    exchanges: EXCHANGES,
    triggerTypes: TRIGGER_TYPES,
    activityTypes: ACTIVITY_TYPES,
    tags,
    hasClaude: hasClaude(),
  });
});

// ── Module 1: Company database ───────────────────────────────────────────────
function enrichCompanyOut(c) {
  return {
    ...c,
    contactCount: contactsFor(c.id).length,
    triggerCount: triggersFor(c.id).length,
    openTasks: tasksFor(c.id).filter((t) => !t.done).length,
  };
}

platform.get('/companies', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const status = (req.query.status || '').toString();
  const exchange = (req.query.exchange || '').toString();
  const tag = (req.query.tag || '').toString();
  const watchlist = req.query.watchlist;

  let rows = db.companies.slice();
  if (q) rows = rows.filter((c) => `${c.name} ${c.ticker} ${c.industry} ${c.headquarters}`.toLowerCase().includes(q));
  if (status) rows = rows.filter((c) => c.status === status);
  if (exchange) rows = rows.filter((c) => c.exchange === exchange);
  if (tag) rows = rows.filter((c) => c.tags.includes(tag));
  if (watchlist === 'true') rows = rows.filter((c) => c.watchlist);

  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  res.json({ companies: rows.map(enrichCompanyOut), total: rows.length });
});

platform.get('/companies/:id', (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  res.json({
    company: c,
    contacts: contactsFor(c.id),
    triggers: triggersFor(c.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    activities: activitiesFor(c.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    tasks: tasksFor(c.id),
    enrollments: enrollmentsFor(c.id),
  });
});

platform.post('/companies', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const c = {
    id: newId('co'),
    name: b.name, ticker: b.ticker || '', exchange: b.exchange || '', industry: b.industry || '',
    marketCap: b.marketCap ?? null, sharePrice: b.sharePrice ?? null,
    headquarters: b.headquarters || '', website: b.website || '', irContact: b.irContact || '',
    description: b.description || '', status: STATUS_IDS.includes(b.status) ? b.status : 'new',
    tags: b.tags || [], score: null, scoreBreakdown: null, watchlist: b.watchlist ?? true,
    recentFinancings: b.recentFinancings || [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  db.companies.unshift(c);
  res.status(201).json({ company: c });
});

platform.patch('/companies/:id', (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const b = req.body || {};
  const fields = ['name', 'ticker', 'exchange', 'industry', 'marketCap', 'sharePrice',
    'headquarters', 'website', 'irContact', 'description', 'tags', 'watchlist', 'recentFinancings'];
  for (const f of fields) if (f in b) c[f] = b[f];
  if ('status' in b && STATUS_IDS.includes(b.status)) {
    if (b.status !== c.status) {
      db.activities.push({
        id: newId('ac'), companyId: c.id, contactId: null, type: 'note',
        subject: `Status changed: ${labelFor(PROSPECT_STATUSES, c.status)} → ${labelFor(PROSPECT_STATUSES, b.status)}`,
        body: '', date: new Date().toISOString(), createdBy: 'you',
      });
    }
    c.status = b.status;
  }
  touch(c);
  res.json({ company: c });
});

platform.delete('/companies/:id', (req, res) => {
  const i = db.companies.findIndex((c) => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Company not found' });
  const [removed] = db.companies.splice(i, 1);
  db.contacts = db.contacts.filter((x) => x.companyId !== removed.id);
  db.triggers = db.triggers.filter((x) => x.companyId !== removed.id);
  db.activities = db.activities.filter((x) => x.companyId !== removed.id);
  db.tasks = db.tasks.filter((x) => x.companyId !== removed.id);
  db.enrollments = db.enrollments.filter((x) => x.companyId !== removed.id);
  res.json({ ok: true });
});

// Bulk import (CSV parsed client-side into rows) with dedupe by ticker+exchange or name.
platform.post('/companies/import', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  let created = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const name = (r.name || r.Name || r.company || r.Company || '').toString().trim();
    const ticker = (r.ticker || r.Ticker || r.symbol || r.Symbol || '').toString().trim().toUpperCase();
    const exchange = (r.exchange || r.Exchange || '').toString().trim();
    if (!name && !ticker) { skipped++; continue; }
    const match = db.companies.find((c) =>
      (ticker && c.ticker && c.ticker.toUpperCase() === ticker && (!exchange || c.exchange === exchange)) ||
      (!ticker && name && c.name.toLowerCase() === name.toLowerCase()));
    const payload = {
      name: name || match?.name || ticker,
      ticker, exchange,
      industry: (r.industry || r.Industry || '').toString().trim(),
      headquarters: (r.headquarters || r.Headquarters || r.location || '').toString().trim(),
      website: (r.website || r.Website || '').toString().trim(),
      marketCap: Number(r.marketCap || r.MarketCap || r['Market Cap']) || null,
      sharePrice: Number(r.sharePrice || r.SharePrice || r['Share Price']) || null,
    };
    if (match) {
      for (const [k, v] of Object.entries(payload)) if (v) match[k] = v;
      touch(match); updated++;
    } else {
      db.companies.unshift({
        id: newId('co'), ...payload, irContact: '', description: '', status: 'new',
        tags: [], score: null, scoreBreakdown: null, watchlist: true, recentFinancings: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      created++;
    }
  }
  res.json({ created, updated, skipped, total: db.companies.length });
});

// ── Module 2: Contact enrichment ─────────────────────────────────────────────
const TARGET_ROLES = ['CEO', 'CFO', 'COO', 'VP Corporate Development', 'VP Investor Relations', 'IR Manager', 'Communications Lead', 'Marketing Lead'];

// AI-assisted enrichment: infer likely executive contacts for a company.
// Clearly flagged as AI-inferred; emails default to a guessed pattern + low confidence.
platform.post('/companies/:id/enrich', async (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const existingRoles = new Set(contactsFor(c.id).map((x) => x.role));
  const wanted = TARGET_ROLES.filter((r) => !existingRoles.has(r));

  let inferred = [];
  if (hasClaude()) {
    try {
      const schema = {
        type: 'object', additionalProperties: false,
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                name: { type: 'string' }, title: { type: 'string' },
                role: { type: 'string', enum: TARGET_ROLES },
                linkedinSlug: { type: 'string' }, location: { type: 'string' },
                confidence: { type: 'integer' },
              },
              required: ['name', 'title', 'role', 'linkedinSlug', 'location', 'confidence'],
            },
          },
        },
        required: ['contacts'],
      };
      const parsed = await callJson({
        system: 'You enrich executive contact data for public companies for a B2B prospecting tool. ' +
          'Where you are not certain of a real person, return a plausible placeholder name and set confidence low (<50). Never claim false certainty.',
        user: `Company: ${c.name} (${c.ticker || 'n/a'} on ${c.exchange || 'n/a'}). Industry: ${c.industry}. HQ: ${c.headquarters}. Website: ${c.website}\n\n` +
          `Provide likely people for these roles only: ${wanted.join(', ')}. Give name, exact title, a linkedin slug, a city, and a confidence 0-100.`,
        schema, maxTokens: 1500,
      });
      inferred = parsed?.contacts || [];
    } catch { /* fall through to deterministic */ }
  }
  if (!inferred.length) {
    inferred = wanted.slice(0, 4).map((role) => ({
      name: `${role} (name unknown)`, title: role, role, linkedinSlug: '', location: c.headquarters, confidence: 25,
    }));
  }

  const added = [];
  for (const p of inferred) {
    if (existingRoles.has(p.role)) continue;
    const conf = Math.max(0, Math.min(100, p.confidence ?? 30));
    const ct = {
      id: newId('ct'), companyId: c.id, name: p.name, title: p.title || p.role, role: p.role,
      email: emailFromName(p.name.replace(/\(.*\)/, ''), c.website),
      linkedin: p.linkedinSlug ? `https://linkedin.com/in/${p.linkedinSlug}` : '',
      location: p.location || c.headquarters,
      emailStatus: conf >= 70 ? 'unverified' : 'risky', confidence: conf,
      source: 'ai-enrich', createdAt: new Date().toISOString(),
    };
    db.contacts.push(ct);
    added.push(ct);
    existingRoles.add(p.role);
  }
  res.json({ added, contacts: contactsFor(c.id), aiUsed: hasClaude() });
});

// Email verification — simulated deliverability + confidence scoring.
platform.post('/contacts/:id/verify', (req, res) => {
  const ct = db.contacts.find((x) => x.id === req.params.id);
  if (!ct) return res.status(404).json({ error: 'Contact not found' });
  const email = (ct.email || '').toLowerCase();
  const looksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const role = /^(info|contact|admin|sales|hello|ir|investor)/.test(email.split('@')[0] || '');
  let status, confidence;
  if (!looksValid) { status = 'invalid'; confidence = 0; }
  else if (role) { status = 'risky'; confidence = 55; }
  else { status = 'verified'; confidence = Math.min(98, (ct.confidence || 70) + 10); }
  ct.emailStatus = status; ct.confidence = confidence; ct.verifiedAt = new Date().toISOString();
  res.json({ contact: ct });
});

platform.post('/contacts', (req, res) => {
  const b = req.body || {};
  const c = findCompany(b.companyId);
  if (!c) return res.status(400).json({ error: 'valid companyId is required' });
  const ct = {
    id: newId('ct'), companyId: c.id, name: b.name || '', title: b.title || '', role: b.role || '',
    email: b.email || '', linkedin: b.linkedin || '', location: b.location || '',
    emailStatus: 'unverified', confidence: null, source: 'manual', createdAt: new Date().toISOString(),
  };
  db.contacts.push(ct);
  res.status(201).json({ contact: ct });
});

// ── Module 3: News monitoring & triggers ─────────────────────────────────────
platform.get('/triggers', (req, res) => {
  const type = (req.query.type || '').toString();
  const flaggedOnly = req.query.flagged === 'true';
  let rows = db.triggers.slice();
  if (type) rows = rows.filter((t) => t.type === type);
  if (flaggedOnly) rows = rows.filter((t) => t.flagged);
  rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  res.json({
    triggers: rows.map((t) => ({ ...t, company: pickCompany(findCompany(t.companyId)) })),
    total: rows.length,
  });
});

const pickCompany = (c) => c && ({ id: c.id, name: c.name, ticker: c.ticker, exchange: c.exchange, industry: c.industry, status: c.status, score: c.score });

platform.post('/triggers', (req, res) => {
  const b = req.body || {};
  const c = findCompany(b.companyId);
  if (!c) return res.status(400).json({ error: 'valid companyId is required' });
  const t = {
    id: newId('tg'), companyId: c.id, type: TRIGGER_IDS.includes(b.type) ? b.type : 'ir_initiative',
    headline: b.headline || '', detail: b.detail || '', amount: b.amount || null,
    url: b.url || '', source: b.source || '', flagged: b.flagged ?? true, date: b.date || new Date().toISOString(),
  };
  db.triggers.push(t);
  res.status(201).json({ trigger: t });
});

// AI news scan — uses Claude web-search to find recent developments for a company
// and classify them into trigger types. Falls back gracefully without a key.
platform.post('/companies/:id/scan-news', async (req, res) => {
  if (!requireClaude(res)) return;
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  try {
    const schema = {
      type: 'object', additionalProperties: false,
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              type: { type: 'string', enum: TRIGGER_IDS },
              headline: { type: 'string' }, detail: { type: 'string' },
              amount: { type: ['number', 'null'] }, url: { type: 'string' }, source: { type: 'string' },
            },
            required: ['type', 'headline', 'detail', 'amount', 'url', 'source'],
          },
        },
      },
      required: ['events'],
    };
    const parsed = await callJson({
      system: 'You monitor public-company news for a capital-markets prospecting tool. Identify recent material developments ' +
        'and classify each into a trigger type. Only include real, plausible corporate events; never fabricate dollar figures.',
      user: `Find recent corporate developments for ${c.name} (${c.ticker || 'n/a'} / ${c.exchange || 'n/a'}, ${c.industry}). ` +
        `Classify each into one of: ${TRIGGER_IDS.join(', ')}. Return up to 5 events.`,
      schema, maxTokens: 1500,
    });
    const events = (parsed?.events || []).map((e) => {
      const t = {
        id: newId('tg'), companyId: c.id, type: TRIGGER_IDS.includes(e.type) ? e.type : 'ir_initiative',
        headline: e.headline, detail: e.detail || '', amount: e.amount || null,
        url: e.url || '', source: e.source || '', flagged: true, date: new Date().toISOString(),
      };
      db.triggers.push(t);
      return t;
    });
    res.json({ added: events, triggers: triggersFor(c.id) });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Module 4: Prospecting board (Kanban grouped by status) ───────────────────
platform.get('/board', (_req, res) => {
  const columns = PROSPECT_STATUSES.map((s) => ({
    ...s,
    companies: db.companies
      .filter((c) => c.status === s.id)
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .map(enrichCompanyOut),
  }));
  res.json({ columns });
});

// ── Module 7: CRM (activities + tasks) ───────────────────────────────────────
platform.post('/companies/:id/activities', (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const b = req.body || {};
  if (!ACTIVITY_TYPES.includes(b.type)) return res.status(400).json({ error: `type must be one of ${ACTIVITY_TYPES.join(', ')}` });
  const a = {
    id: newId('ac'), companyId: c.id, contactId: b.contactId || null, type: b.type,
    subject: b.subject || '', body: b.body || '', date: b.date || new Date().toISOString(), createdBy: 'you',
  };
  db.activities.push(a);
  touch(c);
  res.status(201).json({ activity: a });
});

// Chronological timeline = activities + triggers (news) + sequence events, merged.
platform.get('/companies/:id/timeline', (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const items = [
    ...activitiesFor(c.id).map((a) => ({ kind: 'activity', subtype: a.type, title: a.subject, body: a.body, date: a.date })),
    ...triggersFor(c.id).map((t) => ({ kind: 'news', subtype: t.type, title: t.headline, body: t.detail, date: t.date, url: t.url })),
    ...enrollmentsFor(c.id).flatMap((e) => e.events.map((ev) => ({ kind: 'sequence', subtype: ev.type, title: `Email ${ev.type}`, body: '', date: ev.date }))),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  res.json({ timeline: items });
});

platform.get('/tasks', (req, res) => {
  const open = req.query.open === 'true';
  let rows = db.tasks.slice();
  if (open) rows = rows.filter((t) => !t.done);
  rows.sort((a, b) => Date.parse(a.due || a.createdAt) - Date.parse(b.due || b.createdAt));
  res.json({ tasks: rows.map((t) => ({ ...t, company: pickCompany(findCompany(t.companyId)) })) });
});

platform.post('/tasks', (req, res) => {
  const b = req.body || {};
  const t = { id: newId('tk'), companyId: b.companyId || null, title: b.title || '', due: b.due || null, done: false, createdAt: new Date().toISOString() };
  db.tasks.push(t);
  res.status(201).json({ task: t });
});

platform.patch('/tasks/:id', (req, res) => {
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if ('done' in req.body) t.done = Boolean(req.body.done);
  if ('title' in req.body) t.title = req.body.title;
  if ('due' in req.body) t.due = req.body.due;
  res.json({ task: t });
});

// ── Module 5: Email sequencing ───────────────────────────────────────────────
platform.get('/sequences', (_req, res) => {
  res.json({
    sequences: db.sequences.map((s) => ({
      ...s,
      enrolled: db.enrollments.filter((e) => e.sequenceId === s.id).length,
    })),
  });
});

platform.get('/sequences/:id', (req, res) => {
  const s = db.sequences.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Sequence not found' });
  const enrollments = db.enrollments.filter((e) => e.sequenceId === s.id).map((e) => ({
    ...e, company: pickCompany(findCompany(e.companyId)),
    contact: db.contacts.find((c) => c.id === e.contactId) || null,
  }));
  res.json({ sequence: s, enrollments });
});

platform.post('/sequences', (req, res) => {
  const b = req.body || {};
  const s = {
    id: newId('sq'), name: b.name || 'Untitled sequence', description: b.description || '',
    status: b.status === 'active' ? 'active' : 'draft',
    steps: (b.steps || []).map((st) => ({
      id: newId('st'), day: Number(st.day) || 1, channel: st.channel || 'email',
      subject: st.subject || '', body: st.body || '',
    })),
    createdAt: new Date().toISOString(),
  };
  db.sequences.push(s);
  res.status(201).json({ sequence: s });
});

platform.patch('/sequences/:id', (req, res) => {
  const s = db.sequences.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Sequence not found' });
  const b = req.body || {};
  if ('name' in b) s.name = b.name;
  if ('description' in b) s.description = b.description;
  if ('status' in b) s.status = b.status === 'active' ? 'active' : 'draft';
  if ('steps' in b) {
    s.steps = (b.steps || []).map((st) => ({
      id: st.id || newId('st'), day: Number(st.day) || 1, channel: st.channel || 'email',
      subject: st.subject || '', body: st.body || '',
    }));
  }
  res.json({ sequence: s });
});

platform.delete('/sequences/:id', (req, res) => {
  const i = db.sequences.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Sequence not found' });
  db.sequences.splice(i, 1);
  db.enrollments = db.enrollments.filter((e) => e.sequenceId !== req.params.id);
  res.json({ ok: true });
});

platform.post('/sequences/:id/enroll', (req, res) => {
  const s = db.sequences.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Sequence not found' });
  const c = findCompany(req.body?.companyId);
  if (!c) return res.status(400).json({ error: 'valid companyId is required' });
  const contact = req.body?.contactId ? db.contacts.find((x) => x.id === req.body.contactId) : contactsFor(c.id)[0];
  const en = {
    id: newId('en'), sequenceId: s.id, companyId: c.id, contactId: contact?.id || null,
    status: 'active', currentStep: 0, enrolledAt: new Date().toISOString(),
    events: [{ type: 'sent', step: 0, date: new Date().toISOString() }],
  };
  db.enrollments.push(en);
  if (c.status === 'ready' || c.status === 'new' || c.status === 'researching') c.status = 'in_sequence';
  db.activities.push({
    id: newId('ac'), companyId: c.id, contactId: contact?.id || null, type: 'email',
    subject: `Enrolled in sequence: ${s.name}`, body: `Step 1 (${s.steps[0]?.subject || ''}) queued.`,
    date: new Date().toISOString(), createdBy: 'you',
  });
  touch(c);
  res.status(201).json({ enrollment: en });
});

// Simulate a reply landing — pauses the enrollment (Module 6 behavior).
platform.post('/enrollments/:id/reply', (req, res) => {
  const en = db.enrollments.find((x) => x.id === req.params.id);
  if (!en) return res.status(404).json({ error: 'Enrollment not found' });
  en.status = 'replied';
  en.events.push({ type: 'reply', step: en.currentStep, date: new Date().toISOString() });
  res.json({ enrollment: en });
});

// ── Module 6: Gmail integration (status + simulated send) ────────────────────
platform.get('/gmail/status', (_req, res) => {
  res.json({
    connected: false,
    account: null,
    note: 'Gmail is not yet connected. In production this uses the Gmail API (OAuth) to send from your inbox, ' +
      'sync sent mail and replies, track opens/clicks, and auto-pause sequences on reply.',
    capabilities: ['send', 'sync-sent', 'sync-replies', 'track-opens', 'track-clicks', 'pause-on-reply'],
  });
});

platform.post('/gmail/send', (req, res) => {
  const b = req.body || {};
  const c = b.companyId ? findCompany(b.companyId) : null;
  if (c) {
    db.activities.push({
      id: newId('ac'), companyId: c.id, contactId: b.contactId || null, type: 'email',
      subject: b.subject || '(no subject)', body: b.body || '', date: new Date().toISOString(), createdBy: 'you',
    });
    touch(c);
  }
  // Simulated send — real implementation calls the Gmail API.
  res.json({ sent: true, simulated: true, to: b.to || null, messageId: newId('msg') });
});

// ── Module 8 + AI: opportunity scoring engine ────────────────────────────────
function scoreCompany(c) {
  const trg = triggersFor(c.id);
  const has = (type) => trg.some((t) => t.type === type);
  const recent = (type, days = 30) => trg.some((t) => t.type === type && within(t.date, days));
  let financing = 0, ir = 0, growth = 0;

  // Financing signals (max ~40)
  const fin = c.recentFinancings || [];
  if (recent('financing') || recent('bought_deal') || recent('private_placement') || fin.length) financing += 22;
  const biggest = Math.max(0, ...fin.map((f) => f.amount || 0), ...trg.filter((t) => t.amount).map((t) => t.amount));
  if (biggest >= 10_000_000) financing += 12; else if (biggest >= 3_000_000) financing += 7;
  if (fin.length + trg.filter((t) => ['financing', 'bought_deal', 'private_placement'].includes(t.type)).length >= 2) financing += 6;

  // IR signals (max ~30)
  if (recent('management_change', 60)) ir += 10;
  if (has('ir_initiative')) ir += 8;
  if (has('new_listing')) ir += 9;
  if ((c.marketCap || 0) > 0 && c.marketCap < 250_000_000) ir += 6; // micro/small caps need awareness most

  // Growth signals (max ~30)
  if (has('ma')) growth += 12;
  if (has('uplisting')) growth += 10;
  if (recent('drill_results', 45) || recent('earnings', 30)) growth += 6;
  if (has('volume_spike') || has('price_move')) growth += 6;

  const raw = financing + ir + growth;
  const total = Math.max(1, Math.min(100, Math.round(raw)));
  return { total, breakdown: { financing, ir, growth } };
}

platform.post('/companies/:id/score', (req, res) => {
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const { total, breakdown } = scoreCompany(c);
  c.score = total; c.scoreBreakdown = breakdown; touch(c);
  res.json({ score: total, breakdown });
});

platform.post('/score-all', (_req, res) => {
  for (const c of db.companies) {
    const { total, breakdown } = scoreCompany(c);
    c.score = total; c.scoreBreakdown = breakdown;
  }
  res.json({ scored: db.companies.length });
});

platform.get('/opportunities', (_req, res) => {
  const rows = db.companies
    .map((c) => ({ ...enrichCompanyOut(c), score: c.score ?? scoreCompany(c).total, scoreBreakdown: c.scoreBreakdown || scoreCompany(c).breakdown }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  res.json({ opportunities: rows });
});

// ── AI: research agent + outreach writer + personalization ───────────────────
platform.post('/ai/research/:id', async (req, res) => {
  if (!requireClaude(res)) return;
  const c = findCompany(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found' });
  const trg = triggersFor(c.id).slice(0, 6).map((t) => `- ${t.headline}`).join('\n') || '- (no tracked news yet)';
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      financingHistory: { type: 'string' },
      competitiveLandscape: { type: 'string' },
      irOpportunities: { type: 'array', items: { type: 'string' } },
      outreachAngle: { type: 'string' },
    },
    required: ['summary', 'financingHistory', 'competitiveLandscape', 'irOpportunities', 'outreachAngle'],
  };
  try {
    const analysis = await callJson({
      system: 'You are an AI research agent for a capital-markets advisory firm that sells investor-relations and investor-awareness ' +
        'services to public companies. Produce a concise, accurate research brief. Never invent specific financials; reason from what is given.',
      user: `Company: ${c.name} (${c.ticker || 'n/a'} / ${c.exchange || 'n/a'})\nIndustry: ${c.industry}\nHQ: ${c.headquarters}\n` +
        `Market cap: ${c.marketCap || 'n/a'} · Share price: ${c.sharePrice || 'n/a'}\nDescription: ${c.description}\nRecent tracked news:\n${trg}\n\n` +
        `Write: a company summary, a read on financing history, a brief competitive landscape, 3-4 concrete IR/investor-awareness opportunities, and a recommended outreach angle for our firm.`,
      schema, maxTokens: 1800,
    });
    res.json({ research: analysis });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Resolve personalization variables for a company/contact pairing.
function variablesFor(company, contact) {
  const fin = (company.recentFinancings || [])[0] || triggersFor(company.id).find((t) => t.amount);
  const latest = triggersFor(company.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const fmt = (n) => n ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : '';
  return {
    firstName: (contact?.name || '').split(' ')[0] || 'there',
    companyName: company.name,
    financingAmount: fmt(fin?.amount),
    latestHeadline: latest?.headline || '',
    exchange: company.exchange || '',
    industry: company.industry || '',
  };
}
function applyVars(text, vars) {
  return (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (vars[k] ?? `{{${k}}}`));
}

platform.post('/ai/personalize', async (req, res) => {
  const c = findCompany(req.body?.companyId);
  if (!c) return res.status(400).json({ error: 'valid companyId is required' });
  const contact = req.body?.contactId ? db.contacts.find((x) => x.id === req.body.contactId) : contactsFor(c.id)[0];
  const vars = variablesFor(c, contact);
  if (!hasClaude()) {
    const fallback = vars.financingAmount
      ? `Congratulations on closing your recent ${vars.financingAmount} financing — exciting milestone for ${vars.companyName}.`
      : `I’ve been following ${vars.companyName}'s progress on the ${vars.exchange} and your work in ${vars.industry}.`;
    return res.json({ firstLine: fallback, variables: vars, aiUsed: false });
  }
  try {
    const trg = triggersFor(c.id).slice(0, 4).map((t) => `- ${t.headline}`).join('\n');
    const firstLine = await callText({
      system: 'You write a single, specific, non-salesy opening line for a cold outreach email from a capital-markets investor-awareness firm ' +
        'to a public-company executive. One sentence. Reference a real recent development. No greeting, no sign-off, no quotes.',
      user: `Company: ${c.name} (${c.exchange}). Industry: ${c.industry}. Contact: ${contact?.name || 'executive'} (${contact?.title || ''}).\n` +
        `Recent developments:\n${trg || '- (general)'}\n\nWrite the opening line.`,
      maxTokens: 160,
    });
    res.json({ firstLine: firstLine.replace(/^["']|["']$/g, ''), variables: vars, aiUsed: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

platform.post('/ai/write-email', async (req, res) => {
  if (!requireClaude(res)) return;
  const c = findCompany(req.body?.companyId);
  if (!c) return res.status(400).json({ error: 'valid companyId is required' });
  const contact = req.body?.contactId ? db.contacts.find((x) => x.id === req.body.contactId) : contactsFor(c.id)[0];
  const kind = req.body?.kind || 'cold-email'; // cold-email | linkedin | follow-up
  const vars = variablesFor(c, contact);
  const trg = triggersFor(c.id).slice(0, 4).map((t) => `- ${t.headline}`).join('\n');
  const guide = {
    'cold-email': 'A concise cold email (90-140 words) with a subject line on the first line prefixed "Subject: ". Specific, credible, one clear CTA.',
    'linkedin': 'A short LinkedIn connection message under 300 characters. Warm, specific, no hard pitch.',
    'follow-up': 'A 2-3 sentence follow-up email referencing the prior note, with a soft CTA.',
  }[kind] || 'A concise cold email.';
  try {
    const text = await callText({
      system: 'You are an outreach writer for a capital-markets investor-awareness firm selling to public companies. ' +
        'Confident, precise, compliant — no investment advice, no price targets, no guarantees, no invented figures.',
      user: `Write ${guide}\n\nRecipient: ${contact?.name || 'the executive'} (${contact?.title || 'executive'}) at ${c.name} on the ${c.exchange}.\n` +
        `Industry: ${c.industry}. Recent developments:\n${trg || '- (general)'}\n` +
        `If a financing of ${vars.financingAmount || 'n/a'} is relevant, reference it. Output only the message.`,
      maxTokens: 600,
    });
    res.json({ text, kind, variables: vars });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Render a sequence step with variables resolved for a company/contact.
platform.post('/sequences/:id/preview', (req, res) => {
  const s = db.sequences.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Sequence not found' });
  const c = findCompany(req.body?.companyId) || db.companies[0];
  const contact = req.body?.contactId ? db.contacts.find((x) => x.id === req.body.contactId) : contactsFor(c.id)[0];
  const vars = variablesFor(c, contact);
  res.json({
    variables: vars,
    steps: s.steps.map((st) => ({ ...st, subject: applyVars(st.subject, vars), body: applyVars(st.body, vars) })),
  });
});

// ── Dashboard ────────────────────────────────────────────────────────────────
platform.get('/dashboard', (_req, res) => {
  const newFinancing = db.triggers.filter((t) => ['financing', 'bought_deal', 'private_placement', 'new_listing'].includes(t.type) && within(t.date, 7));
  const inSequence = db.companies.filter((c) => c.status === 'in_sequence');
  const meetings = db.companies.filter((c) => c.status === 'meeting');
  const clients = db.companies.filter((c) => c.status === 'client');
  const allEvents = db.enrollments.flatMap((e) => e.events);
  const sent = allEvents.filter((e) => e.type === 'sent').length;
  const opens = allEvents.filter((e) => e.type === 'open').length;
  const replies = allEvents.filter((e) => e.type === 'reply').length;
  const topOpps = db.companies
    .map((c) => ({ id: c.id, name: c.name, ticker: c.ticker, exchange: c.exchange, status: c.status, score: c.score ?? scoreCompany(c).total }))
    .sort((a, b) => b.score - a.score).slice(0, 5);

  res.json({
    stats: {
      newFinancingOpps: newFinancing.length,
      watchlist: db.companies.filter((c) => c.watchlist).length,
      prospectsInSequence: inSequence.length,
      meetingsBooked: meetings.length,
      opportunitiesCreated: db.companies.filter((c) => (c.score ?? scoreCompany(c).total) >= 70).length,
      activeClients: clients.length,
      companies: db.companies.length,
      contacts: db.contacts.length,
    },
    emailPerformance: { sent, opens, replies, openRate: sent ? Math.min(100, Math.round((opens / sent) * 100)) : 0, replyRate: sent ? Math.min(100, Math.round((replies / sent) * 100)) : 0 },
    newFinancing: newFinancing.map((t) => ({ ...t, company: pickCompany(findCompany(t.companyId)) })),
    topOpportunities: topOpps,
    recentActivity: db.activities.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 8)
      .map((a) => ({ ...a, company: pickCompany(findCompany(a.companyId)) })),
  });
});
