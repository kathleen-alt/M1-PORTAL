#!/usr/bin/env node
// Issuer pipeline CLI.
//
//   npm run issuers:check                          which sources answer from here
//   npm run issuers:universe -- --venues NASDAQ,CSE
//   npm run issuers:enrich   -- --limit 500
//   npm run issuers:scan     -- --limit 100
//   npm run issuers:score
//   npm run issuers:all      -- --enrich 300 --scan 60
//   npm run issuers:stats

import 'dotenv/config';
import * as pipeline from '../issuers/pipeline.js';
import * as store from '../issuers/store.js';
import { toCsv } from '../issuers/normalize.js';

const argv = process.argv.slice(2);
const command = argv[0] || 'help';

function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const numFlag = (name, fallback) => {
  const v = flag(name);
  return v == null || v === true ? fallback : Number(v);
};

const HELP = `
Issuer intelligence pipeline

  check       Probe every data source and report what answers from this network
  universe    Refresh the listed-company universe   --venues NASDAQ,OTC,TSXV,CSE
  enrich      Yahoo fundamentals + StockTwits       --limit 500 --concurrency 4
  scan        Crawl company sites for IR posture    --limit 100 --concurrency 3
  releases    Read full press-release archives      --limit 50 --max-releases 120 --min-score 55
  contacts    Decision-maker contacts from Apollo   --limit 500 --per-company 1
              --no-reveal to search without spending credits
  campaign    One row per contact, for a mail-merge   --out campaign.csv --min-score 55 --detailed
  proposals   What we have already pitched, and when      --limit 40
              --verified-only  drop unverified addresses
              --no-catchall    drop catch-all domains
  score       Re-score every held issuer
  qualify     Two-pass sweep: score the universe on market data, then read the
              websites and full release archives of everything that qualified,
              and re-score with what that found.
              --venues NASDAQ,OTC,TSXV,CSE --enrich 2000 --min-score 45 --deep 100
  all         universe -> enrich -> scan -> releases -> score
  stats       What is currently held
  export      Write scored issuers to CSV           --out prospects.csv --min-score 55
`;

