import React, { useEffect, useMemo, useRef, useState } from 'react';
import { demo, initialDemoFromUrl } from './demo';

// Seed demo mode from the URL (?demo=1) before any API call runs.
demo.set(initialDemoFromUrl());

// ── API helpers ──────────────────────────────────────────────────────────────
async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
// Each call routes to bundled sample data when demo mode is on, else the API.
const api = {
  config: () => (demo.enabled ? demo.config() : jsonFetch('/api/config')),
  news: (p) => (demo.enabled ? demo.news(p) : jsonFetch(`/api/news?${new URLSearchParams(p).toString()}`)),
  analyze: (story) => (demo.enabled ? demo.analyze(story) : jsonFetch('/api/analyze', post({ story }))),
  generate: (story, format, tone) => (demo.enabled ? demo.generate(story, format) : jsonFetch('/api/generate', post({ story, format, tone }))),
  refine: (text, instruction) => (demo.enabled ? demo.refine(text) : jsonFetch('/api/refine', post({ text, instruction }))),
  slack: (text) => (demo.enabled ? demo.slack(text) : jsonFetch('/api/slack', post({ text }))),
};
function post(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

const FALLBACK_PILLARS = [
  { id: 'capital-markets', name: 'Capital Markets & IPOs', accent: '#3B82F6' },
  { id: 'mining-metals', name: 'Mining & Metals', accent: '#F59E0B' },
  { id: 'energy-cleantech', name: 'Energy & Cleantech', accent: '#10B981' },
  { id: 'tech-innovation', name: 'Technology & Innovation', accent: '#8B5CF6' },
  { id: 'deals-ma', name: 'Deals & M&A', accent: '#EC4899' },
  { id: 'macro-markets', name: 'Macro & Markets', accent: '#06B6D4' },
  { id: 'esg-governance', name: 'ESG & Governance', accent: '#22C55E' },
];

const FORMATS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X / Twitter' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'blog', label: 'Blog' },
  { id: 'reel', label: 'Reel script' },
];

const TABS = ['Dashboard', 'Newsroom', 'Studio', 'Calendar', 'Slack'];

