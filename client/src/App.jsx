import React, { useEffect, useState, useCallback } from 'react';
import { api, parseCSV, fmtMoney, fmtDate } from './api.js';

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'companies', label: 'Companies' },
  { id: 'prospects', label: 'Prospects' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'news', label: 'News & Triggers' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'settings', label: 'Settings' },
];

// ── Small shared UI ──────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const s = Math.max(0, Math.min(100, score || 0));
  const color = s >= 80 ? '#22c55e' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#64748b';
  return (
    <div className="score-ring" style={{ '--c': color, '--p': `${s * 3.6}deg` }}>
      <span>{s}</span>
    </div>
  );
}

function StatusPill({ status, statuses }) {
  const s = statuses.find((x) => x.id === status) || { label: status, accent: '#64748b' };
  return <span className="status-pill" style={{ '--c': s.accent }}>{s.label}</span>;
}

function Tag({ children }) { return <span className="m-tag">{children}</span>; }

function EmailBadge({ status }) {
  const map = { verified: ['Verified', 'sent-positive'], risky: ['Risky', 'sent-neutral'], invalid: ['Invalid', 'sent-negative'], unverified: ['Unverified', 'sent-neutral'] };
  const [label, cls] = map[status] || map.unverified;
  return <span className={`tag-sent ${cls}`}>{label}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>{title}</b><button className="btn ghost sm" onClick={onClose}>Close ✕</button></div>
        {children}
      </div>
    </div>
  );
}

