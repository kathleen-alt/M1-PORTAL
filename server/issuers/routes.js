// Issuer intelligence API.
//
//   GET  /api/issuers                filter / search / sort / paginate
//   GET  /api/issuers/facets         filter options + ranges for the UI rail
//   GET  /api/issuers/export.csv     the current query as the POC's CSV layout
//   GET  /api/issuers/model          the scoring model, for the "why" panel
//   GET  /api/issuers/sources        source health + what is held
//   GET  /api/issuers/:key           one issuer, full record
//   POST /api/issuers/refresh        run a pipeline stage
//   POST /api/issuers/:key/scan      re-scan one company on demand

import express from 'express';
import * as store from './store.js';
import * as pipeline from './pipeline.js';
import { toCsv, toRow } from './normalize.js';
import { TEST_META, CAP_BANDS, MIN_COVERAGE, ELIGIBILITY, serviceTier, hasReachableContact, SERVICE } from './score.js';
import * as clients from './clients.js';

export const router = express.Router();

// A refresh can run for minutes; keep one in flight at a time and let callers
// poll rather than stacking concurrent sweeps over the same store.
let running = null;

const numOr = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const listParam = (v) => (v == null || v === '' ? null : String(v).split(',').map((s) => s.trim()).filter(Boolean));

const SORTS = {
  score: (a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1),
  volume: (a, b) => (a.avgDollarVolume3m ?? Infinity) - (b.avgDollarVolume3m ?? Infinity),
  marketCap: (a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1),
  drawdown: (a, b) => (a.drawdownPct ?? 1) - (b.drawdownPct ?? 1),
  watchers: (a, b) => (b.watchers ?? -1) - (a.watchers ?? -1),
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  updated: (a, b) => String(b.marketDataAt || '').localeCompare(String(a.marketDataAt || '')),
  releases: (a, b) => (b.releaseCount ?? -1) - (a.releaseCount ?? -1),
  noReaction: (a, b) => (b.newsReaction?.flatShare ?? -1) - (a.newsReaction?.flatShare ?? -1),
  lastRelease: (a, b) => String(b.latestRelease || '').localeCompare(String(a.latestRelease || '')),
  package: (a, b) => String(serviceTier(a).tier).localeCompare(String(serviceTier(b).tier)),
  // Reachable first, then richest contact: a named person with an email beats a
  // phone-only record, which beats nothing.
  contact: (a, b) => contactRank(b) - contactRank(a),
  closedRaise: (a, b) => String(latestClosed(b) || '').localeCompare(String(latestClosed(a) || '')),
};

const latestClosed = (it) => (it.closedFinancings || [])
  .map((f) => f.date).filter(Boolean).sort().pop() || null;

function contactRank(it) {
  const c = it.apolloPrimary || (it.apolloContacts || [])[0];
  if (!c) return 0;
  let n = 1;
  if (c.name) n += 1;
  if (c.linkedin) n += 1;
  if (c.phone) n += 2;
  if (c.email) n += 4;
  if (c.role === 'investor relations') n += 2;
  else if (c.role === 'corporate communications') n += 1;
  return n;
}