function timeAgo(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(d)) return '';
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [pillars, setPillars] = useState(FALLBACK_PILLARS);
  const [sourcing, setSourcing] = useState('');
  const [slackConfigured, setSlackConfigured] = useState(false);
  const [demoOn, setDemoOn] = useState(demo.enabled);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [activePillar, setActivePillar] = useState('all');

  const [selected, setSelected] = useState(null);
  const [statuses, setStatuses] = useState({}); // id -> draft|approved|published
  const [calendar, setCalendar] = useState([]);
  const [slackFeed, setSlackFeed] = useState([]);
  const [toast, setToast] = useState('');

  const pillarById = useMemo(() => Object.fromEntries(pillars.map((p) => [p.id, p])), [pillars]);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    try {
      const c = await api.config();
      if (c.pillars?.length) setPillars(c.pillars);
      setSourcing(c.sourcing);
      setSlackConfigured(Boolean(c.slackConfigured));
      // Auto-fall back to demo when the server has no Anthropic key configured.
      if (!demo.enabled && c.hasAnthropicKey === false) {
        applyDemo(true);
        return;
      }
    } catch {
      /* config is best-effort */
    }
    loadNews(1, true);
  }

  function applyDemo(on) {
    demo.set(on);
    setDemoOn(on);
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set('demo', '1');
      else url.searchParams.delete('demo');
      window.history.replaceState({}, '', url);
    } catch { /* ignore */ }
    setSelected(null);
    setStatuses({});
    setCalendar([]);
    setSlackFeed([]);
    setActivePillar('all');
    bootstrap();
  }

  function flash(msg) {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(''), 2600);
  }

  async function loadNews(nextPage = 1, replace = false) {
    setLoading(true);
    setError('');
    try {
      const data = await api.news({ q: query, from, page: nextPage, pageSize: 12 });
      setArticles((prev) => (replace ? data.articles : dedupeById([...prev, ...data.articles])));
      setPage(data.page);
      setHasMore(Boolean(data.hasMore));
      if (data.sourcing) setSourcing(data.sourcing);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function pushSlack(text) {
    setSlackFeed((f) => [{ id: Date.now(), text, at: new Date().toISOString() }, ...f].slice(0, 40));
    if (slackConfigured) api.slack(text).catch(() => {});
  }

  function openStudio(story) {
    setSelected(story);
    setStatuses((s) => ({ ...s, [story.id]: s[story.id] || 'draft' }));
    setTab('Studio');
  }

  function setStatus(id, status) {
    setStatuses((s) => ({ ...s, [id]: status }));
  }

  function scheduleStory(story, dateStr, channel) {
    setCalendar((c) =>
      [...c, { id: `${story.id}-${Date.now()}`, storyId: story.id, title: story.title, date: dateStr, channel }]
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    );
  }

  const visible = activePillar === 'all' ? articles : articles.filter((a) => a.pillar === activePillar);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/wordmark.svg" alt="Market One" />
          <span className="tag">Content Intelligence</span>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <div className="spacer" />
        <button
          className={`btn sm ghost demo-toggle ${demoOn ? 'on' : ''}`}
          onClick={() => applyDemo(!demoOn)}
          title={demoOn ? 'Showing bundled sample data — click for live mode' : 'Switch to bundled sample data (no API key needed)'}
        >
          <span className={`switch ${demoOn ? 'on' : ''}`} style={{ pointerEvents: 'none' }} /> Demo
        </button>
        <span className="src-chip" title="How news is being sourced">
          <span className={`dot ${demoOn ? 'demo' : sourcing === 'newsapi' ? '' : 'warn'}`} />
          {demoOn ? 'Demo data' : sourcing === 'newsapi' ? 'NewsAPI + Claude' : sourcing === 'web-search' ? 'Claude web-search' : 'connecting…'}
        </span>
      </header>

      <main className="main">
        {demoOn && (
          <div className="banner demo-banner">
            ◆ <b>Demo mode</b> — showing bundled sample stories so you can explore the full workflow. Add an <code>ANTHROPIC_API_KEY</code> and turn Demo off for real, source-linked news.
          </div>
        )}
        {tab === 'Dashboard' && (
          <Dashboard
            articles={articles}
            pillars={pillars}
            pillarById={pillarById}
            statuses={statuses}
            calendar={calendar}
            onGoNewsroom={() => setTab('Newsroom')}
          />
        )}

        {tab === 'Newsroom' && (
          <Newsroom
            {...{ articles: visible, allArticles: articles, loading, error, hasMore, query, from, activePillar, pillars, pillarById }}
            setQuery={setQuery}
            setFrom={setFrom}
            setActivePillar={setActivePillar}
            onSearch={() => loadNews(1, true)}
            onRefresh={() => loadNews(1, true)}
            onLoadMore={() => loadNews(page + 1, false)}
            onOpen={openStudio}
            statuses={statuses}
          />
        )}

        {tab === 'Studio' && (
          <Studio
            story={selected}
            pillarById={pillarById}
            status={selected ? statuses[selected.id] : null}
            onStatus={(st) => {
              if (!selected) return;
              setStatus(selected.id, st);
              if (st === 'approved') { pushSlack(`✅ *Approved for publishing:* "${selected.title}" — ${pillarById[selected.pillar]?.name || ''}`); flash('Approved — Slack alert sent'); }
              if (st === 'published') { pushSlack(`🚀 *Published:* "${selected.title}" (${selected.source}) ${selected.url}`); flash('Pushed to publish'); }
            }}
            onSchedule={(dateStr, channel) => { scheduleStory(selected, dateStr, channel); pushSlack(`🗓️ *Scheduled* "${selected.title}" → ${channel} on ${dateStr}`); flash('Added to calendar'); }}
            onToast={flash}
            onBack={() => setTab('Newsroom')}
          />
        )}

        {tab === 'Calendar' && (
          <Calendar items={calendar} pillarById={pillarById} articles={articles} statuses={statuses} />
        )}

        {tab === 'Slack' && (
          <SlackFeed feed={slackFeed} configured={slackConfigured} />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function dedupeById(arr) {
  const seen = new Set();
  return arr.filter((a) => (seen.has(a.id) ? false : seen.add(a.id)));
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ articles, pillars, pillarById, statuses, calendar, onGoNewsroom }) {
  const total = articles.length;
  const approved = Object.values(statuses).filter((s) => s === 'approved').length;
  const published = Object.values(statuses).filter((s) => s === 'published').length;

  const byPillar = pillars.map((p) => ({ ...p, count: articles.filter((a) => a.pillar === p.id).length }));
  const maxCount = Math.max(1, ...byPillar.map((p) => p.count));
  const sentiments = ['positive', 'neutral', 'negative'].map((s) => ({
    s, count: articles.filter((a) => a.sentiment === s).length,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Newsroom dashboard</h1>
          <p>A live read on what’s breaking across Market One’s content pillars — every story sourced and linked to its original.</p>
        </div>
        <button className="btn primary" onClick={onGoNewsroom}>Open newsroom →</button>
      </div>

      <div className="stat-row">
        <div className="panel kpi"><div className="n">{total}</div><div className="l">Stories sourced</div></div>
        <div className="panel kpi"><div className="n">{pillars.length}</div><div className="l">Content pillars</div></div>
        <div className="panel kpi"><div className="n" style={{ color: 'var(--good)' }}>{approved}</div><div className="l">Approved</div></div>
        <div className="panel kpi"><div className="n" style={{ color: 'var(--accent)' }}>{published}</div><div className="l">Published</div></div>
        <div className="panel kpi"><div className="n" style={{ color: 'var(--accent-2)' }}>{calendar.length}</div><div className="l">Scheduled</div></div>
      </div>

      <div className="cols">
        <div className="panel pad">
          <div className="section-label">Coverage by pillar</div>
          <div className="bar-list">
            {byPillar.map((p) => (
              <div className="bar-item" key={p.id}>
                <span style={{ color: 'var(--text-dim)' }}>{p.name}</span>
                <span className="bar"><span style={{ width: `${(p.count / maxCount) * 100}%`, background: p.accent }} /></span>
                <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{p.count}</span>
              </div>
            ))}
            {total === 0 && <div className="muted" style={{ fontSize: 13 }}>No stories yet — open the newsroom to source live news.</div>}
          </div>
        </div>

        <div className="panel pad">
          <div className="section-label">Market sentiment</div>
          <div className="bar-list">
            {sentiments.map(({ s, count }) => (
              <div className="bar-item" key={s}>
                <span style={{ textTransform: 'capitalize', color: 'var(--text-dim)' }}>{s}</span>
                <span className="bar"><span style={{ width: `${total ? (count / total) * 100 : 0}%`, background: s === 'positive' ? 'var(--good)' : s === 'negative' ? 'var(--bad)' : 'var(--muted)' }} /></span>
                <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{count}</span>
              </div>
            ))}
          </div>
          <div className="section-label" style={{ marginTop: 18 }}>Latest in</div>
          <div className="bar-list">
            {articles.slice(0, 4).map((a) => (
              <div key={a.id} style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="swatch" style={{ width: 8, height: 8, borderRadius: '50%', background: pillarById[a.pillar]?.accent || 'var(--accent)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Newsroom ─────────────────────────────────────────────────────────────────
function Newsroom(props) {
  const { articles, allArticles, loading, error, hasMore, query, from, activePillar, pillars, pillarById,
    setQuery, setFrom, setActivePillar, onSearch, onRefresh, onLoadMore, onOpen, statuses } = props;

  function quickRange(days) {
    if (!days) { setFrom(''); return; }
    const d = new Date(Date.now() - days * 86400000);
    setFrom(d.toISOString().slice(0, 10));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Live newsroom</h1>
          <p>Real, de-duplicated, sourced stories — segmented into pillars and ready for the studio.</p>
        </div>
        <button className="btn" onClick={onRefresh} disabled={loading}>
          {loading ? <span className="spinner" /> : '↻'} Refresh
        </button>
      </div>

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search stories — e.g. lithium, IPO, rate cut, copper…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <select value={from ? 'custom' : 'all'} onChange={(e) => quickRange(Number(e.target.value) || 0)}>
          <option value="0">Any time</option>
          <option value="1">Past 24 hours</option>
          <option value="7">Past week</option>
          <option value="30">Past month</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
        <button className="btn primary" onClick={onSearch} disabled={loading}>Search</button>
      </div>

      <div className="pillars">
        <button className={`pill ${activePillar === 'all' ? 'active' : ''}`} onClick={() => setActivePillar('all')}>
          All <span className="muted">{allArticles.length}</span>
        </button>
        {pillars.map((p) => {
          const n = allArticles.filter((a) => a.pillar === p.id).length;
          return (
            <button key={p.id} className={`pill ${activePillar === p.id ? 'active' : ''}`} onClick={() => setActivePillar(p.id)}>
              <span className="swatch" style={{ background: p.accent }} />{p.name} <span className="muted">{n}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="banner">⚠ {error}</div>}

      {articles.length === 0 && !loading && !error && (
        <div className="empty">No stories yet. Try a search, widen the date range, or hit Refresh.</div>
      )}

      <div className="grid">
        {articles.map((a) => (
          <StoryCard key={a.id} story={a} pillar={pillarById[a.pillar]} status={statuses[a.id]} onOpen={() => onOpen(a)} />
        ))}
      </div>

      {loading && articles.length === 0 && <div className="empty"><span className="spinner" /> Sourcing real, linked stories…</div>}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button className="btn" onClick={onLoadMore} disabled={loading}>
            {loading ? <span className="spinner" /> : null} Load more
          </button>
        </div>
      )}
    </>
  );
}

function StoryCard({ story, pillar, status, onOpen }) {
  const accent = pillar?.accent || 'var(--accent)';
  return (
    <article className="story" style={{ '--accent': accent }}>
      <div className="row">
        <span className="tag-pillar" style={{ background: `${accent}26`, color: accent }}>{pillar?.name || story.pillar}</span>
        <span className={`tag-sent sent-${story.sentiment}`}>{story.sentiment}</span>
        {status && status !== 'draft' && <span className={`status ${status}`}>{status}</span>}
      </div>
      <h3>{story.title}</h3>
      <p>{story.summary}</p>
      <div className="meta">
        <span className="src">{story.source}{story.publishedAt ? ` · ${timeAgo(story.publishedAt)}` : ''}</span>
        {story.stat && story.stat !== '—' && <span className="stat">{story.stat}</span>}
      </div>
      <div className="actions">
        <button className="btn primary sm" onClick={onOpen}>Open in studio</button>
        <a className="btn ghost sm" href={story.url} target="_blank" rel="noreferrer">Source ↗</a>
      </div>
    </article>
  );
}

// ── Studio ───────────────────────────────────────────────────────────────────
function Studio({ story, pillarById, status, onStatus, onSchedule, onToast, onBack }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [format, setFormat] = useState('linkedin');
  const [copy, setCopy] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [tone, setTone] = useState('confident, editorial');
  const [schedDate, setSchedDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [schedChannel, setSchedChannel] = useState('LinkedIn');

  useEffect(() => {
    setAnalysis(null); setCopy('');
    if (!story) return;
    setAnalyzing(true);
    api.analyze(story)
      .then((d) => setAnalysis(d.analysis))
      .catch((e) => onToast(e.message))
      .finally(() => setAnalyzing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  async function generate() {
    setGenLoading(true);
    try {
      const d = await api.generate(story, format, tone);
      setCopy(d.text);
    } catch (e) { onToast(e.message); }
    finally { setGenLoading(false); }
  }

  async function refineCopy() {
    if (!copy) return;
    setGenLoading(true);
    try {
      const d = await api.refine(copy, 'Tighten, sharpen the hook, keep it on-brand and compliant.');
      setCopy(d.text);
    } catch (e) { onToast(e.message); }
    finally { setGenLoading(false); }
  }

  if (!story) {
    return (
      <div className="empty">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>No story selected</h2>
        <p className="muted">Open a story from the newsroom to analyze it, generate on-brand copy, and design a branded graphic.</p>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={onBack}>Go to newsroom</button>
      </div>
    );
  }

  const pillar = pillarById[story.pillar];
  const accent = pillar?.accent || 'var(--accent)';

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span className="tag-pillar" style={{ background: `${accent}26`, color: accent }}>{pillar?.name}</span>
            <span className={`tag-sent sent-${story.sentiment}`}>{story.sentiment}</span>
            {status && <span className={`status ${status}`}>{status}</span>}
          </div>
          <h1 style={{ fontSize: 24, maxWidth: 760 }}>{story.title}</h1>
          <p>
            {story.source}{story.publishedAt ? ` · ${timeAgo(story.publishedAt)}` : ''} ·{' '}
            <a className="link" href={story.url} target="_blank" rel="noreferrer">Open source ↗</a> ·{' '}
            <button className="link" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => { navigator.clipboard?.writeText(story.url); onToast('Source link copied'); }}>Copy link</button>
          </p>
        </div>
        <button className="btn ghost" onClick={onBack}>← Newsroom</button>
      </div>

      <div className="studio">
        <div className="col">
          <div className="panel pad">
            <div className="section-label">AI analysis</div>
            {analyzing && <div className="muted"><span className="spinner" /> Analyzing the story…</div>}
            {analysis && (
              <>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 0 }}>{analysis.summary}</p>
                <div className="section-label" style={{ marginTop: 14 }}>Why it matters</div>
                <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{analysis.whyItMatters}</p>
                <div className="section-label" style={{ marginTop: 14 }}>Takeaways</div>
                <ul className="analysis-list">
                  {analysis.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="row" style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <span className={`tag-sent sent-${analysis.sentiment}`}>Sentiment: {analysis.sentiment}</span>
                  <span className="tag-sent sent-neutral">Trend: {analysis.trend}</span>
                  {analysis.stat && <span className="stat" style={{ marginLeft: 'auto' }}>{analysis.stat}</span>}
                </div>
              </>
            )}
          </div>

          <div className="panel pad">
            <div className="section-label">Approval &amp; publishing</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => onStatus('draft')}>Mark draft</button>
              <button className="btn" onClick={() => onStatus('approved')} style={{ borderColor: 'var(--good)' }}>✓ Approve</button>
              <button className="btn primary" onClick={() => onStatus('published')}>🚀 Push to publish</button>
            </div>
            <div className="section-label" style={{ marginTop: 16 }}>Schedule</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="fld">Date<input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} /></label>
              <label className="fld">Channel
                <select value={schedChannel} onChange={(e) => setSchedChannel(e.target.value)}>
                  <option>LinkedIn</option><option>X / Twitter</option><option>Instagram</option><option>Newsletter</option><option>Blog</option>
                </select>
              </label>
              <button className="btn" onClick={() => onSchedule(schedDate, schedChannel)}>Add to calendar</button>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="panel pad">
            <div className="section-label">Generate on-brand copy</div>
            <div className="format-tabs" style={{ marginBottom: 12 }}>
              {FORMATS.map((f) => (
                <button key={f.id} className={format === f.id ? 'active' : ''} onClick={() => setFormat(f.id)}>{f.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
              <label className="fld" style={{ flex: 1 }}>Tone
                <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="confident, editorial" />
              </label>
              <button className="btn primary" onClick={generate} disabled={genLoading}>
                {genLoading ? <span className="spinner" /> : '✦'} Generate
              </button>
            </div>
            <textarea
              className="copy-out"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Generated copy appears here — fully editable. Brand voice + compliance guardrails applied server-side."
              rows={8}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn sm" onClick={refineCopy} disabled={!copy || genLoading}>✎ AI refine</button>
              <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(copy); onToast('Copy copied'); }} disabled={!copy}>Copy</button>
            </div>
          </div>

          <BrandedGraphic story={story} pillar={pillar} onToast={onToast} />
        </div>
      </div>
    </>
  );
}

// ── Branded graphic ──────────────────────────────────────────────────────────
const GRAPHIC_FORMATS = {
  square: { w: 1080, h: 1080, label: 'Square' },
  portrait: { w: 1080, h: 1350, label: 'Portrait' },
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
  landscape: { w: 1920, h: 1080, label: 'Landscape' },
  link: { w: 1200, h: 630, label: 'Link card' },
};

function wrapText(text, maxChars, maxLines = 6) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    // Hard-break a single word longer than the line budget so it can't overflow.
    if (w.length > maxChars) {
      if (line) { lines.push(line.trim()); line = ''; }
      let rest = w;
      while (rest.length > maxChars) { lines.push(rest.slice(0, maxChars - 1) + '-'); rest = rest.slice(maxChars - 1); }
      line = rest;
      continue;
    }
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[.,;:]?$/, '') + '…';
    return kept;
  }
  return lines;
}

function BrandedGraphic({ story, pillar, onToast }) {
  const svgRef = useRef(null);
  const [fmt, setFmt] = useState('square');
  const [gradient, setGradient] = useState('soft'); // off | soft | bold
  const [showEyebrow, setShowEyebrow] = useState(true);
  const [showStat, setShowStat] = useState(true);
  const [showSource, setShowSource] = useState(true);
  const [bgImage, setBgImage] = useState(null);
  const [headline, setHeadline] = useState(story.title);
  const [eyebrow, setEyebrow] = useState((pillar?.name || 'Market One').toUpperCase());
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    setHeadline(story.title);
    setEyebrow((pillar?.name || 'Market One').toUpperCase());
  }, [story.id, pillar?.name]);

  const accent = pillar?.accent || '#3B82F6';
  const dims = GRAPHIC_FORMATS[fmt];
  const isWide = dims.w >= dims.h;
  const M = isWide ? 84 : 76;              // safe margin on every edge
  const availW = dims.w - M * 2;

  // Footer (wordmark + source) is pinned to the bottom; everything stacks above it.
  const footerY = dims.h - M;
  const hasStat = showStat && story.stat && story.stat !== '—';
  const statH = 70;
  let contentBottom = footerY - 64;        // content must stay above the footer
  let statTop = null;
  if (hasStat) { statTop = contentBottom - statH; contentBottom = statTop - 28; }

  // Reserve room above the headline for the accent rule + eyebrow.
  const topLimit = M + (showEyebrow ? 92 : 40);
  const availH = Math.max(120, contentBottom - topLimit);

  // Adaptively shrink the headline until it fits the available width AND height.
  const maxHead = isWide ? 76 : dims.h > 1400 ? 84 : 72;
  const charW = 0.53;                      // avg glyph-width factor for the bold serif
  const fit = (() => {
    for (let fs = maxHead; fs >= 26; fs -= 2) {
      const cpl = Math.max(6, Math.floor(availW / (fs * charW)));
      const ls = wrapText(headline, cpl, 8);
      const lh = fs * 1.06;
      const widest = ls.reduce((m, l) => Math.max(m, l.length * fs * charW), 0);
      if (ls.length * lh <= availH && widest <= availW) return { fs, ls, lh };
    }
    const fs = 26, lh = fs * 1.06;
    const cpl = Math.max(6, Math.floor(availW / (fs * charW)));
    const ls = wrapText(headline, cpl, Math.max(1, Math.floor(availH / lh)));
    return { fs, ls, lh };
  })();

  const lines = fit.ls;
  const headlineSize = fit.fs;
  const firstBaseline = contentBottom - (lines.length - 1) * fit.lh; // bottom-aligned block
  const headlineTopY = firstBaseline - headlineSize;
  const eyebrowY = headlineTopY - 24;
  const ruleY = eyebrowY - 30;
  const eyebrowMax = Math.max(8, Math.floor(availW / 22));
  const statW = hasStat ? Math.min(availW, 44 + String(story.stat).length * 26) : 0;

  function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result);
    reader.readAsDataURL(file);
  }

  async function refineHeadline() {
    setRefining(true);
    try {
      const d = await api.refine(headline, 'Rewrite as a punchy, scroll-stopping headline of 8 words or fewer. No period. Keep it accurate.');
      setHeadline(d.text.replace(/^["']|["']$/g, '').trim());
    } catch (e) { onToast(e.message); }
    finally { setRefining(false); }
  }

  function download() {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketone-${fmt}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Graphic downloaded (SVG)');
  }

  return (
    <div className="panel pad">
      <div className="section-label">Branded graphic</div>
      <div className="graphic-wrap">
        <div className="graphic-stage">
          <svg ref={svgRef} viewBox={`0 0 ${dims.w} ${dims.h}`} width={dims.w} height={dims.h} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g-overlay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0b0f1a" stopOpacity={gradient === 'bold' ? 0.35 : gradient === 'soft' ? 0.15 : 0} />
                <stop offset="0.55" stopColor="#0b0f1a" stopOpacity={gradient === 'bold' ? 0.65 : gradient === 'soft' ? 0.45 : 0.2} />
                <stop offset="1" stopColor="#0b0f1a" stopOpacity={gradient === 'bold' ? 0.97 : gradient === 'soft' ? 0.9 : 0.75} />
              </linearGradient>
              <linearGradient id="g-mesh" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={accent} stopOpacity="0.55" />
                <stop offset="1" stopColor="#06b6d4" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Background */}
            <rect width={dims.w} height={dims.h} fill="#0b0f1a" />
            {bgImage
              ? <image href={bgImage} width={dims.w} height={dims.h} preserveAspectRatio="xMidYMid slice" />
              : <rect width={dims.w} height={dims.h} fill="url(#g-mesh)" />}
            <rect width={dims.w} height={dims.h} fill="url(#g-overlay)" />

            {/* Accent rule */}
            <rect x={M} y={ruleY} width="64" height="6" rx="3" fill={accent} />

            {/* Eyebrow */}
            {showEyebrow && (
              <text x={M} y={eyebrowY} fill={accent} fontFamily="Franklin Gothic, Arial, sans-serif" fontSize={isWide ? 30 : 28} fontWeight="700" letterSpacing="4">
                {eyebrow.slice(0, eyebrowMax)}
              </text>
            )}

            {/* Headline (adaptively sized + bottom-anchored so it never overflows) */}
            <text x={M} y={firstBaseline} fill="#ffffff" fontFamily="Georgia, 'Superior Title', serif" fontSize={headlineSize} fontWeight="700" letterSpacing="-1">
              {lines.map((ln, i) => (
                <tspan key={i} x={M} dy={i === 0 ? 0 : fit.lh}>{ln}</tspan>
              ))}
            </text>

            {/* Stat block */}
            {hasStat && (
              <g>
                <rect x={M} y={statTop} width={statW} height={statH} rx="12" fill={accent} fillOpacity="0.16" stroke={accent} strokeOpacity="0.5" />
                <text x={M + 24} y={statTop + statH / 2 + 15} fill={accent} fontFamily="Georgia, serif" fontSize="42" fontWeight="700">{String(story.stat).slice(0, 24)}</text>
              </g>
            )}

            {/* Footer: wordmark + source */}
            <g>
              <path d={`M${M} ${footerY + 6} V${footerY - 30} l 16 26 l 16 -26 V${footerY + 6}`} fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={M + 46} cy={footerY - 26} r="6" fill={accent} />
              <text x={M + 60} y={footerY + 4} fill="#ffffff" fontFamily="Georgia, serif" fontSize="36" fontWeight="700">Market<tspan fill={accent}>One</tspan></text>
            </g>
            {showSource && (
              <text x={dims.w - M} y={footerY + 4} textAnchor="end" fill="#c4ccde" fontFamily="Franklin Gothic, Arial, sans-serif" fontSize="26" letterSpacing="1">
                Source: {(story.source || '').slice(0, 26)}
              </text>
            )}
          </svg>
        </div>

        <div className="controls">
          <div>
            <div className="section-label">Format</div>
            <select value={fmt} onChange={(e) => setFmt(e.target.value)} style={{ width: '100%' }}>
              {Object.entries(GRAPHIC_FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label} · {v.w}×{v.h}</option>)}
            </select>
          </div>
          <div>
            <div className="section-label">Gradient</div>
            <div className="seg">
              {['off', 'soft', 'bold'].map((g) => (
                <button key={g} className={gradient === g ? 'active' : ''} onClick={() => setGradient(g)}>{g}</button>
              ))}
            </div>
          </div>
          <label className="fld">Headline
            <textarea value={headline} onChange={(e) => setHeadline(e.target.value)} rows={3} />
          </label>
          <button className="btn sm" onClick={refineHeadline} disabled={refining}>{refining ? <span className="spinner" /> : '✦'} AI refine headline</button>
          <Toggle label="Eyebrow" on={showEyebrow} set={setShowEyebrow} />
          <Toggle label="Stat block" on={showStat} set={setShowStat} />
          <Toggle label="Source line" on={showSource} set={setShowSource} />
          <label className="fld">Background photo
            <input type="file" accept="image/*" onChange={onUpload} />
          </label>
          {bgImage && <button className="btn sm ghost" onClick={() => setBgImage(null)}>Remove photo</button>}
          <button className="btn primary" onClick={download}>↓ Download graphic</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, on, set }) {
  return (
    <div className="toggle-row" onClick={() => set(!on)} style={{ cursor: 'pointer' }}>
      <span>{label}</span>
      <span className={`switch ${on ? 'on' : ''}`} />
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────
function Calendar({ items, pillarById, articles, statuses }) {
  const byId = Object.fromEntries(articles.map((a) => [a.id, a]));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Publishing calendar</h1>
          <p>Everything scheduled from the studio. In production, wire this to a DB so the plan persists across sessions.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing scheduled yet. Approve a story in the studio and add it to the calendar.</div>
      ) : (
        <div className="cal-grid">
          {items.map((it) => {
            const story = byId[it.storyId];
            const pillar = story ? pillarById[story.pillar] : null;
            return (
              <div className="panel cal-item" key={it.id}>
                <div className="cal-date">{new Date(it.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{it.title}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                    {it.channel}{pillar ? ` · ${pillar.name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {story && <span className={`status ${statuses[story.id] || 'draft'}`}>{statuses[story.id] || 'draft'}</span>}
                  {story && <a className="link" href={story.url} target="_blank" rel="noreferrer">Source ↗</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Slack feed ───────────────────────────────────────────────────────────────
function SlackFeed({ feed, configured }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Slack alerts</h1>
          <p>Approval and publish events post here. {configured ? 'A real webhook is configured — alerts also post to your channel.' : 'Set SLACK_WEBHOOK_URL in .env to also post to a real #channel.'}</p>
        </div>
        <span className="src-chip"><span className={`dot ${configured ? '' : 'warn'}`} />{configured ? '#m1-newsroom · live' : 'in-app only'}</span>
      </div>
      {feed.length === 0 ? (
        <div className="empty">No alerts yet. Approve or publish a story to trigger one.</div>
      ) : (
        <div className="slack-feed">
          {feed.map((m) => (
            <div className="panel slack-msg" key={m.id}>
              <div className="av">M1</div>
              <div>
                <div className="body" dangerouslySetInnerHTML={{ __html: mdLite(m.text) }} />
                <div className="t">{timeAgo(m.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function mdLite(text) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a class="link" href="$1" target="_blank" rel="noreferrer">$1</a>');
}