function Empty({ children }) { return <div className="empty muted">{children}</div>; }

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.post('/score-all').catch(() => {});
    api.get('/dashboard').then(setD).catch((e) => setErr(e.message));
  }, []);
  if (err) return <Empty>Couldn’t load dashboard: {err}</Empty>;
  if (!d) return <Empty>Loading dashboard…</Empty>;
  const s = d.stats, ep = d.emailPerformance;
  const kpis = [
    ['New financing opps', s.newFinancingOpps, 'this week'],
    ['On watchlist', s.watchlist, 'companies'],
    ['In sequence', s.prospectsInSequence, 'prospects'],
    ['Meetings booked', s.meetingsBooked, ''],
    ['Opportunities', s.opportunitiesCreated, 'score ≥ 70'],
    ['Active clients', s.activeClients, ''],
  ];
  return (
    <div>
      <div className="page-head"><div><h1>Executive Dashboard</h1><p>Your prospecting pipeline at a glance — financing signals, sequences, and the highest-scoring opportunities this week.</p></div></div>
      <div className="stat-row">
        {kpis.map(([l, n, sub]) => (
          <div key={l} className="panel kpi"><div className="n">{n}</div><div className="l">{l}{sub ? ` · ${sub}` : ''}</div></div>
        ))}
      </div>
      <div className="cols">
        <div className="panel pad">
          <div className="section-label">New financing opportunities</div>
          {d.newFinancing.length === 0 ? <Empty>No new financings in the last 7 days.</Empty> : (
            <div className="list-rows">
              {d.newFinancing.map((t) => (
                <div key={t.id} className="list-row" onClick={() => go('company', t.company?.id)}>
                  <div><b>{t.company?.name}</b> <span className="muted">{t.company?.ticker} · {t.company?.exchange}</span><div className="muted sm">{t.headline}</div></div>
                  <div className="stat">{t.amount ? fmtMoney(t.amount) : ''}</div>
                </div>
              ))}
            </div>
          )}
          <div className="section-label" style={{ marginTop: 18 }}>Email performance</div>
          <div className="bar-list">
            {[['Sent', ep.sent, 100, '#3b82f6'], ['Open rate', ep.openRate, ep.openRate, '#06b6d4'], ['Reply rate', ep.replyRate, ep.replyRate, '#22c55e']].map(([l, v, pct, c]) => (
              <div key={l} className="bar-item"><span className="muted">{l}</span><div className="bar"><span style={{ width: `${Math.min(100, pct)}%`, background: c }} /></div><b>{l.includes('rate') ? `${v}%` : v}</b></div>
            ))}
          </div>
        </div>
        <div className="panel pad">
          <div className="section-label">Top opportunities</div>
          <div className="list-rows">
            {d.topOpportunities.map((c) => (
              <div key={c.id} className="list-row" onClick={() => go('company', c.id)}>
                <div><b>{c.name}</b><div className="muted sm">{c.ticker} · {c.exchange}</div></div>
                <ScoreRing score={c.score} />
              </div>
            ))}
          </div>
          <div className="section-label" style={{ marginTop: 18 }}>Recent activity</div>
          <div className="timeline">
            {d.recentActivity.map((a) => (
              <div key={a.id} className="tl-item"><span className={`tl-dot tl-${a.type}`} /><div><div className="sm"><b>{a.company?.name}</b> · {a.subject}</div><div className="muted sm">{fmtDate(a.date)}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Companies ────────────────────────────────────────────────────────────────
function Companies({ meta, go }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [exchange, setExchange] = useState('');
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q); if (status) p.set('status', status); if (exchange) p.set('exchange', exchange);
    api.get(`/companies?${p}`).then((d) => setRows(d.companies));
  }, [q, status, exchange]);
  useEffect(() => { load(); }, [load]);

  async function onImport(file) {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (!parsed.length) { setMsg('No rows found in CSV.'); return; }
    const { created, updated, skipped } = await api.post('/companies/import', { rows: parsed });
    setMsg(`Imported: ${created} created, ${updated} updated, ${skipped} skipped.`);
    setImporting(false);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Company Database</h1><p>{rows.length} companies. Search, filter, bulk-import a CSV, and open any record to enrich contacts, track news, and run outreach.</p></div>
        <div className="row-gap">
          <button className="btn" onClick={() => setImporting(true)}>⬆ Import CSV</button>
          <button className="btn primary" onClick={() => setAdding(true)}>+ Add company</button>
        </div>
      </div>
      <div className="toolbar">
        <input className="grow" placeholder="Search name, ticker, industry…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{meta.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <select value={exchange} onChange={(e) => setExchange(e.target.value)}><option value="">All exchanges</option>{meta.exchanges.map((x) => <option key={x} value={x}>{x}</option>)}</select>
      </div>
      {msg && <div className="banner">{msg}</div>}
      <div className="panel">
        <table className="m-table">
          <thead><tr><th>Company</th><th>Exchange</th><th>Industry</th><th>Mkt cap</th><th>Status</th><th>Score</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} onClick={() => go('company', c.id)}>
                <td><b>{c.name}</b> <span className="muted">{c.ticker}</span><div className="row-tags">{c.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</div></td>
                <td>{c.exchange || '—'}</td>
                <td className="muted">{c.industry || '—'}</td>
                <td>{fmtMoney(c.marketCap)}</td>
                <td><StatusPill status={c.status} statuses={meta.statuses} /></td>
                <td>{c.score != null ? <ScoreRing score={c.score} /> : <span className="muted">—</span>}</td>
                <td className="muted">›</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7}><Empty>No companies match.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {importing && <ImportModal onClose={() => setImporting(false)} onImport={onImport} />}
      {adding && <AddCompanyModal meta={meta} onClose={() => setAdding(false)} onSaved={(c) => { setAdding(false); go('company', c.id); }} />}
    </div>
  );
}

function ImportModal({ onClose, onImport }) {
  const sample = 'name,ticker,exchange,industry,headquarters,website\nExample Mining Corp,EMC,TSXV,Mining & Metals,Vancouver BC,https://example.com';
  return (
    <Modal title="Bulk import companies" onClose={onClose}>
      <p className="muted">Upload a CSV. Records are de-duplicated by ticker + exchange (or by name); existing companies are updated in place.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && onImport(e.target.files[0])} />
      <div className="section-label" style={{ marginTop: 16 }}>Expected columns</div>
      <pre className="code-block">{sample}</pre>
    </Modal>
  );
}

