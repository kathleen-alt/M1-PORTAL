// Pipeline: universe -> market data -> awareness -> site scan -> score.
//
// Each stage is separately runnable. A full four-venue universe is tens of
// thousands of names, and enriching all of them costs hours of polite
// rate-limited requests, so the normal working pattern is:
//
//   1. `universe` once a day        — cheap, a handful of requests
//   2. `enrich` on a filtered slice — the candidates worth paying for
//   3. `scan` on the survivors      — the most expensive stage per company
//   4. `score` over everything held
//
// Stages never throw for a single bad record; failures are counted and
// attached to the record so a sweep of 20,000 names is not lost to one 500.

import * as nasdaq from './sources/nasdaq.js';
import * as otc from './sources/otc.js';
import * as tsxv from './sources/tsxv.js';
import * as cse from './sources/cse.js';
import * as yahoo from './sources/yahoo.js';
import * as stocktwits from './sources/stocktwits.js';
import * as site from './sources/site.js';
import * as store from './store.js';
import { fromUniverse, applyMarketData, applyAwareness, applySiteScan } from './normalize.js';
import { scoreAll } from './score.js';

export const VENUES = {
  NASDAQ: { load: (o) => nasdaq.fetchUniverse(o), meta: nasdaq.meta },
  NYSE: { load: () => nasdaq.fetchUniverse({ includeNyse: true }), meta: nasdaq.meta },
  OTC: { load: (o) => otc.fetchUniverse(o), meta: otc.meta },
  TSXV: { load: (o) => tsxv.fetchUniverse({ ...o, venue: 'tsxv' }), meta: tsxv.meta },
  TSX: { load: (o) => tsxv.fetchUniverse({ ...o, venue: 'tsx' }), meta: tsxv.meta },
  CSE: { load: (o) => cse.fetchUniverse(o), meta: cse.meta },
};

export const DEFAULT_VENUES = ['NASDAQ', 'OTC', 'TSXV', 'CSE'];

const log = (on, ...args) => { if (on) console.log(...args); };

/** Run `worker` over `items` with bounded concurrency, reporting progress. */
async function pool(items, limit, worker, onProgress) {
  const results = [];
  let index = 0;
  let done = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = index++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err.message };
      }
      done += 1;
      if (onProgress && done % 25 === 0) onProgress(done, items.length);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Stage 1 — pull the listed-company universe for each venue.
 * Venue failures are isolated: a blocked CSE endpoint still leaves you NASDAQ.
 */
export async function refreshUniverse({ venues = DEFAULT_VENUES, verbose = false, otcTiers } = {}) {
  const summary = { venues: {}, added: 0, errors: [] };
  const records = [];

  for (const venue of venues) {
    const entry = VENUES[venue];
    if (!entry) {
      summary.errors.push({ venue, error: 'unknown venue' });
      continue;
    }
    try {
      log(verbose, `· ${venue}: fetching universe…`);
      const rows = await entry.load(venue === 'OTC' && otcTiers ? { tiers: otcTiers } : {});
      const mapped = rows.filter((r) => r.symbol && r.name).map(fromUniverse);
      records.push(...mapped);
      summary.venues[venue] = mapped.length;
      log(verbose, `  ${venue}: ${mapped.length} issuers`);
    } catch (err) {
      summary.venues[venue] = 0;
      summary.errors.push({ venue, error: err.message });
      log(verbose, `  ${venue}: FAILED — ${err.message.split('\n')[0]}`);
    }
  }

  summary.added = await store.upsertMany(records);
  await store.logRun({ stage: 'universe', ...summary });
  await store.save();
  return summary;
}

/** Stage 2 — Yahoo fundamentals + price history, then StockTwits watchers. */
export async function enrich({ keys = null, limit = 500, concurrency = 4, verbose = false, skipAwareness = false } = {}) {
  const held = await store.all();
  const targets = (keys ? held.filter((i) => keys.includes(i.key)) : held.filter((i) => !i.marketDataAt)).slice(0, limit);

  log(verbose, `· enriching ${targets.length} issuers…`);
  const summary = { attempted: targets.length, enriched: 0, awareness: 0, missing: 0, failed: 0 };

  const out = await pool(
    targets,
    concurrency,
    async (it) => {
      let rec = it;
      try {
        const [quote, history] = await Promise.all([
          yahoo.fetchQuoteSummary(it.yahooSymbol),
          yahoo.fetchHistory(it.yahooSymbol).catch(() => null),
        ]);
        if (!quote) {
          summary.missing += 1;
          return { ...rec, marketDataError: 'no Yahoo match', marketDataCheckedAt: new Date().toISOString() };
        }
        rec = applyMarketData(rec, quote, yahoo.deriveHistorySignals(history));
        summary.enriched += 1;
      } catch (err) {
        summary.failed += 1;
        return { ...rec, marketDataError: err.message, marketDataCheckedAt: new Date().toISOString() };
      }

      if (!skipAwareness) {
        try {
          const aw = await stocktwits.fetchAwareness(rec.stocktwitsSymbol);
          if (aw) { rec = applyAwareness(rec, aw); summary.awareness += 1; }
        } catch { /* awareness is optional */ }
      }
      return rec;
    },
    (done, total) => log(verbose, `  ${done}/${total}`),
  );

  await store.upsertMany(out.filter((r) => r && r.key));
  await store.logRun({ stage: 'enrich', ...summary });
  await store.save();
  return summary;
}