/** Apply every filter in the query string to the held universe. */
function applyFilters(issuers, q) {
  const exchanges = listParam(q.exchange);
  const sectors = listParam(q.sector);
  const tiers = listParam(q.tier);
  const bands = listParam(q.capBand);
  const posture = listParam(q.irPosture);

  const search = (q.q || '').trim().toLowerCase();
  const minScore = q.minScore != null ? numOr(q.minScore, null) : null;
  const maxVolume = q.maxVolume != null ? numOr(q.maxVolume, null) : null;
  const minCap = q.minCap != null ? numOr(q.minCap, null) : null;
  const maxCap = q.maxCap != null ? numOr(q.maxCap, null) : null;
  const minDrawdown = q.minDrawdown != null ? numOr(q.minDrawdown, null) : null; // e.g. 0.4 = at least 40% off high
  const minWatchers = q.minWatchers != null ? numOr(q.minWatchers, null) : null;
  const noAgency = q.noAgency === '1' || q.noAgency === 'true';
  const hasQuote = q.hasQuote === '1' || q.hasQuote === 'true';
  const recentRaise = q.recentRaise === '1' || q.recentRaise === 'true';
  const noReaction = q.noReaction === '1' || q.noReaction === 'true';
  const hasReleases = q.hasReleases === '1' || q.hasReleases === 'true';
  const newswire = listParam(q.newswire);
  // Ineligible names are hidden unless asked for: the floors are a standing
  // rule, so they should not have to be re-applied on every query.
  const includeIneligible = q.includeIneligible === '1' || q.includeIneligible === 'true';
  const hasContact = q.hasContact === '1' || q.hasContact === 'true';
  const enrichedOnly = q.enriched === '1' || q.enriched === 'true';
  const excludeProvisional = q.verified === '1' || q.verified === 'true';

  const packages = listParam(q.package);              // full-package | supplement
  const roles = listParam(q.contactRole);             // investor relations | corporate communications | chief executive
  const reachableOnly = q.reachable === '1' || q.reachable === 'true';
  const closedRaiseOnly = q.closedRaise === '1' || q.closedRaise === 'true';
  const noSocialOnly = q.noSocial === '1' || q.noSocial === 'true';
  const hasEmailOnly = q.hasEmail === '1' || q.hasEmail === 'true';
  // Clients are hidden by default: the mandate is already taken.
  const includeClients = q.includeClients === '1' || q.includeClients === 'true';

  return issuers.filter((it) => {
    if (exchanges && !exchanges.includes(it.exchange)) return false;
    if (sectors && !sectors.includes(it.sectorGroup)) return false;
    if (tiers && !tiers.includes(it.fit?.tier)) return false;
    if (bands && !bands.includes(it.capBand)) return false;
    if (posture && !posture.includes(it.irPosture)) return false;

    if (minScore != null && (it.fit?.score ?? -1) < minScore) return false;
    if (maxVolume != null && !(it.avgDollarVolume3m != null && it.avgDollarVolume3m <= maxVolume)) return false;
    if (minCap != null && !(it.marketCap != null && it.marketCap >= minCap)) return false;
    if (maxCap != null && !(it.marketCap != null && it.marketCap <= maxCap)) return false;
    if (minDrawdown != null && !(it.drawdownPct != null && it.drawdownPct <= -minDrawdown)) return false;
    if (minWatchers != null && !(it.watchers != null && it.watchers >= minWatchers)) return false;

    if (!includeIneligible && it.fit && it.fit.eligible === false) return false;

    if (noAgency && it.hasIncumbentAgency !== false) return false;
    if (hasQuote && !it.undervaluedQuote?.quote) return false;
    if (recentRaise && !it.latestFinancing?.date) return false;
    if (noReaction && !(it.newsReaction && it.newsReaction.flatShare >= 0.6)) return false;
    if (hasReleases && !it.releaseCount) return false;
    if (newswire && !newswire.includes(it.primaryNewswire)) return false;
    if (hasContact && !(it.irEmail || it.linkedin)) return false;

    if (!includeClients && it.isClient) return false;
    if (packages && !packages.includes(serviceTier(it).tier)) return false;
    if (reachableOnly && !(it.apolloAt && hasReachableContact(it))) return false;
    if (roles) {
      const have = (it.apolloContacts || []).map((c) => c && c.role).filter(Boolean);
      if (!have.some((r) => roles.includes(r))) return false;
    }
    if (hasEmailOnly && !(it.apolloContacts || []).some((c) => c && c.email)) return false;
    if (closedRaiseOnly && !(it.closedFinancings || []).length) return false;
    if (noSocialOnly) {
      const s2 = it.social;
      if (!s2?.scannedAt || s2.linkedin || s2.x || s2.youtube) return false;
    }
    if (enrichedOnly && !it.marketDataAt) return false;
    if (excludeProvisional && it.fit?.provisional !== false) return false;

    if (search) {
      const hay = `${it.symbol} ${it.name} ${it.sectorLabel || ''} ${it.industry || ''} ${it.summary || ''} ${it.website || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

router.get('/issuers', async (req, res) => {
  try {
    const all = await clients.tag(await store.all());
    const filtered = applyFilters(all, req.query);
    const sort = SORTS[req.query.sort] || SORTS.score;
    filtered.sort(sort);

    const page = Math.max(1, numOr(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, numOr(req.query.pageSize, 50)));
    const start = (page - 1) * pageSize;

    res.json({
      total: filtered.length,
      universeTotal: all.length,
      page,
      pageSize,
      issuers: filtered.slice(start, start + pageSize).map(toRow),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/issuers/facets', async (_req, res) => {
  try {
    const all = await clients.tag(await store.all());
    const roster = await clients.load();
    const count = (key) => {
      const out = {};
      for (const it of all) {
        const v = typeof key === 'function' ? key(it) : it[key];
        if (v == null) continue;
        out[v] = (out[v] || 0) + 1;
      }
      return out;
    };
    res.json({
      total: all.length,
      exchanges: count('exchange'),
      sectors: count((it) => it.sectorGroup),
      sectorLabels: Object.fromEntries(all.filter((i) => i.sectorGroup).map((i) => [i.sectorGroup, i.sectorLabel])),
      tiers: count((it) => it.fit?.tier),
      capBands: count('capBand'),
      irPostures: count('irPosture'),
      newswires: count('primaryNewswire'),
      eligibility: {
        ...ELIGIBILITY,
        eligible: all.filter((i) => i.fit?.eligible === true && !i.fit?.eligibilityUnknown).length,
        ineligible: all.filter((i) => i.fit?.eligible === false).length,
        unknown: all.filter((i) => i.fit?.eligibilityUnknown).length,
      },
      releaseCoverage: {
        scanned: all.filter((i) => i.releaseScanAt).length,
        withArchive: all.filter((i) => i.releaseCount).length,
        withQuote: all.filter((i) => i.undervaluedQuote?.quote).length,
        withRecentRaise: all.filter((i) => i.latestFinancing?.date).length,
      },
      // Which engagement each issuer fits, and whether anyone is callable.
      packages: count((it) => serviceTier(it).tier === 'unknown' ? null : serviceTier(it).tier),
      serviceThresholds: SERVICE,
      contactRoles: count((it) => (it.apolloPrimary || (it.apolloContacts || [])[0] || {}).role),
      contactCoverage: {
        searched: all.filter((i) => i.apolloAt).length,
        reachable: all.filter((i) => i.apolloAt && hasReachableContact(i)).length,
        // Searched, but nobody in investor relations, communications or the
        // chief executive seat — disqualified by the reachability floor.
        unreachable: all.filter((i) => i.apolloAt && !hasReachableContact(i)).length,
        withEmail: all.filter((i) => (i.apolloContacts || []).some((c) => c && c.email)).length,
        withPhone: all.filter((i) => (i.apolloContacts || []).some((c) => c && c.phone)).length,
        notSearched: all.filter((i) => !i.apolloAt).length,
      },
      clients: {
        roster: roster.rows.length,
        unresolved: roster.rows.filter((r) => !r.resolved).map((r) => r.company),
        matched: all.filter((i) => i.isClient).length,
        file: roster.loadedFrom,
      },
      raises: {
        withClosed: all.filter((i) => (i.closedFinancings || []).length).length,
      },
      social: {
        scanned: all.filter((i) => i.social?.scannedAt).length,
        none: all.filter((i) => i.social?.scannedAt && !(i.social.linkedin || i.social.x || i.social.youtube)).length,
      },
      bandMeta: CAP_BANDS,
      stats: await store.stats(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/issuers/export.csv', async (req, res) => {
  try {
    const all = await clients.tag(await store.all());
    const rows = applyFilters(all, req.query).sort(SORTS[req.query.sort] || SORTS.score);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="market-one-prospects-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(toCsv(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/issuers/model', (_req, res) => {
  res.json({ tests: TEST_META, minCoverage: MIN_COVERAGE, eligibility: ELIGIBILITY });
});

router.get('/issuers/sources', async (req, res) => {
  try {
    const held = await store.stats();
    // Probing every upstream takes real time, so it is opt-in.
    if (req.query.probe === '1') {
      const health = await pipeline.checkSources();
      return res.json({ held, ...health, running: Boolean(running) });
    }
    res.json({ held, venues: Object.keys(pipeline.VENUES), running: Boolean(running) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Must come after the literal routes above so "facets" is not read as a key.
router.get('/issuers/:key', async (req, res) => {
  try {
    const it = await store.get(decodeURIComponent(req.params.key));
    if (!it) return res.status(404).json({ error: 'Unknown issuer' });
    res.json(toRow(it));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/issuers/refresh', async (req, res) => {
  if (running) return res.status(409).json({ error: 'A refresh is already running', stage: running });

  const { stage = 'all', venues, limit } = req.body || {};
  const run = async () => {
    switch (stage) {
      case 'universe': return pipeline.refreshUniverse({ venues });
      case 'enrich': return pipeline.enrich({ limit: limit ?? 200 });
      case 'scan': return pipeline.scanSites({ limit: limit ?? 50 });
      case 'releases': return pipeline.scanReleaseArchives({ limit: limit ?? 25 });
      case 'score': return pipeline.rescore();
      default: return pipeline.runAll({ venues, enrichLimit: limit ?? 200, scanLimit: 50, verbose: false });
    }
  };

  running = stage;
  try {
    const result = await run();
    res.json({ stage, result, stats: await store.stats() });
  } catch (err) {
    res.status(502).json({ stage, error: err.message });
  } finally {
    running = null;
  }
});

router.post('/issuers/:key/scan', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const it = await store.get(key);
    if (!it) return res.status(404).json({ error: 'Unknown issuer' });

    await pipeline.enrich({ keys: [key], limit: 1 });
    if ((await store.get(key))?.website) {
      await pipeline.scanSites({ keys: [key], limit: 1 });
      await pipeline.scanReleaseArchives({ keys: [key], limit: 1 });
    }
    await pipeline.rescore();

    res.json(toRow(await store.get(key)));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});
