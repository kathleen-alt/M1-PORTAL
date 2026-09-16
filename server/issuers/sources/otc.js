// OTC Markets (OTCQX / OTCQB / Pink).
//
// OTC Markets does not publish a member symbol file the way Nasdaq Trader does.
// The site's own screener is backed by a JSON API, which is what we page
// through. It is the least stable of the four exchange sources, so the CSV
// override matters most here: the screener at
// otcmarkets.com/research/stock-screener has a "Download" button — drop that
// file at server/data/universe/otc.csv and this adapter uses it instead.

import { get, getJson, readOverride, parseCsv } from '../http.js';

const BASE = process.env.OTC_API_BASE || 'https://backend.otcmarkets.com/otcapi';
const PAGE_SIZE = 500;

const TIERS = { OTCQX: 'OTCQX', OTCQB: 'OTCQB', PINK: 'Pink', EXPERT: 'Expert Market' };

const STATUS_PAGE = 'https://www.otcmarkets.com/research/stock-screener';
const MAINTENANCE = /temporarily unavailable|maintenance in progress|scheduled maintenance/i;

/**
 * Is the public site in maintenance?
 *
 * While OTC Markets is down its gateway unmaps the API routes, so the screener
 * answers 403/404 exactly as it would if the endpoint had been moved. Reporting
 * the raw status sends whoever reads it hunting for a new endpoint that does
 * not exist, so on failure we check the public page for the maintenance banner
 * and say which of the two it is. Best effort only — never mask the original
 * error with one from this probe.
 */
async function inMaintenance() {
  try {
    return MAINTENANCE.test(await get(STATUS_PAGE, { cacheMs: 5 * 60e3, retries: 0, timeoutMs: 10000 }));
  } catch {
    return false;
  }
}

function tierOf(row) {
  const raw = String(row.tierName || row.tierCode || row.tierDisplayName || row.Tier || '').toUpperCase();
  if (raw.includes('QX')) return TIERS.OTCQX;
  if (raw.includes('QB')) return TIERS.OTCQB;
  if (raw.includes('EXPERT')) return TIERS.EXPERT;
  if (raw.includes('PINK') || raw.includes('CURRENT') || raw.includes('LIMITED')) return TIERS.PINK;
  return raw || null;
}

function fromCsv(text) {
  return parseCsv(text)
    .map((r) => ({
      symbol: (r.Symbol || r.symbol || r.Ticker || '').trim().toUpperCase(),
      name: (r['Company Name'] || r.companyName || r.Name || '').trim(),
      exchange: 'OTC',
      tier: tierOf(r),
      country: (r.Country || r.country || '').trim() || null,
      source: 'otcmarkets-csv',
    }))
    .filter((r) => r.symbol && r.name);
}

/**
 * @param {object} [opts]
 * @param {string[]} [opts.tiers] which OTC tiers to keep (default QX + QB)
 * @param {number} [opts.maxPages] safety cap on paging
 */
export async function fetchUniverse({ tiers = ['OTCQX', 'OTCQB'], maxPages = 40 } = {}) {
  const override = await readOverride('otc.csv');
  if (override) return fromCsv(override).filter((r) => !tiers.length || tiers.includes(r.tier));

  const out = [];
  const wanted = new Set(tiers);

  for (let page = 1; page <= maxPages; page += 1) {
    const url =
      `${BASE}/market-data/stock-screener?page=${page}&pageSize=${PAGE_SIZE}&sortField=symbol&sortOrder=asc`;
    let data;
    try {
      data = await getJson(url, {
        cacheMs: 12 * 3600e3,
        headers: { Referer: 'https://www.otcmarkets.com/', Origin: 'https://www.otcmarkets.com' },
      });
    } catch (err) {
      if (page === 1 && (await inMaintenance())) {
        const wrapped = new Error(
          `OTC Markets is in scheduled maintenance (${err.message}). The endpoint is unchanged — ` +
            'retry when the site is back, or drop the screener export at server/data/universe/otc.csv ' +
            'to run the sweep meanwhile.',
        );
        wrapped.code = 'OTC_MAINTENANCE';
        throw wrapped;
      }
      throw err;
    }

    const records = data?.records || data?.stocks || [];
    if (!records.length) break;

    for (const r of records) {
      const tier = tierOf(r);
      if (wanted.size && !wanted.has(tier)) continue;
      out.push({
        symbol: String(r.symbol || '').toUpperCase(),
        name: r.securityName || r.companyName || r.name || '',
        exchange: 'OTC',
        tier,
        country: r.country || null,
        source: 'otcmarkets',
      });
    }

    const totalPages = data?.pages ?? data?.totalPages;
    if (totalPages && page >= totalPages) break;
  }

  return out.filter((r) => r.symbol && r.name);
}

export const meta = {
  id: 'otc',
  label: 'OTC Markets (OTCQX / OTCQB screener API)',
  url: `${BASE}/market-data/stock-screener?page=1&pageSize=5`,
  override: 'otc.csv',
};
