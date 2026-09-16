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
