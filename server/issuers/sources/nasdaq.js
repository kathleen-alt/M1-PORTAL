// NASDAQ (plus NYSE/AMEX, which share the same directory file).
//
// Primary source is Nasdaq Trader's symbol directory — the same pipe-delimited
// files the exchange publishes for its members, refreshed nightly. It is the
// authoritative list of what is actually listed, which is exactly what a
// prospecting sweep needs as its spine.

import { get, readOverride } from '../http.js';

const NASDAQ_LISTED = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';
const OTHER_LISTED = 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt';

// otherlisted.txt exchange codes.
const EXCHANGE_CODE = {
  A: 'NYSE American',
  N: 'NYSE',
  P: 'NYSE Arca',
  Z: 'Cboe BZX',
  V: 'IEX',
};

/** Parse a pipe-delimited Nasdaq Trader file, dropping its trailing footer row. */
function parsePipe(text) {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split('|').map((h) => h.trim());
  return lines
    .slice(1)
    .filter((l) => !l.startsWith('File Creation Time'))
    .map((l) => {
      const cells = l.split('|');
      return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
    })
    .filter((r) => r[header[0]]);
}

// Nasdaq marks non-common-share instruments in the security name. A prospect
// list wants operating companies, not warrants, units, notes or preferreds.
const NON_EQUITY = /\b(warrant|right|unit|preferred|depositary|debenture|note[s]?\s+due|ETF|ETN|Trust Units|Index|% Series)\b/i;

function isOperatingEquity(name = '') {
  return !NON_EQUITY.test(name);
}

/** Strip the exchange's boilerplate suffix from a security name. */
function cleanName(name = '') {
  return name
    .replace(/\s*-\s*(Common Stock|Common Shares|Ordinary Shares|Class [A-Z] (Common Stock|Ordinary Shares)).*$/i, '')
    .replace(/\s*\(The\)$/i, '')
    .trim();
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.includeNyse] also return NYSE / NYSE American names
 * @returns {Promise<Array>} raw universe rows
 */
export async function fetchUniverse({ includeNyse = false } = {}) {
  const out = [];

  const nasdaqText = (await readOverride('nasdaqlisted.txt')) || (await get(NASDAQ_LISTED, { cacheMs: 12 * 3600e3 }));
  for (const r of parsePipe(nasdaqText)) {
    if (r['Test Issue'] === 'Y' || r.ETF === 'Y') continue;
    if (!isOperatingEquity(r['Security Name'])) continue;
    out.push({
      symbol: r.Symbol,
      name: cleanName(r['Security Name']),
      exchange: 'NASDAQ',
      // Q = Global Select, G = Global, S = Capital Market.
      tier: { Q: 'Global Select', G: 'Global', S: 'Capital Market' }[r['Market Category']] || null,
      // D = deficient, E = delinquent, Q = bankrupt. A live compliance signal.
      financialStatus: r['Financial Status'] && r['Financial Status'] !== 'N' ? r['Financial Status'] : null,
      country: 'US',
      source: 'nasdaqtrader',
    });
  }

  if (includeNyse) {
    const otherText = (await readOverride('otherlisted.txt')) || (await get(OTHER_LISTED, { cacheMs: 12 * 3600e3 }));
    for (const r of parsePipe(otherText)) {
      if (r['Test Issue'] === 'Y' || r.ETF === 'Y') continue;
      if (!isOperatingEquity(r['Security Name'])) continue;
      const exchange = EXCHANGE_CODE[r.Exchange];
      if (!exchange || exchange === 'Cboe BZX' || exchange === 'IEX') continue; // listing venues only
      out.push({
        symbol: r['ACT Symbol'],
        name: cleanName(r['Security Name']),
        exchange,
        tier: null,
        financialStatus: null,
        country: 'US',
        source: 'nasdaqtrader',
      });
    }
  }

  return out;
}

export const meta = {
  id: 'nasdaq',
  label: 'NASDAQ (Nasdaq Trader symbol directory)',
  url: NASDAQ_LISTED,
  override: 'nasdaqlisted.txt',
};
