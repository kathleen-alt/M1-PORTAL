// TSX Venture Exchange (and optionally TSX) via TMX's company directory.
//
// TMX backs its public company-directory page with a JSON endpoint keyed by
// first letter, so a full universe is 36 paged calls rather than a scrape.

import { getJson, readOverride, parseCsv } from '../http.js';

const BASE = process.env.TMX_DIRECTORY_BASE || 'https://www.tsx.com/json/company-directory/search';
const LETTERS = '0ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function fromCsv(text, exchange) {
  return parseCsv(text)
    .map((r) => ({
      symbol: (r['Root Ticker'] || r.Symbol || r.symbol || r.Ticker || '').trim().toUpperCase(),
      name: (r.Name || r['Company Name'] || r.companyName || '').trim(),
      exchange,
      tier: (r.Tier || '').trim() || null,
      sectorHint: (r.Sector || r['HQ Sector'] || '').trim() || null,
      country: 'CA',
      source: 'tmx-csv',
    }))
    .filter((r) => r.symbol && r.name);
}

/**
 * @param {object} [opts]
 * @param {'tsxv'|'tsx'} [opts.venue]
 */
export async function fetchUniverse({ venue = 'tsxv' } = {}) {
  const exchange = venue === 'tsx' ? 'TSX' : 'TSXV';

  const override = await readOverride(`${venue}.csv`);
  if (override) return fromCsv(override, exchange);

  const seen = new Map();
  const failures = [];

  for (const letter of LETTERS) {
    let data;
    try {
      data = await getJson(`${BASE}/${venue}/${letter}`, {
        cacheMs: 24 * 3600e3,
        headers: { Referer: 'https://www.tsx.com/listings/listing-with-us/listed-company-directory' },
      });
    } catch (err) {
      // One bad letter must not fail the sweep, but every letter failing means
      // the source itself is down or blocked -- reported below rather than
      // returned as a legitimately empty exchange.
      failures.push(`${letter}: ${err.message}`);
      continue;
    }

    for (const r of data?.results || []) {
      // `instruments` holds each listed class; the parent row carries the root.
      const rows = r.instruments?.length ? r.instruments : [r];
      for (const inst of rows) {
        const symbol = String(inst.symbol || r.symbol || '').trim().toUpperCase();
        if (!symbol || seen.has(symbol)) continue;
        seen.set(symbol, {
          symbol,
          name: (inst.name || r.name || '').trim(),
          exchange,
          tier: r.tier || null,
          sectorHint: r.sector || null,
          country: 'CA',
          source: 'tmx',
        });
      }
    }
  }

  if (!seen.size && failures.length === LETTERS.length) {
    const err = new Error(
      `TMX directory unreachable for ${venue} (all ${LETTERS.length} requests failed). ` +
        `First error: ${failures[0]}. Save the directory export as ` +
        `server/data/universe/${venue}.csv to work around it.`,
    );
    err.code = 'TMX_UNAVAILABLE';
    throw err;
  }

  return [...seen.values()].filter((r) => r.name);
}

export const meta = {
  id: 'tsxv',
  label: 'TSX Venture (TMX listed-company directory)',
  url: `${BASE}/tsxv/A`,
  override: 'tsxv.csv',
};
