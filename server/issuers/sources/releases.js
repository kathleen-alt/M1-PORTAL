// Press-release archive scanner.
//
// The richest columns in the POC workbook are not market data — they are read
// out of the companies' own press releases: who signs the footer (the
// incumbent IR agency), which wire they pay to distribute, what the CEO says
// about being undervalued, what they just raised and what for, who they just
// hired into IR. This module enumerates a company's release archive and reads
// all of it.
//
// Archive discovery runs three ways, best first:
//   1. sitemap.xml   — the only source that is genuinely complete
//   2. RSS / Atom    — dated and clean, but usually only the recent window
//   3. paginated index pages — the fallback when neither exists
//
// robots.txt is honoured, requests are paced per host, and everything is
// cached, because a full archive sweep is thousands of requests.

import { get, HttpError } from '../http.js';
import { AGENCIES, toText, absolutize, links, robotsDisallow, findAgencies } from './site.js';

// Wires charge to distribute. A company on one of these is already paying for
// reach -- the POC sheet tracks it as the "Media Provider (receipt)".
const NEWSWIRES = [
  { id: 'globenewswire', label: 'GlobeNewswire', re: /globenewswire/i },
  { id: 'businesswire', label: 'Business Wire', re: /business\s*wire/i },
  { id: 'prnewswire', label: 'PR Newswire', re: /pr\s*newswire|prnewswire/i },
  { id: 'accesswire', label: 'ACCESSWIRE', re: /accesswire/i },
  { id: 'newsfile', label: 'Newsfile', re: /newsfile\s*corp|newsfile\.co/i },
  { id: 'cision', label: 'Cision / CNW', re: /\bcision\b|canada newswire|\bCNW\b/i },
  { id: 'eqs', label: 'EQS Newswire', re: /\bEQS\b.{0,12}(news|wire|group)/i },
  { id: 'juniorminingnetwork', label: 'Junior Mining Network', re: /junior mining network/i },
  { id: 'newsdirect', label: 'News Direct', re: /news\s*direct/i },
  { id: 'stockwire', label: 'Stockhouse / Stockwire', re: /stockhouse|stockwire/i },
];

// URL shapes that look like a news item rather than a section index.
const RELEASE_URL_RE = /(press|news|release|announce|media|article|story|pr)[-_/]/i;
const INDEX_URL_RE = /\/(news|press|press-releases|news-releases|media|newsroom|investors?\/news)\/?($|\?)/i;

const FEED_PATHS = [
  '/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/news/feed', '/news/rss',
  '/investors/rss', '/investors/news/feed', '/press-releases/feed', '/newsroom/feed',
];
const INDEX_PATHS = [
  '/news', '/news-releases', '/press-releases', '/newsroom', '/media/news',
  '/investors/news', '/investors/press-releases', '/investor-relations/news',
  '/news-events/press-releases', '/en/news',
];

// ── extraction helpers ────────────────────────────────────────────────────────

const META_RE = (prop) =>
  new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');

function metaContent(html, prop) {
  const m = html.match(META_RE(prop)) || html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'),
  );
  return m ? m[1].trim() : null;
}

/** Normalise anything date-shaped to YYYY-MM-DD, or null. */
function toIsoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  // "March 4, 2026" / "4 March 2026" / "Mar 4, 2026"
  let m = s.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) {
    const alt = s.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
    if (alt) m = [alt[0], alt[2], alt[1], alt[3]];
  }
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    if (d.getFullYear() > 1990 && d.getFullYear() < 2100) return d.toISOString().slice(0, 10);
  }
  return null;
}

function publishedDate(html, text) {
  for (const prop of ['article:published_time', 'og:published_time', 'datePublished', 'publishdate', 'date']) {
    const d = toIsoDate(metaContent(html, prop));
    if (d) return d;
  }
  const timeAttr = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeAttr) {
    const d = toIsoDate(timeAttr[1]);
    if (d) return d;
  }
  const ld = html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
  if (ld) {
    const d = toIsoDate(ld[1]);
    if (d) return d;
  }
  // Releases almost always open with the dateline.
  return toIsoDate(text.slice(0, 400));
}

