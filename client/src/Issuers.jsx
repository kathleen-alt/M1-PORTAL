// Issuer intelligence — the prospecting surface.
//
// Tracks every listed company the pipeline has ingested across NASDAQ, OTC,
// TSXV and CSE, filters them against Market One's qualification model, and
// explains each score signal by signal so a rep can open a name and see the
// argument for the call rather than a bare number.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const EXCHANGES = ['NASDAQ', 'NYSE American', 'OTC', 'TSXV', 'CSE', 'TSX', 'NYSE'];
const TIERS = ['A - priority', 'B - qualified', 'C - watch', 'D - pass', 'U - unverified'];

const SORTS = [
  { id: 'score', label: 'Fit score' },
  { id: 'volume', label: 'Most illiquid' },
  { id: 'drawdown', label: 'Deepest drawdown' },
  { id: 'watchers', label: 'Most watched' },
  { id: 'marketCap', label: 'Market cap' },
  { id: 'symbol', label: 'Symbol A-Z' },
];

const VOLUME_CAPS = [
  { id: '', label: 'Any volume' },
  { id: '250000', label: 'Under $250K/day' },
  { id: '1000000', label: 'Under $1M/day' },
  { id: '5000000', label: 'Under $5M/day' },
];

const CAP_RANGES = [
  { id: '', label: 'Any size', min: '', max: '' },
  { id: 'nano', label: 'Under $50M', min: '', max: '50000000' },
  { id: 'micro', label: '$50M - $300M', min: '50000000', max: '300000000' },
  { id: 'small', label: '$300M - $2B', min: '300000000', max: '2000000000' },
];

const DRAWDOWNS = [
  { id: '', label: 'Any drawdown' },
  { id: '0.4', label: '40%+ off high' },
  { id: '0.6', label: '60%+ off high' },
  { id: '0.8', label: '80%+ off high' },
];

// ── formatting ────────────────────────────────────────────
const usd = (n) =>
  n == null ? '—'
  : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
  : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K`
  : `$${Number(n).toFixed(2)}`;
const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(0)}%`);
const int = (n) => (n == null ? '—' : Number(n).toLocaleString());

function tierClass(tier) {
  if (!tier) return '';
  return `tier-${tier[0].toLowerCase()}`;
}

/** The score pill — colour carries the tier, the number carries the score. */
function ScorePill({ score, tier, provisional }) {
  if (score == null) return <span className="iss-score muted">—</span>;
  return (
    <span className={`iss-score ${tierClass(tier)}`} title={tier}>
      {score}
      {provisional && <sup title="Scored on incomplete data — enrich before calling">*</sup>}
    </span>
  );
}

