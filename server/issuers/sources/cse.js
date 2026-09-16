// Canadian Securities Exchange.
//
// The CSE serves its listed issuers from the JSON endpoint its own listings
// page calls client-side (`/api/webapi/listed-companies/`). The directory page
// itself is no longer scrapeable: it ships a table shell and fills it in from
// that endpoint after hydration, so the HTML arrives with a header row and
// nothing else. Endpoint shapes have moved more than once, so we try the known
// JSON/CSV routes in order and fall back to the override file — the listings
// page has a "Download" link producing what `server/data/universe/cse.csv`
// expects.

import { get, getJson, readOverride, parseCsv } from '../http.js';

// Tried in order. The webapi route is what the live directory page calls; the
// rest are older shapes kept as fallbacks because the CSE has moved this
// endpoint more than once. The HTML directory stays last: it only yields rows
// if the CSE ever server-renders that table again.
const CANDIDATES = (process.env.CSE_LISTINGS_URLS ||
  [
    'https://thecse.com/api/webapi/listed-companies/',
    'https://thecse.com/wp-json/cse/v1/listings?per_page=5000',
    'https://thecse.com/wp-content/plugins/cse-listings/api/listings.json',
    'https://api.thecse.com/api/v1/listings?per_page=5000',
    'https://thecse.com/en/listings.csv',
    'https://thecse.com/listing/listed-companies/',
  ].join(',')
).split(',').map((s) => s.trim()).filter(Boolean);

// Only common equity in good standing is a prospect. The webapi feed carries a
// handful of debentures and ETFs, plus names that are suspended, halted or gone
// — matching how the NASDAQ feed drops test issues and non-equity securities.
// Both fields are absent from the CSV override shape, so each filter applies
// only when its field is actually present.
const TRADEABLE_STATUS = /^active$/i;
const EQUITY_TYPE = /^equity$/i;

function normalize(r) {
  const symbol = String(
    r.symbol ?? r.Symbol ?? r.ticker ?? r.Ticker ?? r.stock_symbol ?? r['Stock Symbol'] ?? '',
  ).trim().toUpperCase();
  const name = String(
    r.security_name ?? r['Security Name'] ??
    r.name ?? r.Name ?? r.company ?? r.Company ?? r.company_name ?? r['Company Name'] ?? r.issuer ?? '',
  ).trim();
  if (!symbol || !name) return null;

  const status = String(r.status ?? r.Status ?? '').trim();
  if (status && !TRADEABLE_STATUS.test(status)) return null;
  const type = String(r.security_type ?? r['Security Type'] ?? '').trim();
  if (type && !EQUITY_TYPE.test(type)) return null;

  const tier = r.tier ?? r.Tier ?? null;
  return {
    symbol,
    name,
    exchange: 'CSE',
    tier: tier == null || tier === '' ? null : String(tier),
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

/**
 * Read an HTML listings table into row objects.
 *
 * The public directory page renders a table rather than serving JSON, and the
 * page is frequently the only route that answers, so it is worth parsing
 * directly instead of treating an HTML response as a failure.
 */
export function parseHtmlTable(html) {
  const strip = (h) => h
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) || []) {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 2) continue;

    const header = (rows[0].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(strip);
    if (!header.some((h) => /symbol|ticker/i.test(h))) continue;

    const out = [];
    for (const r of rows.slice(1)) {
      const cells = (r.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(strip);
      if (cells.length < 2) continue;
      out.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
    }
    if (out.length) return out;
  }
  return [];
}

export async function fetchUniverse() {
  const override = await readOverride('cse.csv');
  if (override) return parseCsv(override).map(normalize).filter(Boolean);

  const errors = [];
  for (const url of CANDIDATES) {
    try {
      let rows;
      if (url.endsWith('.csv')) {
        rows = parseCsv(await get(url, { cacheMs: 24 * 3600e3 }));
      } else {
        const body = await get(url, { cacheMs: 24 * 3600e3 });
        if (/^\s*[[{]/.test(body)) {
          rows = firstRecordArray(JSON.parse(body));
        } else {
          rows = parseHtmlTable(body);
          if (!rows.length) {
            errors.push(`${url}: no listings table found in HTML`);
            continue;
          }
        }
      }
      const mapped = rows.map(normalize).filter(Boolean);
      if (mapped.length) return mapped;
      errors.push(`${url}: parsed 0 rows`);
    } catch (err) {
      errors.push(`${url}: ${err.message}`);
    }
  }

  const err = new Error(
    `No CSE listing source responded. Tried:\n  ${errors.join('\n  ')}\n` +
      'Download the listings file from https://thecse.com/listing/listed-companies/ and save it as ' +
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