function releaseTitle(html, text) {
  const og = metaContent(html, 'og:title');
  if (og) return og.slice(0, 240);
  const h1 = html.match(/<h1[^>]*>([\s\S]{0,400}?)<\/h1>/i);
  if (h1) {
    const t = toText(h1[1]).trim();
    if (t) return t.slice(0, 240);
  }
  const title = html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i);
  if (title) return toText(title[1]).split(/\s+[|–—-]\s+/)[0].trim().slice(0, 240);
  return text.split('\n').find((l) => l.trim().length > 20)?.slice(0, 240) || null;
}

function detectNewswire(text) {
  return NEWSWIRES.filter((w) => w.re.test(text)).map((w) => w.label);
}

/** Quoted sentences attributed to a named executive. */
function extractQuotes(text) {
  const out = [];
  const re = /[""]([^""]{40,400})[""]\s*,?\s*(?:said|added|commented|stated|noted)\s+([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+){0,3})/g;
  let m;
  while ((m = re.exec(text)) && out.length < 6) {
    out.push({ quote: m[1].replace(/\s+/g, ' ').trim(), speaker: m[2].trim() });
  }
  // The reversed form: Name said, "quote"
  const re2 = /([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+){0,3})\s*,?\s*(?:said|added|commented|stated)\s*,?\s*[""]([^""]{40,400})[""]/g;
  while ((m = re2.exec(text)) && out.length < 8) {
    out.push({ quote: m[2].replace(/\s+/g, ' ').trim(), speaker: m[1].trim() });
  }
  return out;
}

// The sheet's "CEO Undervalued Quote" column: management saying out loud that
// the market is not seeing them. The single best opening line for a pitch.
const UNDERVALUED_RE =
  /\b(undervalued|under-valued|underappreciated|under-appreciated|not reflected in (our|the) (share|stock) price|disconnect between|market has not|does not reflect the (true )?value|overlooked|misunderstood|trading (well )?below (its|our) (intrinsic|net asset|fair) value)\b/i;

const FINANCING_RE =
  /\b(bought deal|private placement|registered direct|public offering|underwritten offering|at-the-market|ATM program|shelf (registration|prospectus)|closes? (a|an|the)? ?(us)?\$?[\d.,]+\s*(million|billion|M|B)? (financing|offering|placement|raise)|non-brokered|LIFE offering|convertible (note|debenture))\b/i;

const IR_HIRE_RE =
  /\b(appoint(s|ed|ment)?|names?|hires?|welcomes?|joins?)\b[^.]{0,120}\b(investor relations|IR|capital markets|communications)\b|\b(investor relations|IR)\b[^.]{0,60}\b(appoint(s|ed|ment)?|hire[ds]?|joins?)\b/i;

const CATALYST_RE =
  /\b(feasibility study|preliminary economic assessment|\bPEA\b|resource estimate|drill results|assay results|permit(ting)?|FDA|clinical (trial|data)|topline|phase [123]|approval|LOI|letter of intent|definitive agreement|acquisition|offtake|contract award|commercial production|first (gold|ore|revenue|shipment)|uplisting|NASDAQ listing|record (revenue|quarter))\b/i;

// ── archive discovery ────────────────────────────────────────────────────────

function parseXmlLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

