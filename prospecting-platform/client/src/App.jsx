import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { demo, initialDemoFromUrl } from './demoFlag';
import {
  DEMO_COMPANIES, DEMO_SEQUENCES, DEMO_CONFERENCES, STATUSES, PIPELINE_STAGES, TAGS, EXCHANGES,
  SIGNAL_TYPES, SEQUENCE_VARS, scoreCompany, scoreBand, importCompaniesFromCsv, SAMPLE_CSV, SAMPLE_CONFERENCE_CSV,
} from './data';

// Seed demo mode from the URL (?demo=1) before any API call runs.
demo.set(initialDemoFromUrl());

const TABS = ['Dashboard', 'Companies', 'Pipeline', 'Signals', 'Sequences', 'Conferences'];

const clone = (x) => JSON.parse(JSON.stringify(x));
const money = (n) => (n ? `$${Number(n).toLocaleString()}` : '—');
function timeAgo(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(d)) return '';
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
const newId = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

// ── Root / shell ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [companies, setCompanies] = useState(() => clone(DEMO_COMPANIES));
  const [sequences, setSequences] = useState(() => clone(DEMO_SEQUENCES));
  const [conferences, setConferences] = useState(() => clone(DEMO_CONFERENCES));
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const [demoOn, setDemoOn] = useState(demo.enabled);
  const [watchOnly, setWatchOnly] = useState(false);

  useEffect(() => {
    // Auto-fall back to demo when the server has no Anthropic key.
    api.config()
      .then((c) => { if (!demo.enabled && c.hasAnthropicKey === false) applyDemo(true); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyDemo(on) {
    demo.set(on);
    setDemoOn(on);
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set('demo', '1'); else url.searchParams.delete('demo');
      window.history.replaceState({}, '', url);
    } catch { /* ignore */ }
  }

  const scored = useMemo(
    () => companies.map((c) => ({ ...c, _score: scoreCompany(c) })).sort((a, b) => b._score.score - a._score.score),
    [companies],
  );
  const open = openId ? scored.find((c) => c.id === openId) : null;

  function flash(msg) {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(''), 2600);
  }
  function updateCompany(id, patchOrFn) {
    setCompanies((cs) => cs.map((c) => (c.id === id ? { ...c, ...(typeof patchOrFn === 'function' ? patchOrFn(c) : patchOrFn) } : c)));
  }
  function addActivity(id, type, text) {
    updateCompany(id, (c) => ({ activities: [{ id: newId('ac'), type, text, date: new Date().toISOString() }, ...(c.activities || [])] }));
  }
  function toggleWatch(id) { updateCompany(id, (x) => ({ watchlist: !x.watchlist })); }

  // Enroll a specific contact at a company into a sequence (the recipient).
  function enrollOne(company, seq, contact, ctx = {}) {
    updateCompany(company.id, { status: 'In Sequence' });
    const who = contact ? `${contact.name} (${contact.title})` : (company.irContact || 'primary contact');
    addActivity(company.id, 'email', `Enrolled ${who} in "${seq.name}"${ctx.conference ? ` for ${ctx.conference}` : ''} (Step 1 queued)`);
    setSequences((ss) => ss.map((x) => (x.id === seq.id
      ? {
        ...x,
        stats: { ...x.stats, enrolled: x.stats.enrolled + 1 },
        recipients: [{ companyId: company.id, companyName: company.name, name: contact?.name || 'IR contact', title: contact?.title || '', email: contact?.email || company.irContact || '' }, ...(x.recipients || [])],
      }
      : x)));
  }
  function enroll(company, seq, contact, ctx) { enrollOne(company, seq, contact, ctx); flash(`Enrolled ${contact?.name || company.name} in ${seq.name}`); }
  function bulkEnroll(seq, list, ctx) {
    list.forEach((c) => enrollOne(c, seq, c.contacts?.[0], ctx));
    flash(`Enrolled ${list.length} ${list.length === 1 ? 'company' : 'companies'} in ${seq.name}`);
  }

  function createConference({ name, date, location }) {
    const conf = { id: newId('conf'), name: name || 'New conference', date: date || '', location: location || '', companyIds: [] };
    setConferences((cs) => [conf, ...cs]);
    return conf;
  }
  // Import a conference attendee CSV: dedupe into the company DB, tag as a
  // Conference Prospect, and attach the affected companies to the conference.
  function importConferenceCsv(confId, text, confName) {
    const res = importCompaniesFromCsv(text, companies.map(({ _score, ...c }) => c), ['Conference Prospect']);
    setCompanies(res.companies);
    setConferences((cs) => cs.map((cf) => (cf.id === confId ? { ...cf, companyIds: Array.from(new Set([...(cf.companyIds || []), ...res.affectedIds])) } : cf)));
    flash(`${confName}: +${res.created} new, ${res.updated} updated attendees`);
    return res;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="tag">Prospecting &amp; Outreach</span>
        </div>
        <nav className="nav">
          {TABS.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
        </nav>
        <div className="spacer" />
        <button
          className={`btn sm ghost demo-toggle ${demoOn ? 'on' : ''}`}
          onClick={() => applyDemo(!demoOn)}
          title={demoOn ? 'Showing bundled sample data — click for live mode' : 'Switch to bundled sample data (no API key needed)'}
        >
          <span className={`switch ${demoOn ? 'on' : ''}`} style={{ pointerEvents: 'none' }} /> Demo
        </button>
        <span className="src-chip" title="AI mode">
          <span className={`dot ${demoOn ? 'demo' : ''}`} />
          {demoOn ? 'Demo data' : 'Live AI'}
        </span>
      </header>

      <main className="main">
        {demoOn && (
          <div className="banner demo-banner">
            ◆ <b>Demo mode</b> — bundled sample companies, signals and sequences so you can explore the full workflow. Add an <code>ANTHROPIC_API_KEY</code> and turn Demo off for live AI enrichment, research and outreach.
          </div>
        )}

        {tab === 'Dashboard' && <Dashboard companies={scored} sequences={sequences} onOpen={setOpenId} onGo={setTab} onWatchlist={() => { setWatchOnly(true); setTab('Companies'); }} />}
        {tab === 'Companies' && (
          <Companies companies={scored} onOpen={setOpenId} onImport={setCompanies} flash={flash}
            onlyWatch={watchOnly} setOnlyWatch={setWatchOnly} sequences={sequences}
            onToggleWatch={toggleWatch} onBulkEnroll={bulkEnroll} />
        )}
        {tab === 'Pipeline' && <Pipeline companies={scored} onOpen={setOpenId} onMove={(id, status) => { updateCompany(id, { status }); addActivity(id, 'note', `Moved to ${status}`); flash(`→ ${status}`); }} />}
        {tab === 'Signals' && (
          <Signals companies={scored} onOpen={setOpenId}
            onFlag={(c) => { updateCompany(c.id, (x) => ({ status: x.status === 'New Prospect' ? 'Researching' : x.status, watchlist: true, tags: Array.from(new Set([...(x.tags || []), 'Financing Candidate'])) })); addActivity(c.id, 'note', 'Flagged as a prospect opportunity from a signal'); flash(`${c.name} flagged as an opportunity`); }} />
        )}
        {tab === 'Sequences' && (
          <Sequences sequences={sequences} setSequences={setSequences} companies={scored}
            onEnroll={(seq, c, contact) => enroll(c, seq, contact)} flash={flash} />
        )}
        {tab === 'Conferences' && (
          <Conferences conferences={conferences} companies={scored} sequences={sequences}
            onOpen={setOpenId} onCreate={createConference} onImportCsv={importConferenceCsv}
            onBulkEnroll={bulkEnroll} flash={flash} />
        )}
      </main>

      {open && (
        <CompanyDetail
          company={open}
          sequences={sequences}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => updateCompany(open.id, patch)}
          onActivity={(type, text) => addActivity(open.id, type, text)}
          onEnroll={(seq, contact) => enroll(open, seq, contact)}
          flash={flash}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Logo() {
  return (
    <span className="logo">
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#11203b" />
        <path d="M16 46V20l16 16 16-16v26" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="36" r="5" fill="#3b82f6" />
      </svg>
      <b>Market<span style={{ color: 'var(--accent)' }}>One</span></b>
    </span>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ companies, sequences, onOpen, onGo, onWatchlist }) {
  const now = Date.now();
  const week = 7 * 86400000;
  const newFinancings = companies.filter((c) => (c.signals || []).some((s) => s.type === 'financing' && now - new Date(s.date).getTime() <= week));
  const watchlist = companies.filter((c) => c.watchlist);
  const inSequence = companies.filter((c) => c.status === 'In Sequence');
  const meetings = companies.filter((c) => c.status === 'Meeting Booked');
  const opps = companies.filter((c) => c.opportunity);
  const clients = companies.filter((c) => ['Current Client', 'Won'].includes(c.status));
  const seqStats = sequences.reduce((a, s) => ({ sent: a.sent + s.stats.sent, opens: a.opens + s.stats.opens, replies: a.replies + s.stats.replies }), { sent: 0, opens: 0, replies: 0 });
  const openRate = seqStats.sent ? Math.round((seqStats.opens / seqStats.sent) * 100) : 0;
  const pipelineValue = opps.filter((c) => !['Won', 'Lost'].includes(c.status)).reduce((a, c) => a + (c.opportunity?.value || 0), 0);
  const recentSignals = companies.flatMap((c) => (c.signals || []).map((s) => ({ ...s, company: c }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Prospecting dashboard</h1>
          <p>A live read on public-company opportunities — financings, signals, pipeline, and outreach performance in one view.</p>
        </div>
        <button className="btn primary" onClick={() => onGo('Companies')}>Open company database →</button>
      </div>

      <div className="stat-row">
        <Kpi n={newFinancings.length} l="New financings this week" accent="var(--accent)" />
        <Kpi n={watchlist.length} l="On watchlists" onClick={onWatchlist} />
        <Kpi n={inSequence.length} l="In sequence" accent="var(--accent-2)" />
        <Kpi n={`${openRate}%`} l="Email open rate" />
        <Kpi n={meetings.length} l="Meetings booked" accent="var(--good)" />
        <Kpi n={opps.length} l="Opportunities" />
        <Kpi n={clients.length} l="Active clients" accent="var(--good)" />
        <Kpi n={money(pipelineValue)} l="Open pipeline value" accent="var(--accent-2)" />
      </div>

      <div className="cols">
        <div className="panel pad">
          <div className="section-label">Top opportunities by prospect score</div>
          <div className="opp-list">
            {companies.slice(0, 6).map((c) => {
              const band = scoreBand(c._score.score);
              return (
                <button key={c.id} className="opp-row" onClick={() => onOpen(c.id)}>
                  <ScoreRing score={c._score.score} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="opp-name">{c.name} <span className="muted">· {c.ticker}:{c.exchange}</span></div>
                    <div className="muted clip">{(c.signals?.[0]?.headline) || c.industry}</div>
                  </div>
                  <span className="band" style={{ color: band.accent, borderColor: band.accent }}>{band.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel pad">
          <div className="section-label">Latest signals</div>
          <div className="bar-list">
            {recentSignals.map((s) => {
              const t = SIGNAL_TYPES[s.type];
              return (
                <button key={s.id} className="sig-mini" onClick={() => onOpen(s.company.id)}>
                  <span className="sig-dot" style={{ background: t?.accent }} />
                  <span style={{ minWidth: 0 }}>
                    <span className="sig-mini-head">{s.headline}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>{t?.label} · {s.company.ticker} · {timeAgo(s.date)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ n, l, accent, onClick }) {
  return <div className={`panel kpi${onClick ? ' clickable' : ''}`} onClick={onClick}><div className="n" style={accent ? { color: accent } : undefined}>{n}</div><div className="l">{l}</div></div>;
}

function ScoreRing({ score, size = 38 }) {
  const band = scoreBand(score);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={band.accent} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.34} fontWeight="800" fill="var(--text)">{score}</text>
    </svg>
  );
}

// ── Companies ────────────────────────────────────────────────────────────────
function Companies({ companies, onOpen, onImport, flash, onlyWatch, setOnlyWatch, sequences, onToggleWatch, onBulkEnroll }) {
  const [q, setQ] = useState('');
  const [exch, setExch] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [status, setStatus] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [bulkSeq, setBulkSeq] = useState(sequences[0]?.id || '');

  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))), [companies]);
  const rows = companies.filter((c) => {
    if (onlyWatch && !c.watchlist) return false;
    if (exch !== 'all' && c.exchange !== exch) return false;
    if (industry !== 'all' && c.industry !== industry) return false;
    if (status !== 'all' && c.status !== status) return false;
    if (q.trim()) { const n = q.trim().toLowerCase(); if (!`${c.name} ${c.ticker} ${c.industry} ${(c.tags || []).join(' ')}`.toLowerCase().includes(n)) return false; }
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Company database</h1>
          <p>Every public company you track — scored, tagged, and ready to enrich. Import a CSV to add thousands at once.</p>
        </div>
        <button className="btn primary" onClick={() => setShowImport(true)}>⤓ Import CSV</button>
      </div>

      <div className="toolbar">
        <input className="grow" placeholder="Search company, ticker, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={exch} onChange={(e) => setExch(e.target.value)}><option value="all">All exchanges</option>{EXCHANGES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)}><option value="all">All industries</option>{industries.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        <button className={`pill ${onlyWatch ? 'active' : ''}`} onClick={() => setOnlyWatch((v) => !v)}>★ Watchlist</button>
      </div>

      <div className="bulk-bar">
        <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} {rows.length === 1 ? 'company' : 'companies'}{onlyWatch ? ' on your watchlist' : ''}</span>
        {rows.length > 0 && sequences.length > 0 && (
          <div className="bulk-actions">
            <span className="muted" style={{ fontSize: 12.5 }}>Enroll all in</span>
            <select value={bulkSeq} onChange={(e) => setBulkSeq(e.target.value)}>
              {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn sm primary" disabled={!bulkSeq} onClick={() => onBulkEnroll(sequences.find((s) => s.id === bulkSeq), rows)}>Enroll {rows.length} →</button>
          </div>
        )}
      </div>

      <div className="panel co-table">
        <div className="co-row co-head">
          <span>Score</span><span>Company</span><span>Industry</span><span>Market cap</span><span>Status</span><span>Signals</span><span></span>
        </div>
        {rows.map((c) => (
          <div className="co-row" key={c.id} onClick={() => onOpen(c.id)}>
            <span><ScoreRing score={c._score.score} size={34} /></span>
            <span style={{ minWidth: 0 }}>
              <span className="co-name">
                <span className={`star ${c.watchlist ? '' : 'off'}`} onClick={(e) => { e.stopPropagation(); onToggleWatch(c.id); }} title={c.watchlist ? 'Remove from watchlist' : 'Add to watchlist'}>★</span>
                {c.name}
              </span>
              <span className="muted co-sub">{c.ticker}:{c.exchange} · {c.hq}</span>
            </span>
            <span className="muted">{c.industry}{c.sector ? <><br /><span style={{ fontSize: 11 }}>{c.sector}</span></> : null}</span>
            <span className="muted">{c.marketCapStr || '—'}</span>
            <span><StatusPill status={c.status} /></span>
            <span className="sig-dots">
              {(c.signals || []).slice(0, 4).map((s) => <span key={s.id} className="sig-dot" title={SIGNAL_TYPES[s.type]?.label} style={{ background: SIGNAL_TYPES[s.type]?.accent }} />)}
              {(c.signals || []).length > 4 && <span className="muted" style={{ fontSize: 11 }}>+{c.signals.length - 4}</span>}
            </span>
            <span><button className="btn sm" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}>Open</button></span>
          </div>
        ))}
        {rows.length === 0 && <div className="empty" style={{ padding: 40 }}>No companies match these filters.</div>}
      </div>

      {showImport && <ImportModal companies={companies} onClose={() => setShowImport(false)} onImport={onImport} flash={flash} />}
    </>
  );
}

function StatusPill({ status }) {
  const tone = ['Won', 'Current Client'].includes(status) ? 'win'
    : ['Lost', 'Former Client'].includes(status) ? 'lost'
    : ['Meeting Booked', 'Proposal Sent', 'Negotiation'].includes(status) ? 'hot'
    : ['In Sequence', 'Ready for Outreach'].includes(status) ? 'active' : 'new';
  return <span className={`pstatus ${tone}`}>{status}</span>;
}

function ImportModal({ companies, onClose, onImport, flash }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  function run(csv) {
    const res = importCompaniesFromCsv(csv, companies.map(({ _score, ...c }) => c));
    setResult(res);
    onImport(res.companies);
    flash(`Imported: ${res.created} new, ${res.updated} updated`);
  }
  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result)); run(String(reader.result)); };
    reader.readAsText(file);
  }

  return (
    <Modal title="Bulk import companies" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Upload a CSV (Company, Ticker, Exchange, Industry, Market Cap, Headquarters, Website). Records are
        de-duplicated by ticker or name — existing companies are updated, new ones created.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label className="btn sm">Choose file…<input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} /></label>
        <button className="btn sm ghost" onClick={() => setText(SAMPLE_CSV)}>Paste sample</button>
        <button className="btn sm primary" onClick={() => run(text)} disabled={!text.trim()}>Import pasted CSV</button>
      </div>
      <textarea className="copy-out" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="…or paste CSV here" style={{ width: '100%' }} />
      {result && (
        <div className="banner ok" style={{ marginTop: 12 }}>
          ✓ {result.created} created · {result.updated} updated · {result.duplicates} duplicate{result.duplicates === 1 ? '' : 's'} merged.
        </div>
      )}
    </Modal>
  );
}

// ── Pipeline (Kanban) ────────────────────────────────────────────────────────
function Pipeline({ companies, onOpen, onMove }) {
  const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []]));
  for (const c of companies) if (byStage[c.status]) byStage[c.status].push(c);
  const stageValue = (s) => byStage[s].reduce((a, c) => a + (c.opportunity?.value || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pipeline</h1>
          <p>Move prospects through the funnel. Use the arrows on each card to advance or step back a stage.</p>
        </div>
      </div>
      <div className="kanban">
        {PIPELINE_STAGES.map((stage) => (
          <div className="kcol" key={stage}>
            <div className="kcol-head">
              <span>{stage}</span>
              <span className="muted">{byStage[stage].length}{stageValue(stage) ? ` · ${money(stageValue(stage))}` : ''}</span>
            </div>
            {byStage[stage].map((c) => {
              const i = PIPELINE_STAGES.indexOf(stage);
              return (
                <div className="kcard" key={c.id} onClick={() => onOpen(c.id)}>
                  <div className="kcard-top">
                    <span className="co-name" style={{ fontSize: 13 }}>{c.name}</span>
                    <ScoreRing score={c._score.score} size={30} />
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{c.ticker}:{c.exchange} · {c.industry}</div>
                  {c.opportunity?.value ? <div className="kval">{money(c.opportunity.value)}</div> : null}
                  <div className="kmove">
                    <button className="btn sm ghost" disabled={i === 0} onClick={(e) => { e.stopPropagation(); onMove(c.id, PIPELINE_STAGES[i - 1]); }}>←</button>
                    <button className="btn sm ghost" disabled={i === PIPELINE_STAGES.length - 1} onClick={(e) => { e.stopPropagation(); onMove(c.id, PIPELINE_STAGES[i + 1]); }}>→</button>
                  </div>
                </div>
              );
            })}
            {byStage[stage].length === 0 && <div className="kempty">—</div>}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Signals ──────────────────────────────────────────────────────────────────
function Signals({ companies, onOpen, onFlag }) {
  const [type, setType] = useState('all');
  const all = companies.flatMap((c) => (c.signals || []).map((s) => ({ ...s, company: c }))).sort((a, b) => new Date(b.date) - new Date(a.date));
  const rows = all.filter((s) => type === 'all' || s.type === type);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Signals &amp; triggers</h1>
          <p>Financings, management changes, M&amp;A, drill results and more — flag any signal to turn it into a prospect opportunity.</p>
        </div>
      </div>
      <div className="pillars">
        <button className={`pill ${type === 'all' ? 'active' : ''}`} onClick={() => setType('all')}>All <span className="muted">{all.length}</span></button>
        {Object.entries(SIGNAL_TYPES).map(([k, v]) => {
          const n = all.filter((s) => s.type === k).length;
          if (!n) return null;
          return <button key={k} className={`pill ${type === k ? 'active' : ''}`} onClick={() => setType(k)}><span className="swatch" style={{ background: v.accent }} />{v.label} <span className="muted">{n}</span></button>;
        })}
      </div>
      <div className="sig-feed">
        {rows.map((s) => {
          const t = SIGNAL_TYPES[s.type];
          return (
            <div className="panel sig-card" key={s.id} style={{ '--c': t?.accent }}>
              <span className="sig-tag" style={{ background: `${t?.accent}26`, color: t?.accent }}>{t?.label}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button className="sig-head" onClick={() => onOpen(s.company.id)}>{s.headline}</button>
                <div className="muted" style={{ fontSize: 12 }}>{s.company.name} · {s.company.ticker}:{s.company.exchange} · {s.source} · {timeAgo(s.date)}</div>
              </div>
              <button className="btn sm" onClick={() => onFlag(s.company)}>⚑ Flag opportunity</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Sequences ────────────────────────────────────────────────────────────────
function Sequences({ sequences, setSequences, companies, onEnroll, flash }) {
  const [editing, setEditing] = useState(null);
  const [enrollFor, setEnrollFor] = useState(null);

  if (editing) {
    return <SequenceBuilder sequence={editing} onClose={() => setEditing(null)}
      onSave={(seq) => { setSequences((s) => (s.some((x) => x.id === seq.id) ? s.map((x) => (x.id === seq.id ? seq : x)) : [...s, seq])); setEditing(null); flash('Sequence saved'); }} />;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Email sequences</h1>
          <p>Multi-step outbound campaigns with personalization variables and AI-written first lines. Pauses on reply.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing({ id: newId('seq'), name: 'New sequence', status: 'Draft', audience: '', steps: [{ day: 1, channel: 'Email', subject: '', body: '' }], stats: { enrolled: 0, sent: 0, opens: 0, replies: 0, meetings: 0 } })}>+ New sequence</button>
      </div>

      <div className="seq-grid">
        {sequences.map((seq) => {
          const rate = seq.stats.sent ? Math.round((seq.stats.opens / seq.stats.sent) * 100) : 0;
          const reply = seq.stats.sent ? Math.round((seq.stats.replies / seq.stats.sent) * 100) : 0;
          return (
            <div className="panel pad seq-card" key={seq.id}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 17 }}>{seq.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{seq.audience || '—'}</div>
                </div>
                <span className={`pstatus ${seq.status === 'Active' ? 'active' : 'new'}`}>{seq.status}</span>
              </div>

              <div className="seq-steps">
                {seq.steps.map((st, i) => (
                  <div className="seq-step" key={i}>
                    <span className="seq-day">Day {st.day}</span>
                    <span className="seq-ch">{st.channel}</span>
                    <span className="seq-subj">{st.subject || (st.channel === 'LinkedIn' ? '(LinkedIn message)' : '(no subject)')}</span>
                  </div>
                ))}
              </div>

              <div className="seq-stats">
                <span><b>{seq.stats.enrolled}</b> enrolled</span>
                <span><b>{seq.stats.sent}</b> sent</span>
                <span><b>{rate}%</b> open</span>
                <span><b>{reply}%</b> reply</span>
                <span><b>{seq.stats.meetings}</b> meetings</span>
              </div>

              {seq.recipients?.length > 0 && (
                <div className="seq-recips">
                  <span className="muted" style={{ fontSize: 11.5 }}>Recipients</span>
                  {seq.recipients.slice(0, 4).map((r, i) => <span key={i} className="recip-chip" title={r.email}>{r.name}{r.companyName ? ` · ${r.companyName}` : ''}</span>)}
                  {seq.recipients.length > 4 && <span className="muted" style={{ fontSize: 11.5 }}>+{seq.recipients.length - 4} more</span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn sm primary" onClick={() => setEnrollFor(seq)}>Enroll company</button>
                <button className="btn sm" onClick={() => setEditing(clone(seq))}>Edit steps</button>
              </div>
            </div>
          );
        })}
      </div>

      {enrollFor && (
        <EnrollModal seq={enrollFor} companies={companies} onClose={() => setEnrollFor(null)}
          onEnroll={(co, contact) => { onEnroll(enrollFor, co, contact); setEnrollFor(null); }} />
      )}
    </>
  );
}

// Two-step enroll: pick a company, then pick which contact is the recipient.
function EnrollModal({ seq, companies, onClose, onEnroll }) {
  const [coId, setCoId] = useState(null);
  const [ctIdx, setCtIdx] = useState(0);
  const co = companies.find((c) => c.id === coId);

  if (!co) {
    return (
      <Modal title={`Enroll in "${seq.name}" — pick a company`} onClose={onClose}>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Choose a prospect, then pick which contact to enroll. The sequence pauses automatically if they reply.</p>
        <div className="enroll-list">
          {companies.slice(0, 14).map((c) => (
            <button key={c.id} className="enroll-row" onClick={() => { setCoId(c.id); setCtIdx(0); }}>
              <ScoreRing score={c._score.score} size={30} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="co-name" style={{ fontSize: 13 }}>{c.name}</span>
                <span className="muted co-sub">{c.ticker}:{c.exchange} · {(c.contacts || []).length} contact{(c.contacts || []).length === 1 ? '' : 's'}</span>
              </span>
              <span className="btn sm">Choose →</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  const contacts = co.contacts || [];
  return (
    <Modal title={`Enroll ${co.name} — pick a contact`} onClose={onClose}>
      <button className="btn sm ghost" onClick={() => setCoId(null)} style={{ marginBottom: 12 }}>← Back to companies</button>
      {contacts.length === 0 ? (
        <div className="banner" style={{ marginBottom: 12 }}>No contacts on file — enrich this company first, or enroll the IR contact ({co.irContact || 'none'}).</div>
      ) : (
        <div className="pick-list">
          {contacts.map((p, i) => (
            <button key={p.id || i} className={`pick-row ${ctIdx === i ? 'on' : ''}`} onClick={() => setCtIdx(i)}>
              <span className={`radio ${ctIdx === i ? 'on' : ''}`} />
              <div className="av sm">{(p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div className="co-name" style={{ fontSize: 13 }}>{p.name} <span className="muted" style={{ fontWeight: 400 }}>· {p.title}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>{p.email} · <span className={`email-badge ${p.emailStatus}`}>{p.emailStatus}</span></div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => onEnroll(co, contacts[ctIdx])}>Enroll {contacts[ctIdx] ? contacts[ctIdx].name.split(' ')[0] : co.name} →</button>
      </div>
    </Modal>
  );
}

function SequenceBuilder({ sequence, onClose, onSave }) {
  const [seq, setSeq] = useState(sequence);
  const setStep = (i, patch) => setSeq((s) => ({ ...s, steps: s.steps.map((st, j) => (j === i ? { ...st, ...patch } : st)) }));
  const addStep = () => setSeq((s) => ({ ...s, steps: [...s.steps, { day: (s.steps.at(-1)?.day || 0) + 4, channel: 'Email', subject: '', body: '' }] }));
  const delStep = (i) => setSeq((s) => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sequence builder</h1>
          <p>Use <code>{'{{firstName}}'}</code>-style variables for personalization. They render per recipient on send.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(seq)}>Save sequence</button>
        </div>
      </div>

      <div className="seq-build">
        <div className="panel pad" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label className="fld" style={{ flex: 2, minWidth: 200 }}>Sequence name<input value={seq.name} onChange={(e) => setSeq({ ...seq, name: e.target.value })} /></label>
          <label className="fld" style={{ flex: 2, minWidth: 200 }}>Audience<input value={seq.audience} onChange={(e) => setSeq({ ...seq, audience: e.target.value })} placeholder="e.g. Mining issuers post-raise" /></label>
          <label className="fld" style={{ flex: 1, minWidth: 120 }}>Status
            <select value={seq.status} onChange={(e) => setSeq({ ...seq, status: e.target.value })}><option>Draft</option><option>Active</option><option>Paused</option></select>
          </label>
        </div>

        <div className="var-bar">
          <span className="section-label" style={{ margin: 0 }}>Variables</span>
          {SEQUENCE_VARS.map((v) => <code key={v.token} className="var-chip" title={v.label}>{`{{${v.token}}}`}</code>)}
        </div>

        {seq.steps.map((st, i) => (
          <div className="panel pad step-edit" key={i}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
              <label className="fld" style={{ width: 90 }}>Day<input type="number" min="1" value={st.day} onChange={(e) => setStep(i, { day: Number(e.target.value) })} /></label>
              <label className="fld" style={{ width: 130 }}>Channel<select value={st.channel} onChange={(e) => setStep(i, { channel: e.target.value })}><option>Email</option><option>LinkedIn</option></select></label>
              {st.channel === 'Email' && <label className="fld" style={{ flex: 1, minWidth: 200 }}>Subject<input value={st.subject} onChange={(e) => setStep(i, { subject: e.target.value })} placeholder="Subject line" /></label>}
              <button className="btn sm ghost" onClick={() => delStep(i)} disabled={seq.steps.length === 1} style={{ marginLeft: 'auto' }}>Remove</button>
            </div>
            <textarea className="copy-out" rows={4} value={st.body} onChange={(e) => setStep(i, { body: e.target.value })} placeholder="Message body — use {{firstName}}, {{companyName}}, {{financingAmount}}…" style={{ width: '100%' }} />
          </div>
        ))}
        <button className="btn" onClick={addStep}>+ Add step</button>
      </div>
    </>
  );
}

// ── Company detail ───────────────────────────────────────────────────────────
const DETAIL_TABS = ['Overview', 'Contacts', 'Signals', 'CRM', 'AI'];

function CompanyDetail({ company: c, sequences, onClose, onUpdate, onActivity, onEnroll, flash }) {
  const [sub, setSub] = useState('Overview');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <ScoreRing score={c._score.score} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>{c.name}</h2>
              <StatusPill status={c.status} />
            </div>
            <div className="muted" style={{ fontSize: 13 }}>{c.ticker}:{c.exchange} · {c.sector || c.industry} · {c.marketCapStr || '—'} · {c.hq}</div>
          </div>
          <button className={`btn sm ${c.watchlist ? 'primary' : 'ghost'}`} onClick={() => onUpdate({ watchlist: !c.watchlist })}>{c.watchlist ? '★ Watching' : '☆ Watch'}</button>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <div className="detail-tabs">{DETAIL_TABS.map((t) => <button key={t} className={sub === t ? 'active' : ''} onClick={() => setSub(t)}>{t}</button>)}</div>

        <div className="detail-body">
          {sub === 'Overview' && <Overview c={c} onUpdate={onUpdate} onActivity={onActivity} />}
          {sub === 'Contacts' && <Contacts c={c} onUpdate={onUpdate} flash={flash} />}
          {sub === 'Signals' && <SignalsTab c={c} />}
          {sub === 'CRM' && <Crm c={c} onActivity={onActivity} />}
          {sub === 'AI' && <AiTab c={c} sequences={sequences} onEnroll={onEnroll} flash={flash} />}
        </div>
      </div>
    </div>
  );
}

function Overview({ c, onUpdate, onActivity }) {
  function toggleTag(t) {
    onUpdate((x) => ({ tags: (x.tags || []).includes(t) ? x.tags.filter((y) => y !== t) : [...(x.tags || []), t] }));
  }
  return (
    <div className="detail-grid">
      <div className="panel pad">
        <div className="section-label">Profile</div>
        <dl className="kv">
          <dt>Website</dt><dd>{c.website ? <a className="link" href={`https://${c.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">{c.website} ↗</a> : '—'}</dd>
          <dt>Share price</dt><dd>{c.sharePrice != null ? `$${c.sharePrice}` : '—'}</dd>
          <dt>Market cap</dt><dd>{c.marketCapStr || '—'}</dd>
          <dt>IR contact</dt><dd>{c.irContact || '—'}</dd>
          <dt>Added</dt><dd>{timeAgo(c.addedAt)}</dd>
        </dl>
      </div>

      <div className="panel pad">
        <div className="section-label">Prospect score · {c._score.score}/100</div>
        <div className="score-parts">
          {c._score.parts.length ? c._score.parts.map((p, i) => (
            <div className="score-part" key={i}><span>{p.label}</span><span className="bar"><span style={{ width: `${Math.min(100, p.pts * 3.5)}%` }} /></span><b>+{p.pts}</b></div>
          )) : <div className="muted" style={{ fontSize: 13 }}>Base interest only — no active signals yet.</div>}
        </div>
      </div>

      <div className="panel pad" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label">Status &amp; tags</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <select value={c.status} onChange={(e) => { onUpdate({ status: e.target.value }); onActivity('note', `Status → ${e.target.value}`); }}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          {c.opportunity && <span className="muted" style={{ fontSize: 13 }}>Opportunity: <b style={{ color: 'var(--accent-2)' }}>{money(c.opportunity.value)}</b></span>}
        </div>
        <div className="tag-row">
          {TAGS.map((t) => <button key={t} className={`pill ${(c.tags || []).includes(t) ? 'active' : ''}`} onClick={() => toggleTag(t)}>{t}</button>)}
        </div>
      </div>
    </div>
  );
}

function Contacts({ c, onUpdate, flash }) {
  const [loading, setLoading] = useState(false);
  async function enrich() {
    setLoading(true);
    try {
      const d = await api.enrich(c);
      onUpdate({ contacts: d.contacts });
      flash(`Enriched — ${d.contacts.length} contacts`);
    } catch (e) { flash(e.message); }
    finally { setLoading(false); }
  }
  return (
    <div className="panel pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>Contacts &amp; enrichment</div>
        <button className="btn sm primary" onClick={enrich} disabled={loading}>{loading ? <span className="spinner" /> : '✦'} Find / enrich contacts</button>
      </div>
      <div className="contact-list">
        {(c.contacts || []).map((p) => (
          <div className="contact-row" key={p.id || p.email}>
            <div className="av sm">{(p.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="co-name" style={{ fontSize: 13.5 }}>{p.name} <span className="muted" style={{ fontWeight: 400 }}>· {p.title}</span></div>
              <div className="muted" style={{ fontSize: 12 }}>
                <a className="link" href={`mailto:${p.email}`}>{p.email}</a>
                {p.linkedin && <> · <a className="link" href={p.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a></>}
                {p.location && <> · {p.location}</>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`email-badge ${p.emailStatus}`}>{p.emailStatus}</span>
              <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{p.confidence}% conf.</div>
            </div>
          </div>
        ))}
        {(c.contacts || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>No contacts yet — run enrichment to find executives and IR contacts.</div>}
      </div>
    </div>
  );
}

function SignalsTab({ c }) {
  return (
    <div className="detail-grid">
      <div className="panel pad">
        <div className="section-label">Signals</div>
        <div className="bar-list">
          {(c.signals || []).map((s) => {
            const t = SIGNAL_TYPES[s.type];
            return (
              <div key={s.id} className="sig-mini" style={{ cursor: 'default' }}>
                <span className="sig-dot" style={{ background: t?.accent }} />
                <span style={{ minWidth: 0 }}>
                  <span className="sig-mini-head">{s.headline}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>{t?.label} · {s.source} · {timeAgo(s.date)}</span>
                </span>
              </div>
            );
          })}
          {(c.signals || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>No signals yet.</div>}
        </div>
      </div>
      <div className="panel pad">
        <div className="section-label">Recent financings</div>
        <div className="fin-list">
          {(c.financings || []).map((f, i) => (
            <div className="fin-row" key={i}><span className="fin-amt">{f.amount}</span><span>{f.type}</span><span className="muted">{f.date}</span></div>
          ))}
          {(c.financings || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>None on file.</div>}
        </div>
      </div>
    </div>
  );
}

function Crm({ c, onActivity }) {
  const [note, setNote] = useState('');
  const [type, setType] = useState('note');
  const ICONS = { email: '✉', call: '☎', meeting: '📅', note: '✎', news: '◆', task: '◻' };
  return (
    <div className="detail-grid">
      <div className="panel pad" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label">Log activity</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={type} onChange={(e) => setType(e.target.value)}><option value="note">Note</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="email">Email</option><option value="task">Task</option></select>
          <input className="grow" style={{ flex: 1, minWidth: 200 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note, call summary, task…" onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { onActivity(type, note.trim()); setNote(''); } }} />
          <button className="btn primary" onClick={() => { if (note.trim()) { onActivity(type, note.trim()); setNote(''); } }}>Log</button>
        </div>
      </div>
      <div className="panel pad" style={{ gridColumn: '1 / -1' }}>
        <div className="section-label">Activity timeline</div>
        <div className="timeline">
          {(c.activities || []).map((a) => (
            <div className="tl-item" key={a.id}>
              <span className="tl-icon">{ICONS[a.type] || '•'}</span>
              <div><div style={{ fontSize: 13.5 }}>{a.text}</div><div className="muted" style={{ fontSize: 11.5 }}>{a.type} · {timeAgo(a.date)}</div></div>
            </div>
          ))}
          {(c.activities || []).length === 0 && <div className="muted" style={{ fontSize: 13 }}>No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}

function AiTab({ c, sequences, onEnroll, flash }) {
  const [research, setResearch] = useState(null);
  const [rLoading, setRLoading] = useState(false);
  const [channel, setChannel] = useState('Email');
  const [contactIdx, setContactIdx] = useState(0);
  const [draft, setDraft] = useState(null);
  const [dLoading, setDLoading] = useState(false);

  async function runResearch() {
    setRLoading(true);
    try { const d = await api.research(c); setResearch(d.research); }
    catch (e) { flash(e.message); } finally { setRLoading(false); }
  }
  async function runOutreach() {
    setDLoading(true);
    try { const d = await api.outreach(c, (c.contacts || [])[contactIdx], channel, c.signals?.[0]); setDraft(d.draft); }
    catch (e) { flash(e.message); } finally { setDLoading(false); }
  }
  const fullEmail = draft ? `${draft.subject ? `Subject: ${draft.subject}\n\n` : ''}${draft.body}` : '';

  return (
    <div className="detail-grid">
      <div className="panel pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-label" style={{ margin: 0 }}>AI research agent</div>
          <button className="btn sm primary" onClick={runResearch} disabled={rLoading}>{rLoading ? <span className="spinner" /> : '✦'} Research</button>
        </div>
        {!research && !rLoading && <div className="muted" style={{ fontSize: 13 }}>Generate a company summary, financing read, competitive note, IR opportunities, and a recommended outreach angle.</div>}
        {research && (
          <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            <p style={{ marginTop: 0 }}>{research.summary}</p>
            <div className="section-label" style={{ marginTop: 12 }}>Financing history</div><p style={{ margin: 0, color: 'var(--text-dim)' }}>{research.financingHistory}</p>
            <div className="section-label" style={{ marginTop: 12 }}>Competitive landscape</div><p style={{ margin: 0, color: 'var(--text-dim)' }}>{research.competitiveLandscape}</p>
            <div className="section-label" style={{ marginTop: 12 }}>IR opportunities</div>
            <ul className="analysis-list">{research.irOpportunities.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <div className="section-label" style={{ marginTop: 12 }}>Recommended outreach angle</div>
            <p style={{ margin: 0, color: 'var(--accent-2)' }}>{research.outreachAngle}</p>
          </div>
        )}
      </div>

      <div className="panel pad">
        <div className="section-label">AI outreach writer</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}><option>Email</option><option>LinkedIn</option></select>
          <select value={contactIdx} onChange={(e) => setContactIdx(Number(e.target.value))} style={{ flex: 1, minWidth: 140 }}>
            {(c.contacts || []).length ? c.contacts.map((p, i) => <option key={i} value={i}>{p.name} · {p.title}</option>) : <option>No contacts — enrich first</option>}
          </select>
          <button className="btn sm primary" onClick={runOutreach} disabled={dLoading}>{dLoading ? <span className="spinner" /> : '✦'} Draft</button>
        </div>
        {draft ? (
          <>
            <textarea className="copy-out" rows={9} value={fullEmail} readOnly style={{ width: '100%' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(fullEmail); flash('Copied'); }}>Copy</button>
              <a className="btn sm" href={`mailto:${(c.contacts || [])[contactIdx]?.email || ''}?subject=${encodeURIComponent(draft.subject || '')}&body=${encodeURIComponent(draft.body)}`}>Open in mail ↗</a>
            </div>
          </>
        ) : <div className="muted" style={{ fontSize: 13 }}>Draft a personalized {channel.toLowerCase()} with an AI first line tied to {c.name}'s latest signal.</div>}

        <div className="section-label" style={{ marginTop: 16 }}>Add to sequence{(c.contacts || [])[contactIdx] ? ` · ${(c.contacts || [])[contactIdx].name}` : ''}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sequences.map((s) => <button key={s.id} className="btn sm" onClick={() => onEnroll(s, (c.contacts || [])[contactIdx])}>{s.name} →</button>)}
        </div>
      </div>
    </div>
  );
}

// ── Conferences ──────────────────────────────────────────────────────────────
function Conferences({ conferences, companies, sequences, onOpen, onCreate, onImportCsv, onBulkEnroll, flash }) {
  const [selId, setSelId] = useState(conferences[0]?.id || null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', location: '' });
  const [showImport, setShowImport] = useState(false);
  const confSeqId = sequences.find((s) => s.id === 'seq-conference')?.id || sequences[0]?.id || '';
  const [bulkSeq, setBulkSeq] = useState(confSeqId);

  const conf = conferences.find((c) => c.id === selId) || conferences[0];
  const cols = '52px 1.8fr 1fr 1.1fr 0.7fr 76px';
  const attendees = conf ? companies.filter((c) => (conf.companyIds || []).includes(c.id)) : [];

  function create() {
    if (!form.name.trim()) { flash('Name the conference first'); return; }
    const c = onCreate(form);
    setSelId(c.id); setShowNew(false); setForm({ name: '', date: '', location: '' });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Conference outreach</h1>
          <p>Upload an attendee list for an event, auto-add the companies to your database (deduped + tagged), then enroll them in a pre-event outreach sequence.</p>
        </div>
        <button className="btn primary" onClick={() => setShowNew(true)}>+ New conference</button>
      </div>

      <div className="conf-layout">
        <div className="conf-list">
          {conferences.map((cf) => (
            <button key={cf.id} className={`conf-item ${cf.id === conf?.id ? 'on' : ''}`} onClick={() => setSelId(cf.id)}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{cf.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{cf.date || 'no date'}{cf.location ? ` · ${cf.location}` : ''} · {(cf.companyIds || []).length} attendees</div>
            </button>
          ))}
          {conferences.length === 0 && <div className="muted" style={{ fontSize: 13, padding: 12 }}>No conferences yet — create one to start.</div>}
        </div>

        <div className="conf-main">
          {conf ? (
            <>
              <div className="panel pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700 }}>{conf.name}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{conf.date || 'Date TBD'}{conf.location ? ` · ${conf.location}` : ''} · {attendees.length} attendee{attendees.length === 1 ? '' : 's'}</div>
                </div>
                <button className="btn" onClick={() => setShowImport(true)}>⤓ Upload attendee CSV</button>
              </div>

              {attendees.length > 0 && sequences.length > 0 && (
                <div className="bulk-bar" style={{ marginTop: 14 }}>
                  <span className="muted" style={{ fontSize: 12.5 }}>{attendees.length} attendees in your database</span>
                  <div className="bulk-actions">
                    <span className="muted" style={{ fontSize: 12.5 }}>Outreach sequence</span>
                    <select value={bulkSeq} onChange={(e) => setBulkSeq(e.target.value)}>{sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <button className="btn sm primary" onClick={() => onBulkEnroll(sequences.find((s) => s.id === bulkSeq), attendees, { conference: conf.name })}>Enroll {attendees.length} →</button>
                  </div>
                </div>
              )}

              <div className="panel co-table" style={{ marginTop: 14 }}>
                <div className="co-row co-head" style={{ gridTemplateColumns: cols }}>
                  <span>Score</span><span>Company</span><span>Industry</span><span>Status</span><span>Contacts</span><span></span>
                </div>
                {attendees.map((c) => (
                  <div className="co-row" key={c.id} style={{ gridTemplateColumns: cols }} onClick={() => onOpen(c.id)}>
                    <span><ScoreRing score={c._score.score} size={34} /></span>
                    <span style={{ minWidth: 0 }}><span className="co-name">{c.name}</span><span className="muted co-sub">{c.ticker}:{c.exchange}</span></span>
                    <span className="muted">{c.industry}</span>
                    <span><StatusPill status={c.status} /></span>
                    <span className="muted">{(c.contacts || []).length}</span>
                    <span><button className="btn sm" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}>Open</button></span>
                  </div>
                ))}
                {attendees.length === 0 && <div className="empty" style={{ padding: 36 }}>No attendees yet — upload a CSV to populate this conference.</div>}
              </div>
            </>
          ) : <div className="empty">Create a conference to get started.</div>}
        </div>
      </div>

      {showNew && (
        <Modal title="New conference" onClose={() => setShowNew(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="fld">Conference name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Precious Metals Summit 2026" /></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="fld" style={{ flex: 1 }}>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label className="fld" style={{ flex: 1 }}>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Toronto, ON" /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn primary" onClick={create}>Create conference</button>
            </div>
          </div>
        </Modal>
      )}

      {showImport && conf && (
        <ConferenceImport conf={conf} onClose={() => setShowImport(false)} onImport={(text) => { onImportCsv(conf.id, text, conf.name); setShowImport(false); }} />
      )}
    </>
  );
}

function ConferenceImport({ conf, onClose, onImport }) {
  const [text, setText] = useState('');
  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImport(String(reader.result));
    reader.readAsText(file);
  }
  return (
    <Modal title={`Upload attendees — ${conf.name}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>CSV columns: Company, Ticker, Exchange, Industry, Headquarters, Website. Companies are deduped into your database and tagged <b>Conference Prospect</b>.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label className="btn sm">Choose file…<input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} /></label>
        <button className="btn sm ghost" onClick={() => setText(SAMPLE_CONFERENCE_CSV)}>Paste sample</button>
        <button className="btn sm primary" onClick={() => onImport(text)} disabled={!text.trim()}>Import attendees</button>
      </div>
      <textarea className="copy-out" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="…or paste CSV here" style={{ width: '100%' }} />
    </Modal>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>{title}</b><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