async function main() {
  switch (command) {
    case 'check': {
      const { checks } = await pipeline.checkSources();
      console.log('\nSource health\n');
      for (const c of checks) {
        console.log(`  ${c.ok ? 'OK  ' : 'FAIL'}  ${c.label.padEnd(46)} ${c.ok ? c.detail : c.error}`);
      }
      const failed = checks.filter((c) => !c.ok);
      if (failed.length) {
        console.log(
          `\n${failed.length} source(s) unreachable. If this is a network policy rather than an outage,\n` +
            'drop the exchange\'s own export into server/data/universe/ (see the README) and re-run.',
        );
      }
      console.log('');
      break;
    }
    case 'universe': {
      const venues = String(flag('venues', pipeline.DEFAULT_VENUES.join(','))).split(',').map((s) => s.trim());
      console.log(await pipeline.refreshUniverse({ venues, verbose: true }));
      break;
    }
    case 'enrich':
      console.log(await pipeline.enrich({
        limit: numFlag('limit', 500),
        concurrency: numFlag('concurrency', 4),
        skipAwareness: flag('no-awareness') === true,
        verbose: true,
      }));
      break;
    case 'releases':
      console.log(await pipeline.scanReleaseArchives({
        limit: numFlag('limit', 50),
        concurrency: numFlag('concurrency', 2),
        maxReleases: numFlag('max-releases', 120),
        minScore: flag('min-score') ? numFlag('min-score', 0) : null,
        verbose: true,
      }));
      break;
    case 'scan':
      console.log(await pipeline.scanSites({
        limit: numFlag('limit', 100),
        concurrency: numFlag('concurrency', 3),
        verbose: true,
      }));
      break;
    case 'contacts': {
      const pipeline2 = pipeline;
      console.log(await pipeline2.apolloContacts({
        limit: numFlag('limit', 500),
        maxPerCompany: numFlag('per-company', 1),
        reveal: flag('no-reveal') !== true,
        maxAgeDays: numFlag('max-age-days', 90),
        verbose: true,
      }));
      break;
    }
    case 'proposals': {
      const proposals = await import('../issuers/proposals.js');
      const clients = await import('../issuers/clients.js');
      const idx = await proposals.load();
      const all = await proposals.tag(await clients.tag(await store.all()));
      const hits = all.filter((i) => i.proposalHistory)
        .sort((a, b) => String(b.proposalHistory.lastDate || '').localeCompare(String(a.proposalHistory.lastDate || '')));
      console.log(`${idx.rows.length} documents / ${idx.byName.size} companies indexed from ${idx.loadedFrom || '(no file)'}`);
      console.log(`${hits.length} of ${all.length} held issuers have a proposal on file (${hits.filter((i) => i.isClient).length} are current clients)`);
      const limit = numFlag('limit', 40);
      for (const it of hits.slice(0, limit)) {
        const h = it.proposalHistory;
        console.log([
          String(h.lastDate || '????-??-??'),
          h.type.padEnd(8),
          `${it.exchange}:${it.symbol}`.padEnd(12),
          it.isClient ? 'CLIENT' : '      ',
          `${h.count}x`.padEnd(4),
          it.name,
        ].join('  '));
      }
      break;
    }
    case 'campaign': {
      const { toCampaignRows, toCampaignCsv, toDetailRows, toDetailCsv, DETAIL_COLUMNS } = await import('../issuers/campaign.js');
      const clients = await import('../issuers/clients.js');
      const proposals = await import('../issuers/proposals.js');
      const all = await proposals.tag(await clients.tag(await store.all()));
      const min = numFlag('min-score', 0);
      const pool = all.filter((i) => (i.fit?.score ?? -1) >= min);
      // --detailed emits every column a copywriter would otherwise come back
      // and ask for, deduplicated to one send per person. The default stays the
      // narrow mail-merge layout a sending tool expects.
      const detailed = flag('detailed') === true;
      const rows = detailed
        ? toDetailRows(pool)
        : toCampaignRows(pool, {
          verifiedOnly: flag('verified-only') === true,
          excludeCatchall: flag('no-catchall') === true,
        });
      const out = String(flag('out', detailed ? 'campaign-detailed.csv' : 'campaign.csv'));
      const { writeFile } = await import('node:fs/promises');
      await writeFile(out, detailed ? toDetailCsv(rows) : toCampaignCsv(rows));
      if (detailed) {
        await writeFile(out.replace(/\.csv$/, '.json'), JSON.stringify(rows, null, 2));
        console.log(`  ${DETAIL_COLUMNS.length} columns; JSON alongside at ${out.replace(/\.csv$/, '.json')}`);
        const unchecked = rows.filter((r) => r.nameCheck !== 'ok');
        if (unchecked.length) {
          console.log(`  ${unchecked.length} name(s) truncated by the exchange directory — fix before merging: ${unchecked.map((r) => `${r.ticker} "${r.company}"`).join(', ')}`);
        }
        const dual = rows.filter((r) => r.alsoListedAs);
        if (dual.length) console.log(`  ${dual.length} dual-listed; the duplicate send was dropped (${dual.map((r) => `${r.ticker} + ${r.alsoListedAs}`).join(', ')})`);
        const casl = rows.filter((r) => r.jurisdiction === 'Canada').length;
        if (casl) console.log(`  ${casl} Canadian recipients — CASL applies`);
      }
      const companies = new Set(rows.map((r) => r.symbol)).size;
      console.log(`Wrote ${rows.length} contacts at ${companies} companies to ${out}`);
      const risky = rows.filter((r) => r.emailRisk).length;
      if (risky) console.log(`  ${risky} are on catch-all domains — verify before sending`);
      const warm = rows.filter((r) => r.lastProposal).length;
      if (warm) console.log(`  ${warm} are at companies we have already sent paper to — see Last Proposal`);
      break;
    }
    case 'score':
      console.log(await pipeline.rescore({ verbose: true }));
      break;
    case 'qualify':
      console.log(JSON.stringify(await pipeline.qualifyAndDeepen({
        venues: flag('venues') ? String(flag('venues')).split(',').map((x) => x.trim()) : undefined,
        enrichLimit: numFlag('enrich', 2000),
        minScore: numFlag('min-score', 45),
        deepLimit: numFlag('deep', 100),
        maxReleases: numFlag('max-releases', 120),
      }), null, 2));
      break;
    case 'all':
      console.log(JSON.stringify(await pipeline.runAll({
        enrichLimit: numFlag('enrich', 300),
        scanLimit: numFlag('scan', 60),
        releaseLimit: numFlag('releases', 40),
      }), null, 2));
      break;
    case 'stats':
      console.log(JSON.stringify(await store.stats(), null, 2));
      break;
    case 'export': {
      const min = numFlag('min-score', 0);
      const rows = (await store.all())
        .filter((i) => (i.fit?.score ?? -1) >= min)
        .sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
      const out = String(flag('out', 'prospects.csv'));
      const { writeFile } = await import('node:fs/promises');
      await writeFile(out, toCsv(rows));
      console.log(`Wrote ${rows.length} issuers to ${out}`);
      break;
    }
    default:
      console.log(HELP);
  }
}

main().catch((err) => {
  console.error(`\n${err.stack || err.message}\n`);
  process.exit(1);
});