function AddCompanyModal({ meta, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', ticker: '', exchange: 'TSXV', industry: '', headquarters: '', website: '', marketCap: '', sharePrice: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    const body = { ...f, marketCap: Number(f.marketCap) || null, sharePrice: Number(f.sharePrice) || null };
    const { company } = await api.post('/companies', body);
    onSaved(company);
  }
  return (
    <Modal title="Add company" onClose={onClose}>
      <div className="form-grid">
        <label className="fld">Name<input value={f.name} onChange={set('name')} /></label>
        <label className="fld">Ticker<input value={f.ticker} onChange={set('ticker')} /></label>
        <label className="fld">Exchange<select value={f.exchange} onChange={set('exchange')}>{meta.exchanges.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fld">Industry<input value={f.industry} onChange={set('industry')} /></label>
        <label className="fld">Headquarters<input value={f.headquarters} onChange={set('headquarters')} /></label>
        <label className="fld">Website<input value={f.website} onChange={set('website')} /></label>
        <label className="fld">Market cap<input value={f.marketCap} onChange={set('marketCap')} placeholder="84000000" /></label>
        <label className="fld">Share price<input value={f.sharePrice} onChange={set('sharePrice')} placeholder="0.62" /></label>
      </div>
      <div className="row-gap" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!f.name} onClick={save}>Save company</button>
      </div>
    </Modal>
  );
}

