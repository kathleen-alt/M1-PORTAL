// StockTwits — retail awareness.
//
// The qualification model's sharpest signal is the conviction gap: a company
// with thousands of people watching it whose shares barely trade. Watchers come
// from StockTwits' public symbol stream, which reports a watchlist count.

import { getJson, HttpError } from '../http.js';

const BASE = 'https://api.stocktwits.com/api/2/streams/symbol';

// StockTwits uses its own Canadian suffixes.
const SUFFIX = { TSX: '.CA', TSXV: '.CA', CSE: '.CA' };

export function stocktwitsSymbol(symbol, exchange) {
  return `${symbol.replace(/\./g, '-')}${SUFFIX[exchange] ?? ''}`;
}

/**
 * @returns {Promise<{watchers:number|null, recentMessages:number|null}|null>}
 *   null when the symbol is unknown or StockTwits is rate-limiting us.
 */
export async function fetchAwareness(stSymbol, { cacheMs = 24 * 3600e3 } = {}) {
  try {
    const data = await getJson(`${BASE}/${encodeURIComponent(stSymbol)}.json`, {
      cacheMs,
      retries: 1,
      allow404: true,
    });
    if (!data?.symbol) return null;
    return {
      watchers: data.symbol.watchlist_count ?? null,
      recentMessages: Array.isArray(data.messages) ? data.messages.length : null,
    };
  } catch (err) {
    // 429 is routine on a wide sweep — degrade rather than fail the run.
    if (err instanceof HttpError && (err.status === 429 || err.status === 404)) return null;
    throw err;
  }
}

export const meta = {
  id: 'stocktwits',
  label: 'StockTwits (retail watcher counts)',
  url: `${BASE}/AAPL.json`,
};