/** Stage 3 — crawl company websites for IR posture. */
export async function scanSites({ keys = null, limit = 100, concurrency = 3, verbose = false } = {}) {
  const held = await store.all();
  const targets = (keys ? held.filter((i) => keys.includes(i.key)) : held.filter((i) => i.website && !i.siteScanAt))
    .filter((i) => i.website)
    .slice(0, limit);

  log(verbose, `· scanning ${targets.length} websites…`);
  const summary = { attempted: targets.length, reachable: 0, agencyFound: 0, irContactFound: 0 };

  const out = await pool(
    targets,
    concurrency,
    async (it) => {
      const scan = await site.scanSite(it.website);
      const signals = site.deriveSiteSignals(scan);
      if (scan.reachable) summary.reachable += 1;
      if (signals.hasIncumbentAgency) summary.agencyFound += 1;
      if (signals.irEmail) summary.irContactFound += 1;
      return applySiteScan(it, scan, signals);
    },
    (done, total) => log(verbose, `  ${done}/${total}`),
  );

  await store.upsertMany(out.filter((r) => r && r.key));
  await store.logRun({ stage: 'scan', ...summary });
  await store.save();
  return summary;
}

/**
 * Stage 4 — score everything held.
 * Peer medians come from the full held universe, so scoring after a wider
 * enrichment sweep sharpens every previous record's comparison too.
 */
export async function rescore({ verbose = false } = {}) {
  const held = await store.all();
  const scored = scoreAll(held);
  await store.upsertMany(scored);
  const tiers = {};
  for (const s of scored) tiers[s.fit.tier] = (tiers[s.fit.tier] || 0) + 1;
  log(verbose, `· scored ${scored.length}: ${JSON.stringify(tiers)}`);
  await store.logRun({ stage: 'score', scored: scored.length, tiers });
  await store.save();
  return { scored: scored.length, tiers };
}

/** Probe every source and report what actually answers from this network. */
export async function checkSources() {
  const checks = [];
  // A probe passes only when it returns evidence. Sources that degrade quietly
  // (a per-letter sweep that caught every error, a scanner that reports an
  // unreachable host) would otherwise show green while returning nothing.
  const probe = async (id, label, fn) => {
    const t = Date.now();
    try {
      const detail = await fn();
      checks.push({ id, label, ok: true, ms: Date.now() - t, detail });
    } catch (err) {
      checks.push({ id, label, ok: false, ms: Date.now() - t, error: err.message.split('\n')[0] });
    }
  };

  /** Throw unless the source returned at least one record. */
  const expectRows = (rows, describe) => {
    if (!rows?.length) throw new Error('source responded with 0 records');
    return describe(rows);
  };

  await probe('nasdaq', nasdaq.meta.label, async () =>
    expectRows(await nasdaq.fetchUniverse(), (r) => `${r.length} symbols`));
  await probe('otc', otc.meta.label, async () =>
    expectRows(await otc.fetchUniverse({ maxPages: 1 }), (r) => `${r.length} symbols (1 page)`));
  await probe('tsxv', tsxv.meta.label, async () =>
    expectRows(await tsxv.fetchUniverse(), (r) => `${r.length} symbols`));
  await probe('cse', cse.meta.label, async () =>
    expectRows(await cse.fetchUniverse(), (r) => `${r.length} symbols`));
  await probe('yahoo', yahoo.meta.label, async () => {
    const q = await yahoo.fetchQuoteSummary('AAPL', { cacheMs: 0 });
    if (!q?.price) throw new Error('no price returned for AAPL');
    return `AAPL price ${q.price} ${q.currency}`;
  });
  await probe('stocktwits', stocktwits.meta.label, async () => {
    const a = await stocktwits.fetchAwareness('AAPL', { cacheMs: 0 });
    if (!a) throw new Error('rate-limited or unavailable');
    return `AAPL watchers ${a.watchers}`;
  });
  await probe('site', site.meta.label, async () => {
    const s = await site.scanSite('https://www.apple.com', { maxPages: 2, cacheMs: 0 });
    if (!s.reachable) throw new Error(s.error || 'unreachable');
    return `scanned ${s.pagesScanned.length} pages`;
  });

  return { checkedAt: new Date().toISOString(), checks };
}

/** Convenience: the whole chain, scoped to a manageable slice. */
export async function runAll({ venues = DEFAULT_VENUES, enrichLimit = 500, scanLimit = 100, verbose = true } = {}) {
  const universe = await refreshUniverse({ venues, verbose });
  const enriched = await enrich({ limit: enrichLimit, verbose });
  const scanned = await scanSites({ limit: scanLimit, verbose });
  const scored = await rescore({ verbose });
  return { universe, enriched, scanned, scored };
}
