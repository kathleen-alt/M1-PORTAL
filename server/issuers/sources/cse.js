// Canadian Securities Exchange.
//
// The CSE publishes its listed issuers as a downloadable file and serves the
// same data to its own listings page. Endpoint shapes have moved around more
// than once, so we try the known JSON/CSV routes in order and fall back to the
// override file — `thecse.com/en/listings` has a "Download" link that produces
// exactly what `server/data/universe/cse.csv` expects.

import { get, getJson, readOverride, parseCsv } from '../http.js';

const CANDIDATES = (process.env.CSE_LISTINGS_URLS ||
  [
    'https://thecse.com/wp-content/plugins/cse-listings/api/listings.json',
    'https://api.thecse.com/api/v1/listings?per_page=5000',
    'https://thecse.com/en/listings.csv',
  ].join(',')
).split(',').map((s) => s.trim()).filter(Boolean);

function normalize(r) {
  const symbol = String(
    r.symbol ?? r.Symbol ?? r.ticker ?? r.Ticker ?? r.stock_symbol ?? r['Stock Symbol'] ?? '',
  ).trim().toUpperCase();
  const name = String(
    r.name ?? r.Name ?? r.company ?? r.Company ?? r.company_name ?? r['Company Name'] ?? r.issuer ?? '',
  ).trim();
  if (!symbol || !name) return null;
  return {
    symbol,
    name,
    exchange: 'CSE',
    tier: null,
    sectorHint: String(r.sector ?? r.Sector ?? r.industry ?? r.Industry ?? '').trim() || null,
    country: 'CA',
    source: 'cse',
  };
}

/** Pull the first array of listing-shaped objects out of an unknown JSON envelope. */
function firstRecordArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['results', 'data', 'listings', 'records', 'items', 'companies']) {
    if (Array.isArray(data[key])) return data[key];
  }
  const nested = Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
  return nested || [];
}

export async function fetchUniverse() {
  const override = await readOverride('cse.csv');
  if (override) return parseCsv(override).map(normalize).filter(Boolean);

  const errors = [];
  for (const url of CANDIDATES) {
    try {
      const rows = url.endsWith('.csv')
        ? parseCsv(await get(url, { cacheMs: 24 * 3600e3 }))
        : firstRecordArray(await getJson(url, { cacheMs: 24 * 3600e3 }));
      const mapped = rows.map(normalize).filter(Boolean);
      if (mapped.length) return mapped;
      errors.push(`${url}: parsed 0 rows`);
    } catch (err) {
      errors.push(`${url}: ${err.message}`);
    }
  }

  const err = new Error(
    `No CSE listing source responded. Tried:\n  ${errors.join('\n  ')}\n` +
      'Download the listings file from https://thecse.com/en/listings and save it as ' +
      'server/data/universe/cse.csv, or set CSE_LISTINGS_URLS.',
  );
  err.code = 'CSE_UNAVAILABLE';
  throw err;
}

export const meta = {
  id: 'cse',
  label: 'Canadian Securities Exchange (listings)',
  url: CANDIDATES[0],
  override: 'cse.csv',
};