export default function Issuers({ onToast }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [universeTotal, setUniverseTotal] = useState(0);
  const [facets, setFacets] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState('');

  // Filter state
  const [q, setQ] = useState('');
  const [exchange, setExchange] = useState([]);
  const [sector, setSector] = useState([]);
  const [tier, setTier] = useState([]);
  const [sort, setSort] = useState('score');
  const [maxVolume, setMaxVolume] = useState('');
  const [capRange, setCapRange] = useState('');
  const [minDrawdown, setMinDrawdown] = useState('');
  const [minScore, setMinScore] = useState('');
  const [minWatchers, setMinWatchers] = useState('');
  const [noAgency, setNoAgency] = useState(false);
  const [hasContact, setHasContact] = useState(false);
  const [verified, setVerified] = useState(false);

  const pageSize = 50;
  const debounce = useRef(null);

  const params = useMemo(() => {
    const cap = CAP_RANGES.find((c) => c.id === capRange);
    const p = { page: String(page), pageSize: String(pageSize), sort };
    if (q.trim()) p.q = q.trim();
    if (exchange.length) p.exchange = exchange.join(',');
    if (sector.length) p.sector = sector.join(',');
    if (tier.length) p.tier = tier.join(',');
    if (maxVolume) p.maxVolume = maxVolume;
    if (cap?.min) p.minCap = cap.min;
    if (cap?.max) p.maxCap = cap.max;
    if (minDrawdown) p.minDrawdown = minDrawdown;
    if (minScore) p.minScore = minScore;
    if (minWatchers) p.minWatchers = minWatchers;
    if (noAgency) p.noAgency = '1';
    if (hasContact) p.hasContact = '1';
    if (verified) p.verified = '1';
    return p;
  }, [q, exchange, sector, tier, sort, maxVolume, capRange, minDrawdown, minScore, minWatchers, noAgency, hasContact, verified, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/issuers?${new URLSearchParams(params)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setRows(data.issuers);
      setTotal(data.total);
      setUniverseTotal(data.universeTotal);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [params]);

  // Typing in search should not fire a request per keystroke.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 220);
    return () => clearTimeout(debounce.current);
  }, [load]);

  useEffect(() => { setPage(1); }, [q, exchange, sector, tier, maxVolume, capRange, minDrawdown, minScore, minWatchers, noAgency, hasContact, verified]);

  const loadFacets = useCallback(async () => {
    try {
      const [f, m] = await Promise.all([
        fetch('/api/issuers/facets').then((r) => r.json()),
        fetch('/api/issuers/model').then((r) => r.json()),
      ]);
      setFacets(f);
      setModel(m);
    } catch { /* the rail degrades to static options */ }
  }, []);
  useEffect(() => { loadFacets(); }, [loadFacets]);

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const reset = () => {
    setQ(''); setExchange([]); setSector([]); setTier([]); setMaxVolume(''); setCapRange('');
    setMinDrawdown(''); setMinScore(''); setMinWatchers(''); setNoAgency(false); setHasContact(false); setVerified(false);
  };

  const refresh = async (stage) => {
    setRefreshing(stage);
    try {
      const res = await fetch('/api/issuers/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');
      onToast?.(`${stage} complete`);
      await Promise.all([load(), loadFacets()]);
    } catch (err) {
      onToast?.(`Refresh failed — ${err.message}`);
    } finally {
      setRefreshing('');
    }
  };

  const exportUrl = `/api/issuers/export.csv?${new URLSearchParams({ ...params, page: '1', pageSize: '10000' })}`;
  const sectorOptions = facets?.sectors ? Object.keys(facets.sectors).sort() : [];
  const exchangeOptions = facets?.exchanges ? Object.keys(facets.exchanges) : EXCHANGES;

  return (
    <section className="issuers">
      <div className="page-head">
        <div>
          <h1>Issuer intelligence</h1>
          <p className="muted">
            {!loaded ? 'Loading universe…'
              : universeTotal ? `${int(universeTotal)} listed companies tracked`
              : 'No issuers ingested yet'}
            {loaded && facets?.stats?.updatedAt && ` · updated ${new Date(facets.stats.updatedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn sm" onClick={() => refresh('universe')} disabled={Boolean(refreshing)}>
            {refreshing === 'universe' ? <span className="spinner" /> : '↻'} Universe
          </button>
          <button className="btn sm" onClick={() => refresh('enrich')} disabled={Boolean(refreshing)}>
            {refreshing === 'enrich' ? <span className="spinner" /> : '◷'} Enrich
          </button>
          <button className="btn sm" onClick={() => refresh('scan')} disabled={Boolean(refreshing)}>
            {refreshing === 'scan' ? <span className="spinner" /> : '⌕'} Scan sites
          </button>
          <a className="btn sm primary" href={exportUrl} download>↓ Export CSV</a>
        </div>
      </div>

      {error && <div className="banner">Could not load issuers — {error}</div>}
      {loaded && !universeTotal && !loading && (
        <div className="banner">
          The store is empty. Run <code>npm run issuers:check</code> to confirm your data sources, then
          <code> npm run issuers -- --enrich 300</code> to build the universe.
        </div>
      )}

      <div className="iss-layout">
        <aside className="iss-rail panel pad">
          <div className="iss-rail-head">
            <strong>Filters</strong>
            <button className="btn ghost sm" onClick={reset}>Reset</button>
          </div>

          <label className="iss-field">
            <span>Search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Symbol, name, industry…" />
          </label>

          <div className="iss-group">
            <span className="iss-label">Exchange</span>
            <div className="iss-chips">
              {exchangeOptions.map((x) => (
                <button key={x} className={`pill sm ${exchange.includes(x) ? 'active' : ''}`} onClick={() => toggle(exchange, setExchange, x)}>
                  {x}{facets?.exchanges?.[x] ? ` ${facets.exchanges[x]}` : ''}
                </button>
              ))}
            </div>
          </div>

          {sectorOptions.length > 0 && (
            <div className="iss-group">
              <span className="iss-label">Sector</span>
              <div className="iss-chips">
                {sectorOptions.map((s) => (
                  <button key={s} className={`pill sm ${sector.includes(s) ? 'active' : ''}`} onClick={() => toggle(sector, setSector, s)}>
                    {facets?.sectorLabels?.[s] || s} {facets.sectors[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="iss-group">
            <span className="iss-label">Tier</span>
            <div className="iss-chips">
              {TIERS.filter((t) => !facets || facets.tiers?.[t]).map((t) => (
                <button key={t} className={`pill sm ${tier.includes(t) ? 'active' : ''}`} onClick={() => toggle(tier, setTier, t)}>
                  {t.split(' ')[0]} {facets?.tiers?.[t] ?? ''}
                </button>
              ))}
            </div>
          </div>

          <label className="iss-field">
            <span>Liquidity</span>
            <select value={maxVolume} onChange={(e) => setMaxVolume(e.target.value)}>
              {VOLUME_CAPS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>

          <label className="iss-field">
            <span>Market cap</span>
            <select value={capRange} onChange={(e) => setCapRange(e.target.value)}>
              {CAP_RANGES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>

          <label className="iss-field">
            <span>Drawdown</span>
            <select value={minDrawdown} onChange={(e) => setMinDrawdown(e.target.value)}>
              {DRAWDOWNS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>

          <div className="iss-two">
            <label className="iss-field">
              <span>Min score</span>
              <input type="number" min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
            </label>
            <label className="iss-field">
              <span>Min watchers</span>
              <input type="number" min="0" value={minWatchers} onChange={(e) => setMinWatchers(e.target.value)} placeholder="0" />
            </label>
          </div>

          <label className="iss-check">
            <input type="checkbox" checked={noAgency} onChange={(e) => setNoAgency(e.target.checked)} />
            <span>No incumbent IR agency</span>
          </label>
          <label className="iss-check">
            <input type="checkbox" checked={hasContact} onChange={(e) => setHasContact(e.target.checked)} />
            <span>Has a reachable contact</span>
          </label>
          <label className="iss-check">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <span>Fully scored only</span>
          </label>
        </aside>

        <div className="iss-main">
          <div className="iss-toolbar">
            <span className="muted">
              {loading ? 'Loading…' : `${int(total)} match${total === 1 ? '' : 'es'}`}
              {total > pageSize && ` · page ${page} of ${Math.ceil(total / pageSize)}`}
            </span>
            <div className="spacer" />
            <label className="iss-sort">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div className="panel iss-table-wrap">
            <table className="iss-table">
              <thead>
                <tr>
                  <th>Fit</th><th>Symbol</th><th>Company</th><th>Sector</th>
                  <th className="num">Mkt cap</th><th className="num">$ Vol/day</th>
                  <th className="num">Drawdown</th><th className="num">Watchers</th><th>IR posture</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} onClick={() => setSelected(r)} className={selected?.key === r.key ? 'sel' : ''}>
                    <td><ScorePill score={r.fitScore} tier={r.fitTier} provisional={r.fit?.provisional} /></td>
                    <td><strong>{r.symbol}</strong><div className="iss-ex">{r.exchange}</div></td>
                    <td className="iss-name">{r.name}</td>
                    <td className="iss-sector" title={r.sectorLabel || ''}>{r.sectorLabel || '—'}</td>
                    <td className="num">{usd(r.marketCap)}</td>
                    <td className="num">{usd(r.avgDollarVolume3m)}</td>
                    <td className={`num ${r.drawdownPct != null && r.drawdownPct <= -0.6 ? 'bad' : ''}`}>{pct(r.drawdownPct)}</td>
                    <td className="num">{int(r.watchers)}</td>
                    <td>
                      {r.irPosture === 'agency-retained'
                        ? <span className="iss-tag warn" title={r.incumbentAgency || ''}>{r.incumbentAgency || 'Agency'}</span>
                        : r.irPosture === 'in-house' ? <span className="iss-tag good">In-house</span>
                        : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={9} className="empty">
                    {loading || !loaded ? 'Loading…' : 'No issuers match these filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div className="iss-pager">
              <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="muted">Page {page} of {Math.ceil(total / pageSize)}</span>
              <button className="btn sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {selected && <IssuerDrawer issuer={selected} model={model} onClose={() => setSelected(null)} onToast={onToast} />}
    </section>
  );
}

/** The detail drawer — the argument for the call, signal by signal. */
function IssuerDrawer({ issuer, model, onClose, onToast }) {
  const [full, setFull] = useState(issuer);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    setFull(issuer);
    let cancelled = false;
    fetch(`/api/issuers/${encodeURIComponent(issuer.key)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && !d.error) setFull(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [issuer]);

  const rescan = async () => {
    setRescanning(true);
    try {
      const res = await fetch(`/api/issuers/${encodeURIComponent(issuer.key)}/scan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setFull(data);
      onToast?.(`${issuer.symbol} re-scanned`);
    } catch (err) {
      onToast?.(`Scan failed — ${err.message}`);
    } finally {
      setRescanning(false);
    }
  };

  const notes = full.analystNotes || {};

  return (
    <div className="iss-drawer-backdrop" onClick={onClose}>
      <aside className="iss-drawer panel" onClick={(e) => e.stopPropagation()}>
        <header className="iss-drawer-head">
          <div>
            <h2>{full.symbol} <span className="muted">· {full.exchange}</span></h2>
            <p className="muted">{full.name}</p>
          </div>
          <ScorePill score={full.fitScore} tier={full.fitTier} provisional={full.fit?.provisional} />
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </header>

        {full.fit?.provisional && (
          <div className="banner">
            Scored on {full.fit.coverage}% of the model — enrich this record before working it.
          </div>
        )}

        <div className="iss-stats">
          <div><span>Market cap</span><strong>{usd(full.marketCap)}</strong></div>
          <div><span>Price</span><strong>{full.price != null ? `$${Number(full.price).toFixed(2)}` : '—'}</strong></div>
          <div><span>$ Vol/day</span><strong>{usd(full.avgDollarVolume3m)}</strong></div>
          <div><span>Drawdown</span><strong>{pct(full.drawdownPct)}</strong></div>
          <div><span>Watchers</span><strong>{int(full.watchers)}</strong></div>
          <div><span>$ per watcher</span><strong>{full.dollarPerWatcher != null ? `$${full.dollarPerWatcher.toFixed(1)}` : '—'}</strong></div>
          <div><span>Revenue</span><strong>{usd(full.revenue)}</strong></div>
          <div><span>Cash</span><strong>{usd(full.cash)}</strong></div>
          <div><span>Runway</span><strong>{full.runwayMonths != null ? `${Math.round(full.runwayMonths)} mo` : '—'}</strong></div>
        </div>

        {full.summary && <p className="iss-summary">{full.summary}</p>}

        <div className="iss-section">
          <h3>Why this company</h3>
          {full.fit?.reasons?.length ? (
            <ul className="iss-reasons">{full.fit.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          ) : <p className="muted">Not enough data to make the case yet.</p>}
          {notes.whyFit && (
            <details className="iss-note"><summary>Analyst note (POC workbook)</summary><p>{notes.whyFit}</p></details>
          )}
        </div>

        {full.fit?.tests && (
          <div className="iss-section">
            <h3>Score breakdown</h3>
            {full.fit.tests.map((t) => (
              <div key={t.id} className="iss-test">
                <div className="iss-test-head">
                  <strong>{t.label}</strong>
                  <span className="muted">{t.score == null ? 'no data' : `${t.score}/100`} · weight {t.weight}</span>
                </div>
                <div className="iss-bar"><i style={{ width: `${t.score ?? 0}%` }} /></div>
                <ul className="iss-signals">
                  {t.signals.map((s) => (
                    <li key={s.id} className={!s.evaluated ? 'off' : s.hit ? 'hit' : 'miss'}>
                      <span className="iss-sig-dot" />
                      <span className="iss-sig-label">{s.label}</span>
                      <span className="iss-sig-detail">{s.evaluated ? (s.detail || (s.hit ? 'hit' : 'no')) : 'no data'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="iss-section">
          <h3>Outreach</h3>
          <dl className="iss-kv">
            <dt>IR posture</dt><dd>{full.irPosture || '—'}</dd>
            <dt>Incumbent</dt>
            <dd>{full.incumbentAgency ? `${full.incumbentAgency} (${full.incumbentEvidence || 'unverified'})` : 'None found'}</dd>
            <dt>IR contact</dt>
            <dd>{full.irEmail ? <a href={`mailto:${full.irEmail}`}>{full.irEmail}</a> : '—'}</dd>
            <dt>Website</dt>
            <dd>{full.website ? <a href={full.website} target="_blank" rel="noreferrer">{full.website.replace(/^https?:\/\//, '')} ↗</a> : '—'}</dd>
            <dt>LinkedIn</dt>
            <dd>{full.linkedin ? <a href={full.linkedin} target="_blank" rel="noreferrer">Company page ↗</a> : '—'}</dd>
            <dt>IR job posting</dt>
            <dd>{full.irJobPosting ? <a href={full.irJobPosting} target="_blank" rel="noreferrer">Open role ↗</a> : '—'}</dd>
            {notes.contact && <><dt>POC contact</dt><dd>{notes.contact}</dd></>}
          </dl>
        </div>

        {(notes.catalyst || notes.ambition || notes.financing) && (
          <div className="iss-section">
            <h3>Catalyst &amp; ambition</h3>
            {notes.catalyst && <p><strong>Catalyst.</strong> {notes.catalyst}</p>}
            {notes.ambition && <p><strong>Ambition.</strong> {notes.ambition}</p>}
            {notes.financing && <p><strong>Financing.</strong> {notes.financing}</p>}
          </div>
        )}

        <footer className="iss-drawer-foot">
          <button className="btn sm" onClick={rescan} disabled={rescanning}>
            {rescanning ? <span className="spinner" /> : '↻'} Re-verify from source
          </button>
          <span className="muted sm">
            {full.marketDataAt ? `Market data ${new Date(full.marketDataAt).toLocaleDateString()}` : 'Not enriched'}
            {full.siteScanAt && ` · site ${new Date(full.siteScanAt).toLocaleDateString()}`}
          </span>
        </footer>
      </aside>
    </div>
  );
}