// ── Company detail drawer ────────────────────────────────────────────────────
function CompanyDrawer({ id, meta, onClose, refresh }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => api.get(`/companies/${id}`).then(setData), [id]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Modal title="Loading…" onClose={onClose} wide><Empty>Loading company…</Empty></Modal>;
  const c = data.company;

  async function setStatus(status) { await api.patch(`/companies/${id}`, { status }); await load(); refresh?.(); }
  async function score() { setBusy('score'); await api.post(`/companies/${id}/score`); await load(); refresh?.(); setBusy(''); }
  async function enrich() { setBusy('enrich'); try { await api.post(`/companies/${id}/enrich`); await load(); } finally { setBusy(''); } }
  async function scanNews() { setBusy('news'); try { await api.post(`/companies/${id}/scan-news`); await load(); } catch (e) { alert(e.message); } finally { setBusy(''); } }

  const tabs = [['overview', 'Overview'], ['contacts', `Contacts (${data.contacts.length})`], ['news', `News (${data.triggers.length})`], ['crm', 'CRM'], ['research', 'AI Research'], ['outreach', 'Outreach']];

  return (
    <Modal title={`${c.name} · ${c.ticker || ''}`} onClose={onClose} wide>
      <div className="drawer-head">
        <div className="row-gap">
          <ScoreRing score={c.score ?? 0} />
          <div>
            <div className="muted sm">{c.exchange} · {c.industry} · {fmtMoney(c.marketCap)} · {c.sharePrice ? `$${c.sharePrice}` : ''}</div>
            <div className="row-tags">{c.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          </div>
        </div>
        <div className="row-gap">
          <select value={c.status} onChange={(e) => setStatus(e.target.value)}>{meta.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <button className="btn sm" disabled={busy === 'score'} onClick={score}>↻ Re-score</button>
        </div>
      </div>
      <div className="d-tabs">{tabs.map(([t, l]) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{l}</button>)}</div>

      {tab === 'overview' && <OverviewTab c={c} data={data} />}
      {tab === 'contacts' && <ContactsTab data={data} busy={busy} enrich={enrich} reload={load} />}
      {tab === 'news' && <NewsTab data={data} busy={busy} scanNews={scanNews} meta={meta} />}
      {tab === 'crm' && <CrmTab id={id} data={data} reload={load} />}
      {tab === 'research' && <ResearchTab id={id} hasClaude={meta.hasClaude} />}
      {tab === 'outreach' && <OutreachTab id={id} data={data} hasClaude={meta.hasClaude} />}
    </Modal>
  );
}

function OverviewTab({ c, data }) {
  return (
    <div className="cols">
      <div>
        <p className="lede">{c.description || 'No description yet.'}</p>
        <div className="kv">
          <div><span>Headquarters</span><b>{c.headquarters || '—'}</b></div>
          <div><span>Website</span><b>{c.website ? <a className="link" href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a> : '—'}</b></div>
          <div><span>IR contact</span><b>{c.irContact || '—'}</b></div>
          <div><span>Share price</span><b>{c.sharePrice ? `$${c.sharePrice}` : '—'}</b></div>
        </div>
        {c.scoreBreakdown && (
          <>
            <div className="section-label" style={{ marginTop: 16 }}>Prospect score breakdown</div>
            <div className="bar-list">
              {[['Financing signals', c.scoreBreakdown.financing, '#22c55e'], ['IR signals', c.scoreBreakdown.ir, '#8b5cf6'], ['Growth signals', c.scoreBreakdown.growth, '#f59e0b']].map(([l, v, col]) => (
                <div key={l} className="bar-item"><span className="muted">{l}</span><div className="bar"><span style={{ width: `${Math.min(100, v * 2.5)}%`, background: col }} /></div><b>{v}</b></div>
              ))}
            </div>
          </>
        )}
      </div>
      <div>
        <div className="section-label">Recent financings</div>
        {(c.recentFinancings || []).length === 0 ? <Empty>None tracked.</Empty> : c.recentFinancings.map((f, i) => (
          <div key={i} className="list-row static"><div>{f.type}<div className="muted sm">{fmtDate(f.date)}</div></div><b className="stat">{fmtMoney(f.amount)}</b></div>
        ))}
        <div className="section-label" style={{ marginTop: 16 }}>Latest news</div>
        {data.triggers.slice(0, 3).map((t) => <div key={t.id} className="list-row static"><div className="sm">{t.headline}<div className="muted sm">{fmtDate(t.date)}</div></div></div>)}
      </div>
    </div>
  );
}

function ContactsTab({ data, busy, enrich, reload }) {
  async function verify(ctId) { await api.post(`/contacts/${ctId}/verify`); reload(); }
  return (
    <div>
      <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="muted sm">Decision-makers & IR contacts. Enrichment infers likely executives; verify emails before sending.</span>
        <button className="btn primary sm" disabled={busy === 'enrich'} onClick={enrich}>{busy === 'enrich' ? 'Enriching…' : '✨ Enrich contacts'}</button>
      </div>
      <table className="m-table">
        <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Confidence</th><th></th></tr></thead>
        <tbody>
          {data.contacts.map((ct) => (
            <tr key={ct.id}>
              <td><b>{ct.name}</b><div className="muted sm">{ct.title}{ct.linkedin ? <> · <a className="link" href={ct.linkedin} target="_blank" rel="noreferrer">in</a></> : ''}</div></td>
              <td className="muted">{ct.role}</td>
              <td>{ct.email}<div><EmailBadge status={ct.emailStatus} /></div></td>
              <td>{ct.confidence != null ? `${ct.confidence}%` : '—'}</td>
              <td><button className="btn ghost sm" onClick={() => verify(ct.id)}>Verify</button></td>
            </tr>
          ))}
          {data.contacts.length === 0 && <tr><td colSpan={5}><Empty>No contacts yet — try Enrich.</Empty></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function NewsTab({ data, busy, scanNews, meta }) {
  return (
    <div>
      <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="muted sm">Tracked corporate developments. Triggers flag prospect opportunities automatically.</span>
        <button className="btn primary sm" disabled={busy === 'news'} onClick={scanNews}>{busy === 'news' ? 'Scanning…' : '🔍 Scan for news'}</button>
      </div>
      <div className="list-rows">
        {data.triggers.map((t) => {
          const tt = meta.triggerTypes.find((x) => x.id === t.type);
          return (
            <div key={t.id} className="list-row static">
              <div><span className="trigger-tag" style={{ '--c': tt?.accent }}>{tt?.label || t.type}</span> <b>{t.headline}</b>
                <div className="muted sm">{t.detail} {t.source ? `· ${t.source}` : ''} · {fmtDate(t.date)}</div></div>
              {t.amount ? <b className="stat">{fmtMoney(t.amount)}</b> : null}
            </div>
          );
        })}
        {data.triggers.length === 0 && <Empty>No tracked news yet.</Empty>}
      </div>
    </div>
  );
}

function CrmTab({ id, data, reload }) {
  const [type, setType] = useState('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  async function log() {
    if (!subject) return;
    await api.post(`/companies/${id}/activities`, { type, subject, body });
    setSubject(''); setBody(''); reload();
  }
  const timeline = [
    ...data.activities.map((a) => ({ kind: a.type, title: a.subject, body: a.body, date: a.date })),
    ...data.triggers.map((t) => ({ kind: 'news', title: t.headline, body: t.detail, date: t.date })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return (
    <div className="cols">
      <div>
        <div className="section-label">Log activity</div>
        <div className="row-gap" style={{ marginBottom: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)}>{['note', 'call', 'email', 'meeting', 'task'].map((t) => <option key={t}>{t}</option>)}</select>
          <input className="grow" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <textarea rows={3} placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: '100%' }} />
        <button className="btn primary sm" style={{ marginTop: 8 }} onClick={log}>+ Log</button>
        <div className="section-label" style={{ marginTop: 16 }}>Open tasks</div>
        {data.tasks.filter((t) => !t.done).map((t) => (
          <label key={t.id} className="task-row"><input type="checkbox" onChange={async () => { await api.patch(`/tasks/${t.id}`, { done: true }); reload(); }} /> {t.title}</label>
        ))}
        {data.tasks.filter((t) => !t.done).length === 0 && <Empty>No open tasks.</Empty>}
      </div>
      <div>
        <div className="section-label">Activity timeline</div>
        <div className="timeline">
          {timeline.map((it, i) => (
            <div key={i} className="tl-item"><span className={`tl-dot tl-${it.kind}`} /><div><div className="sm"><b>{it.title}</b></div>{it.body && <div className="muted sm">{it.body}</div>}<div className="muted sm">{it.kind} · {fmtDate(it.date)}</div></div></div>
          ))}
          {timeline.length === 0 && <Empty>No history yet.</Empty>}
        </div>
      </div>
    </div>
  );
}

function ResearchTab({ id, hasClaude }) {
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function run() {
    setBusy(true); setErr('');
    try { const { research } = await api.post(`/ai/research/${id}`); setR(research); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  if (!hasClaude) return <Empty>AI research needs an ANTHROPIC_API_KEY set on the server.</Empty>;
  return (
    <div>
      <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="muted sm">AI Research Agent — company summary, financing read, landscape, IR opportunities, and a recommended outreach angle.</span>
        <button className="btn primary sm" disabled={busy} onClick={run}>{busy ? 'Researching…' : '🧠 Run research'}</button>
      </div>
      {err && <div className="banner">{err}</div>}
      {!r && !busy && <Empty>Run the agent to generate a research brief.</Empty>}
      {r && (
        <div className="research">
          <div><div className="section-label">Summary</div><p>{r.summary}</p></div>
          <div><div className="section-label">Financing history</div><p>{r.financingHistory}</p></div>
          <div><div className="section-label">Competitive landscape</div><p>{r.competitiveLandscape}</p></div>
          <div><div className="section-label">IR opportunities</div><ul className="analysis-list">{r.irOpportunities.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><div className="section-label">Recommended outreach angle</div><p className="lede">{r.outreachAngle}</p></div>
        </div>
      )}
    </div>
  );
}

function OutreachTab({ id, data, hasClaude }) {
  const [kind, setKind] = useState('cold-email');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [contactId, setContactId] = useState(data.contacts[0]?.id || '');
  async function write() {
    setBusy(true);
    try { const r = await api.post('/ai/write-email', { companyId: id, contactId, kind }); setText(r.text); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  }
  async function personalize() {
    setBusy(true);
    try { const r = await api.post('/ai/personalize', { companyId: id, contactId }); setText(r.firstLine); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  }
  return (
    <div>
      <div className="row-gap" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={contactId} onChange={(e) => setContactId(e.target.value)}>{data.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}{data.contacts.length === 0 && <option value="">No contacts</option>}</select>
        <div className="format-tabs">{[['cold-email', 'Cold email'], ['linkedin', 'LinkedIn'], ['follow-up', 'Follow-up']].map(([k, l]) => <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{l}</button>)}</div>
        <div className="spacer" />
        <button className="btn sm" disabled={busy || !hasClaude} onClick={personalize}>✨ First line</button>
        <button className="btn primary sm" disabled={busy || !hasClaude} onClick={write}>{busy ? 'Writing…' : 'Write with AI'}</button>
      </div>
      {!hasClaude && <div className="banner">Set ANTHROPIC_API_KEY on the server to enable the AI outreach writer.</div>}
      <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="AI-generated outreach will appear here — editable before you send." style={{ width: '100%' }} />
      <div className="row-gap" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn" disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>Copy</button>
        <button className="btn primary" disabled={!text} onClick={async () => { await api.post('/gmail/send', { companyId: id, contactId, subject: text.split('\n')[0].replace(/^Subject:\s*/i, ''), body: text }); alert('Sent (simulated) and logged to CRM. Connect Gmail in Settings to send for real.'); }}>Send via Gmail</button>
      </div>
    </div>
  );
}

// ── Prospects board (Kanban) ─────────────────────────────────────────────────
function Prospects({ meta, go }) {
  const [cols, setCols] = useState([]);
  const load = useCallback(() => api.get('/board').then((d) => setCols(d.columns)), []);
  useEffect(() => { load(); }, [load]);
  async function move(companyId, status) { await api.patch(`/companies/${companyId}`, { status }); load(); }
  return (
    <div>
      <div className="page-head"><div><h1>Prospecting Workflow</h1><p>Move a company by picking a new stage on its card. Stages mirror your sales pipeline.</p></div></div>
      <div className="board">
        {cols.map((col) => (
          <div key={col.id} className="board-col">
            <div className="board-col-head" style={{ '--c': col.accent }}><span className="dot" />{col.label}<span className="count">{col.companies.length}</span></div>
            <div className="board-cards">
              {col.companies.map((c) => (
                <div key={c.id} className="board-card">
                  <div onClick={() => go('company', c.id)} style={{ cursor: 'pointer' }}>
                    <div className="row-gap" style={{ justifyContent: 'space-between' }}><b>{c.name}</b>{c.score != null && <span className="mini-score" style={{ '--c': c.score >= 70 ? '#22c55e' : '#3b82f6' }}>{c.score}</span>}</div>
                    <div className="muted sm">{c.ticker} · {c.exchange}</div>
                    <div className="row-tags">{c.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}</div>
                  </div>
                  <select className="card-move" value={c.status} onChange={(e) => move(c.id, e.target.value)}>{meta.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                </div>
              ))}
              {col.companies.length === 0 && <div className="board-empty">—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Opportunities ────────────────────────────────────────────────────────────
function Opportunities({ meta, go }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.post('/score-all').then(() => api.get('/opportunities')).then((d) => setRows(d.opportunities)); }, []);
  return (
    <div>
      <div className="page-head"><div><h1>Smart Opportunity Engine</h1><p>Companies ranked by Prospect Score (1–100) from financing, investor-relations, and growth signals.</p></div></div>
      <div className="grid">
        {rows.map((c) => (
          <div key={c.id} className="panel pad opp-card" onClick={() => go('company', c.id)}>
            <div className="row-gap" style={{ justifyContent: 'space-between' }}>
              <div><b>{c.name}</b><div className="muted sm">{c.ticker} · {c.exchange} · {c.industry}</div></div>
              <ScoreRing score={c.score} />
            </div>
            <div className="bar-list" style={{ marginTop: 12 }}>
              {[['Financing', c.scoreBreakdown?.financing, '#22c55e'], ['IR', c.scoreBreakdown?.ir, '#8b5cf6'], ['Growth', c.scoreBreakdown?.growth, '#f59e0b']].map(([l, v, col]) => (
                <div key={l} className="bar-item sm-bar"><span className="muted">{l}</span><div className="bar"><span style={{ width: `${Math.min(100, (v || 0) * 2.5)}%`, background: col }} /></div><b>{v || 0}</b></div>
              ))}
            </div>
            <div className="row-gap" style={{ marginTop: 10 }}><StatusPill status={c.status} statuses={meta.statuses} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── News & Triggers feed ─────────────────────────────────────────────────────
function NewsFeed({ meta, go }) {
  const [rows, setRows] = useState([]);
  const [type, setType] = useState('');
  const load = useCallback(() => { const p = new URLSearchParams(); if (type) p.set('type', type); api.get(`/triggers?${p}`).then((d) => setRows(d.triggers)); }, [type]);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div className="page-head"><div><h1>News & Trigger Monitoring</h1><p>Financings, management changes, M&A, listings and more — each flagged against a company in your database.</p></div></div>
      <div className="pillars">
        <button className={`pill ${!type ? 'active' : ''}`} onClick={() => setType('')}>All</button>
        {meta.triggerTypes.map((t) => <button key={t.id} className={`pill ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}><span className="swatch" style={{ background: t.accent }} />{t.label}</button>)}
      </div>
      <div className="list-rows">
        {rows.map((t) => {
          const tt = meta.triggerTypes.find((x) => x.id === t.type);
          return (
            <div key={t.id} className="panel pad list-row" onClick={() => go('company', t.company?.id)}>
              <div><span className="trigger-tag" style={{ '--c': tt?.accent }}>{tt?.label}</span> <b>{t.headline}</b>
                <div className="muted sm">{t.company?.name} · {t.company?.ticker} · {t.source || ''} · {fmtDate(t.date)}</div></div>
              {t.amount ? <b className="stat">{fmtMoney(t.amount)}</b> : null}
            </div>
          );
        })}
        {rows.length === 0 && <Empty>No triggers for this filter.</Empty>}
      </div>
    </div>
  );
}

// ── Sequences ────────────────────────────────────────────────────────────────
function Sequences({ go }) {
  const [seqs, setSeqs] = useState([]);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => api.get('/sequences').then((d) => setSeqs(d.sequences)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div className="page-head"><div><h1>Email Sequencing</h1><p>Multi-step campaigns with personalization variables like {'{{firstName}}'}, {'{{financingAmount}}'} and {'{{latestHeadline}}'}.</p></div>
        <button className="btn primary" onClick={async () => { const { sequence } = await api.post('/sequences', { name: 'New sequence', steps: [{ day: 1, subject: 'Intro', body: 'Hi {{firstName}},' }] }); load(); setOpen(sequence.id); }}>+ New sequence</button>
      </div>
      <div className="grid">
        {seqs.map((s) => (
          <div key={s.id} className="panel pad seq-card" onClick={() => setOpen(s.id)}>
            <div className="row-gap" style={{ justifyContent: 'space-between' }}><b>{s.name}</b><span className="status-pill" style={{ '--c': s.status === 'active' ? '#22c55e' : '#64748b' }}>{s.status}</span></div>
            <p className="muted sm">{s.description || 'No description.'}</p>
            <div className="muted sm">{s.steps.length} steps · {s.enrolled} enrolled</div>
            <div className="seq-steps">{s.steps.map((st) => <span key={st.id} className="seq-day">Day {st.day}</span>)}</div>
          </div>
        ))}
      </div>
      {open && <SequenceModal id={open} onClose={() => { setOpen(null); load(); }} go={go} />}
    </div>
  );
}

function SequenceModal({ id, onClose, go }) {
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const load = useCallback(() => api.get(`/sequences/${id}`).then(setData), [id]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Modal title="Loading…" onClose={onClose}><Empty>Loading…</Empty></Modal>;
  const s = data.sequence;
  function updateStep(i, k, v) { const steps = s.steps.map((st, idx) => idx === i ? { ...st, [k]: v } : st); setData({ ...data, sequence: { ...s, steps } }); }
  async function save() { await api.patch(`/sequences/${id}`, { name: s.name, description: s.description, status: s.status, steps: s.steps }); load(); }
  function addStep() { const steps = [...s.steps, { day: (s.steps.at(-1)?.day || 0) + 4, channel: 'email', subject: '', body: '' }]; setData({ ...data, sequence: { ...s, steps } }); }
  async function doPreview() { const p = await api.post(`/sequences/${id}/preview`, {}); setPreview(p); }

  return (
    <Modal title={s.name} onClose={onClose} wide>
      <div className="row-gap" style={{ marginBottom: 12 }}>
        <input className="grow" value={s.name} onChange={(e) => setData({ ...data, sequence: { ...s, name: e.target.value } })} />
        <select value={s.status} onChange={(e) => setData({ ...data, sequence: { ...s, status: e.target.value } })}><option value="draft">draft</option><option value="active">active</option></select>
        <button className="btn sm" onClick={doPreview}>👁 Preview</button>
        <button className="btn primary sm" onClick={save}>Save</button>
      </div>
      <div className="seq-builder">
        {s.steps.map((st, i) => (
          <div key={st.id || i} className="seq-step">
            <div className="row-gap"><label className="fld">Day<input style={{ width: 64 }} value={st.day} onChange={(e) => updateStep(i, 'day', Number(e.target.value) || 1)} /></label>
              <label className="fld grow">Subject<input value={st.subject} onChange={(e) => updateStep(i, 'subject', e.target.value)} /></label></div>
            <textarea rows={3} value={st.body} onChange={(e) => updateStep(i, 'body', e.target.value)} />
            {preview && <div className="preview-box"><b>{preview.steps[i]?.subject}</b><div className="copy-out">{preview.steps[i]?.body}</div></div>}
          </div>
        ))}
      </div>
      <button className="btn sm" onClick={addStep} style={{ marginTop: 8 }}>+ Add step</button>
      <div className="section-label" style={{ marginTop: 18 }}>Enrolled ({data.enrollments.length})</div>
      {data.enrollments.map((e) => (
        <div key={e.id} className="list-row static"><div onClick={() => { onClose(); go('company', e.company?.id); }} style={{ cursor: 'pointer' }}><b>{e.company?.name}</b> <span className="muted sm">{e.contact?.name || ''}</span></div>
          <span className="status-pill" style={{ '--c': e.status === 'replied' ? '#22c55e' : e.status === 'paused' ? '#f59e0b' : '#8b5cf6' }}>{e.status} · step {e.currentStep + 1}</span></div>
      ))}
      {data.enrollments.length === 0 && <Empty>No one enrolled yet. Enroll from a company’s Outreach tab.</Empty>}
    </Modal>
  );
}

// ── Settings (Gmail + integrations) ──────────────────────────────────────────
function Settings() {
  const [g, setG] = useState(null);
  useEffect(() => { api.get('/gmail/status').then(setG); }, []);
  return (
    <div>
      <div className="page-head"><div><h1>Settings & Integrations</h1><p>Connect the channels and data feeds that power the platform.</p></div></div>
      <div className="grid">
        <div className="panel pad">
          <div className="section-label">Gmail</div>
          <p className="muted">{g?.note || 'Loading…'}</p>
          <div className="row-tags">{(g?.capabilities || []).map((c) => <Tag key={c}>{c}</Tag>)}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => alert('OAuth flow not wired in this MVP. The Gmail API integration sends from your inbox, syncs replies, and pauses sequences on reply.')}>Connect Gmail</button>
        </div>
        {[['SEC EDGAR', 'US filings feed for triggers (financings, 8-Ks, management changes).'],
          ['SEDAR+', 'Canadian filings feed for TSX/TSXV/CSE issuers.'],
          ['News APIs', 'Real-time news monitoring (already wired in the Content portal).'],
          ['LinkedIn enrichment', 'Resolve executive profiles & verify titles.']].map(([t, d]) => (
          <div key={t} className="panel pad"><div className="section-label">{t}</div><p className="muted">{d}</p><span className="status-pill" style={{ '--c': '#64748b' }}>Not connected</span></div>
        ))}
      </div>
    </div>
  );
}

// ── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('dashboard');
  const [meta, setMeta] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { api.get('/meta').then(setMeta); }, []);
  const go = (v, id) => { if (v === 'company') { setCompanyId(id); return; } setView(v); };
  const refresh = () => setRefreshKey((k) => k + 1);

  if (!meta) return <div className="app"><div className="main"><Empty>Starting the platform…</Empty></div></div>;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><img src="/wordmark.svg" alt="Market One" onError={(e) => { e.target.style.display = 'none'; }} /><span className="tag">Prospecting Platform</span></div>
        <nav className="nav">{VIEWS.map((v) => <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.label}</button>)}</nav>
        <div className="spacer" />
        <span className="src-chip"><span className={`dot ${meta.hasClaude ? '' : 'warn'}`} />{meta.hasClaude ? 'AI ready' : 'No AI key'}</span>
      </div>
      <div className="main" key={`${view}-${refreshKey}`}>
        {view === 'dashboard' && <Dashboard go={go} />}
        {view === 'companies' && <Companies meta={meta} go={go} />}
        {view === 'prospects' && <Prospects meta={meta} go={go} />}
        {view === 'opportunities' && <Opportunities meta={meta} go={go} />}
        {view === 'news' && <NewsFeed meta={meta} go={go} />}
        {view === 'sequences' && <Sequences go={go} />}
        {view === 'settings' && <Settings />}
      </div>
      {companyId && <CompanyDrawer id={companyId} meta={meta} onClose={() => { setCompanyId(null); refresh(); }} refresh={refresh} />}
    </div>
  );
}