/** Pull item URL + date + title out of an RSS or Atom document. */
function parseFeed(xml, base) {
  const items = [];
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  for (const b of blocks) {
    const link =
      (b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      (b.match(/<link[^>]*>\s*(?:<!\[CDATA\[)?\s*([^<\]]+)/i) || [])[1];
    if (!link) continue;
    const url = absolutize(link.trim(), base);
    if (!url) continue;
    const rawTitle = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const rawDate =
      (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] ||
      (b.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] ||
      (b.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1] ||
      (b.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) || [])[1];
    items.push({
      url,
      title: toText(rawTitle).replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() || null,
      date: toIsoDate(rawDate),
      via: 'feed',
    });
  }
  return items;
}

/** Feed URLs the homepage advertises, plus the conventional paths. */
function feedCandidates(origin, homeHtml) {
  const declared = [...homeHtml.matchAll(
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi,
  )]
    .map((m) => (m[0].match(/href=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean)
    .map((h) => absolutize(h, origin))
    .filter(Boolean);
  return [...new Set([...declared, ...FEED_PATHS.map((p) => `${origin}${p}`)])];
}

/**
 * Enumerate the release archive.
 * @returns {Promise<{items:Array, via:string[], indexPages:string[]}>}
 */
async function discoverArchive(origin, homeHtml, { maxReleases, cacheMs, fetchPage }) {
  const found = new Map();
  const via = [];
  const indexPages = [];
  let sitemapWorked = false;
  let indexPathWorked = false;

  const add = (item) => {
    if (!item?.url) return;
    const clean = item.url.split('#')[0];
    if (found.has(clean)) {
      // Keep whichever pass supplied a date.
      const prev = found.get(clean);
      found.set(clean, { ...prev, date: prev.date || item.date, title: prev.title || item.title });
      return;
    }
    found.set(clean, { ...item, url: clean });
  };

  // 1. Feeds — dated and unambiguous.
  for (const feedUrl of feedCandidates(origin, homeHtml)) {
    if (found.size >= maxReleases) break;
    const xml = await fetchPage(feedUrl, { silent: true });
    if (!xml || !/<(rss|feed|channel)\b/i.test(xml)) continue;
    const items = parseFeed(xml, origin);
    if (items.length) {
      via.push(`feed:${feedUrl}`);
      items.forEach(add);
      break; // one working feed is enough; the rest are usually the same content
    }
  }

  // 2. Sitemaps — the only complete source. Follow one level of sitemap index.
  const sitemapQueue = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/news-sitemap.xml`];
  const seenSitemaps = new Set();
  while (sitemapQueue.length && found.size < maxReleases) {
    const sm = sitemapQueue.shift();
    if (seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);

    const xml = await fetchPage(sm, { silent: true });
    if (!xml || !/<(urlset|sitemapindex)\b/i.test(xml)) continue;

    const locs = parseXmlLocs(xml);
    if (/<sitemapindex\b/i.test(xml)) {
      for (const loc of locs) {
        // Only descend into sitemaps that plausibly hold news.
        if (seenSitemaps.size < 12 && (RELEASE_URL_RE.test(loc) || /sitemap/i.test(loc))) sitemapQueue.push(loc);
      }
      continue;
    }

    let hits = 0;
    for (const loc of locs) {
      if (found.size >= maxReleases) break;
      try {
        if (new URL(loc).origin !== origin) continue;
      } catch { continue; }
      if (!RELEASE_URL_RE.test(loc) || INDEX_URL_RE.test(loc)) continue;
      add({ url: loc, via: 'sitemap' });
      hits += 1;
    }
    if (hits) { via.push(`sitemap:${sm}`); sitemapWorked = true; }
  }

  // 3. Paginated index pages -- the fallback, and only that. A sitemap is
  // authoritative for completeness, so once one has answered there is nothing
  // for this pass to add and crawling ten candidate paths against someone
  // else's server would be pure waste.
  if (!sitemapWorked && found.size < maxReleases) {
    for (const path of INDEX_PATHS) {
      if (found.size >= maxReleases || indexPathWorked) break;

      for (let page = 1; page <= 15 && found.size < maxReleases; page += 1) {
        const variants = page === 1
          ? [`${origin}${path}`]
          : [`${origin}${path}?page=${page}`, `${origin}${path}/page/${page}/`];

        let added = 0;
        for (const url of variants) {
          const html = await fetchPage(url, { silent: true });
          if (!html) continue;
          indexPages.push(url);
          for (const l of links(html, url)) {
            try {
              if (new URL(l.url).origin !== origin) continue;
            } catch { continue; }
            const clean = l.url.split('#')[0];
            if (!RELEASE_URL_RE.test(clean) || INDEX_URL_RE.test(clean)) continue;
            if (clean === url || found.has(clean)) continue;
            add({ url: clean, title: l.text || null, via: 'index' });
            added += 1;
          }
          if (added) break; // this variant worked; don't try the other shape
        }

        // A first page that yields nothing means this path is not the archive.
        // Walking its remaining 14 pages would cost ~28 requests for nothing.
        if (!added) break;

        indexPathWorked = true;
        if (!via.includes(`index:${path}`)) via.push(`index:${path}`);
      }
    }
  }

  return { items: [...found.values()].slice(0, maxReleases), via, indexPages };
}

// ── one release ──────────────────────────────────────────────────────────────

/** Fetch and parse a single release page. */
async function readRelease(url, known, fetchPage) {
  const html = await fetchPage(url);
  if (!html) return null;

  const text = toText(html);
  // Index and category pages slip through URL matching; real releases have prose.
  if (text.length < 400) return null;

  const footer = text.slice(-2200);
  const quotes = extractQuotes(text);

  return {
    url,
    title: known?.title || releaseTitle(html, text),
    date: known?.date || publishedDate(html, text),
    chars: text.length,
    newswires: detectNewswire(text),
    agencies: findAgencies(footer),
    footerEmails: [...new Set((footer.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || []).map((e) => e.toLowerCase()))].slice(0, 6),
    quotes,
    undervaluedQuote: quotes.find((q) => UNDERVALUED_RE.test(q.quote))
      || (UNDERVALUED_RE.test(text) ? { quote: (text.match(new RegExp(`[^.]{0,160}${UNDERVALUED_RE.source}[^.]{0,160}\\.`, 'i')) || [''])[0].trim(), speaker: null } : null),
    isFinancing: FINANCING_RE.test(text),
    isIrHire: IR_HIRE_RE.test(text),
    isCatalyst: CATALYST_RE.test(text),
  };
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Scan a company's full press-release archive.
 *
 * @param {string} website
 * @param {object} [opts]
 * @param {number} [opts.maxReleases] hard cap on releases read (default 120)
 * @param {number} [opts.cacheMs]
 * @returns {Promise<object>} never throws for ordinary site errors
 */
export async function scanReleases(website, { maxReleases = 120, cacheMs = 7 * 86400e3, concurrency = 3 } = {}) {
  const started = Date.now();
  const result = {
    website: null,
    reachable: false,
    discoveredVia: [],
    discovered: 0,
    releases: [],
    error: null,
    scannedAt: new Date().toISOString(),
  };

  let origin;
  try {
    const u = new URL(/^https?:/i.test(website) ? website : `https://${website}`);
    origin = u.origin;
    result.website = origin;
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

  let fetched = 0;
  const fetchPage = async (url, { silent = false } = {}) => {
    try {
      if (disallowed(new URL(url).pathname)) return null;
    } catch { return null; }
    try {
      fetched += 1;
      return await get(url, { cacheMs, retries: silent ? 0 : 1, timeoutMs: 15000, allow404: true });
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

  const archive = await discoverArchive(origin, home, { maxReleases, cacheMs, fetchPage });
  result.discoveredVia = archive.via;
  result.discovered = archive.items.length;

  // Read the archive newest-first where dates are known, so a capped run keeps
  // the releases that actually matter.
  const ordered = [...archive.items].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, ordered.length) }, async () => {
    for (;;) {
      const i = index++;
      if (i >= ordered.length) return;
      const rel = await readRelease(ordered[i].url, ordered[i], fetchPage);
      if (rel) result.releases.push(rel);
    }
  });
  await Promise.all(workers);

  result.releases.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  result.pagesFetched = fetched;
  result.durationMs = Date.now() - started;
  return result;
}

/**
 * Turn an archive into qualification signals.
 *
 * `bars` is the daily price history from Yahoo. Joining release dates against
 * it produces the sheet's "News No Reaction" test: a company whose own
 * announcements move neither price nor volume is not being heard, which is the
 * clearest possible argument for the service.
 */
export function deriveReleaseSignals(scan, bars = null) {
  if (!scan?.reachable || !scan.releases?.length) {
    return { releaseCount: 0, hasReleaseArchive: false };
  }
  const releases = scan.releases;
  const dated = releases.filter((r) => r.date);
  const now = Date.now();
  const within = (r, days) => r.date && now - Date.parse(r.date) < days * 86400e3;

  // Cadence over the trailing year.
  const lastYear = dated.filter((r) => within(r, 365));
  const last90 = dated.filter((r) => within(r, 90));

  // Incumbent agency: a name in a release footer is the strongest evidence
  // there is, and we can cite the release it came from.
  const agencyCounts = new Map();
  for (const r of releases) {
    for (const a of r.agencies || []) {
      if (!agencyCounts.has(a)) agencyCounts.set(a, { name: a, count: 0, latest: null, url: null });
      const e = agencyCounts.get(a);
      e.count += 1;
      if (!e.latest || String(r.date || '') > e.latest) { e.latest = r.date; e.url = r.url; }
    }
  }
  const agencies = [...agencyCounts.values()].sort((a, b) => b.count - a.count);

  const wireCounts = new Map();
  for (const r of releases) for (const w of r.newswires || []) wireCounts.set(w, (wireCounts.get(w) || 0) + 1);
  const newswires = [...wireCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const financings = dated.filter((r) => r.isFinancing);
  const irHires = releases.filter((r) => r.isIrHire);
  const catalysts = dated.filter((r) => r.isCatalyst);
  const undervalued = releases.find((r) => r.undervaluedQuote);

  // News, no reaction.
  let reaction = null;
  if (bars?.length && dated.length) {
    const byDate = new Map(bars.map((b, i) => [b.date, i]));
    const vols = bars.map((b) => b.volume).sort((a, b) => a - b);
    const medVol = vols[vols.length >> 1] || 0;

    const measured = [];
    for (const r of dated) {
      // Use the release date's bar, or the next trading day if it landed on a
      // weekend or outside market hours.
      let idx = byDate.get(r.date);
      if (idx == null) {
        const next = bars.findIndex((b) => b.date > r.date);
        idx = next > 0 ? next : -1;
      }
      if (idx == null || idx <= 0) continue;
      const move = (bars[idx].close - bars[idx - 1].close) / bars[idx - 1].close;
      measured.push({
        date: r.date,
        url: r.url,
        title: r.title,
        priceMove: move,
        volumeRatio: medVol ? bars[idx].volume / medVol : null,
      });
    }

    if (measured.length >= 3) {
      const flat = measured.filter((m) => Math.abs(m.priceMove) < 0.03 && (m.volumeRatio ?? 0) < 2);
      reaction = {
        measured: measured.length,
        flat: flat.length,
        flatShare: flat.length / measured.length,
        medianAbsMove: [...measured].map((m) => Math.abs(m.priceMove)).sort((a, b) => a - b)[measured.length >> 1],
        samples: measured.slice(0, 8),
      };
    }
  }

  return {
    hasReleaseArchive: true,
    releaseCount: releases.length,
    releasesLast12m: lastYear.length,
    releasesLast90d: last90.length,
    latestRelease: dated[0]?.date || null,
    latestReleaseTitle: dated[0]?.title || null,
    releaseNewswires: newswires,
    primaryNewswire: newswires[0]?.name || null,
    releaseAgencies: agencies,
    // A footer name that recurs is the agency of record, not a one-off mention.
    footerVerifiedAgency: agencies.find((a) => a.count >= 2)?.name || agencies[0]?.name || null,
    footerVerifiedAgencyUrl: agencies[0]?.url || null,
    releaseIrEmails: [...new Set(releases.flatMap((r) => r.footerEmails || []))]
      .filter((e) => /^(ir|investor|investors|investorrelations|info|contact)@/i.test(e))
      .slice(0, 5),
    financingCount12m: financings.filter((r) => within(r, 365)).length,
    latestFinancing: financings[0] ? { date: financings[0].date, title: financings[0].title, url: financings[0].url } : null,
    irHireAnnouncement: irHires[0] ? { date: irHires[0].date, title: irHires[0].title, url: irHires[0].url } : null,
    catalystCount12m: catalysts.filter((r) => within(r, 365)).length,
    latestCatalyst: catalysts[0] ? { date: catalysts[0].date, title: catalysts[0].title, url: catalysts[0].url } : null,
    undervaluedQuote: undervalued
      ? { ...undervalued.undervaluedQuote, url: undervalued.url, date: undervalued.date }
      : null,
    newsReaction: reaction,
  };
}

export const meta = {
  id: 'releases',
  label: 'Company press-release archive',
  newswires: NEWSWIRES.length,
  agencies: AGENCIES.length,
};
