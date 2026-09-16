// Yahoo Finance — the market-data enrichment layer.
//
// Yahoo's public JSON endpoints require a cookie + crumb pair obtained from the
// consent host before they will answer. We fetch that pair once per process and
// refresh it when a call comes back 401/403.

import { get, getJson, HttpError } from '../http.js';

const Q1 = 'https://query1.finance.yahoo.com';
const Q2 = 'https://query2.finance.yahoo.com';

// Yahoo suffixes for the venues we track. US tickers carry no suffix.
const SUFFIX = { NASDAQ: '', NYSE: '', 'NYSE American': '', OTC: '', TSX: '.TO', TSXV: '.V', CSE: '.CN' };

/** Map an exchange-native symbol to its Yahoo ticker (BTR -> BTR.V on TSXV). */
export function yahooSymbol(symbol, exchange) {
  const suffix = SUFFIX[exchange] ?? '';
  // Canadian venues use dashes where the exchange file uses dots (e.g. RE.A -> RE-A.V).
  const base = suffix ? symbol.replace(/\./g, '-') : symbol;
  return `${base}${suffix}`;
}

let session = null;

async function newSession() {
  // The consent host is what actually sets the A1/A3 cookies.
  const res = await fetch('https://fc.yahoo.com/', { redirect: 'manual' }).catch(() => null);
  const raw = res?.headers?.getSetCookie?.() || [];
  const cookie = raw.map((c) => c.split(';')[0]).join('; ');
  const crumb = await get(`${Q2}/v1/test/getcrumb`, {
    headers: cookie ? { Cookie: cookie } : {},
    retries: 1,
  }).catch(() => '');
  return { cookie, crumb: (crumb || '').trim() };
}

async function auth(force = false) {
  if (force || !session) session = await newSession();
  return session;
}

/** Call a Yahoo endpoint with the crumb attached, refreshing it once on 401/403. */
async function authed(build, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { cookie, crumb } = await auth(attempt > 0);
    try {
      return await getJson(build(crumb), {
        ...opts,
        headers: { ...(opts.headers || {}), ...(cookie ? { Cookie: cookie } : {}) },
      });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 0;
      if ((status === 401 || status === 403) && attempt === 0) continue;
      throw err;
    }
  }
  return null;
}

const MODULES = [
  'price',
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
  'assetProfile',
  'calendarEvents',
  'incomeStatementHistory',
  'balanceSheetHistory',
].join(',');

const num = (v) => {
  const n = typeof v === 'object' && v !== null ? v.raw : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/**
 * Full fundamentals + profile for one symbol.
 * @returns {Promise<object|null>} null when Yahoo has no such ticker
 */
export async function fetchQuoteSummary(ySymbol, { cacheMs = 6 * 3600e3 } = {}) {
  const data = await authed(
    (crumb) =>
      `${Q2}/v10/finance/quoteSummary/${encodeURIComponent(ySymbol)}?modules=${MODULES}` +
      (crumb ? `&crumb=${encodeURIComponent(crumb)}` : ''),
    { cacheMs, allow404: true },
  ).catch((err) => {
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  });

  const r = data?.quoteSummary?.result?.[0];
  if (!r) return null;

  const price = r.price || {};
  const detail = r.summaryDetail || {};
  const stats = r.defaultKeyStatistics || {};
  const fin = r.financialData || {};
  const profile = r.assetProfile || {};
  const income = r.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
  const balance = r.balanceSheetHistory?.balanceSheetStatements?.[0] || {};

  const last = num(price.regularMarketPrice) ?? num(detail.previousClose);
  const avgVol3m = num(detail.averageDailyVolume3Month) ?? num(detail.averageVolume);
  const avgVol10d = num(detail.averageDailyVolume10Day);

  return {
    symbol: ySymbol,
    currency: price.currency || detail.currency || null,
    price: last,
    marketCap: num(price.marketCap) ?? num(detail.marketCap),
    enterpriseValue: num(stats.enterpriseValue),
    sharesOutstanding: num(stats.sharesOutstanding) ?? num(price.sharesOutstanding),
    floatShares: num(stats.floatShares),
    heldByInsidersPct: num(stats.heldPercentInsiders),
    heldByInstitutionsPct: num(stats.heldPercentInstitutions),
    shortPercentOfFloat: num(stats.shortPercentOfFloat),

    avgVolume3m: avgVol3m,
    avgVolume10d: avgVol10d,
    avgDollarVolume3m: avgVol3m != null && last != null ? avgVol3m * last : null,
    avgDollarVolume10d: avgVol10d != null && last != null ? avgVol10d * last : null,

    high52w: num(detail.fiftyTwoWeekHigh) ?? num(stats['52WeekChange']),
    low52w: num(detail.fiftyTwoWeekLow),
    fiftyDayAverage: num(detail.fiftyDayAverage),
    twoHundredDayAverage: num(detail.twoHundredDayAverage),

    revenue: num(fin.totalRevenue) ?? num(income.totalRevenue),
    grossProfit: num(income.grossProfit),
    ebitda: num(fin.ebitda),
    netIncome: num(income.netIncome),
    cash: num(fin.totalCash) ?? num(balance.cash),
    debt: num(fin.totalDebt),
    freeCashflow: num(fin.freeCashflow),
    operatingCashflow: num(fin.operatingCashflow),
    revenueGrowth: num(fin.revenueGrowth),

    sector: profile.sector || null,
    industry: profile.industry || null,
    website: profile.website || null,
    summary: profile.longBusinessSummary || null,
    employees: num(profile.fullTimeEmployees),
    hqCountry: profile.country || null,
    hqRegion: [profile.city, profile.state].filter(Boolean).join(', ') || null,
    officers: (profile.companyOfficers || [])
      .map((o) => ({ name: o.name, title: o.title, age: num(o.age) }))
      .filter((o) => o.name),

    nextEarnings: r.calendarEvents?.earnings?.earningsDate?.[0]?.raw
      ? new Date(r.calendarEvents.earnings.earningsDate[0].raw * 1000).toISOString().slice(0, 10)
      : null,

    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Daily history, used for volume decay, listing age and news-reaction checks.
 * @returns {Promise<{firstTradeDate:string|null, bars:Array}|null>}
 */
export async function fetchHistory(ySymbol, { range = '1y', cacheMs = 6 * 3600e3 } = {}) {
  const data = await getJson(
    `${Q1}/v8/finance/chart/${encodeURIComponent(ySymbol)}?range=${range}&interval=1d&includePrePost=false`,
    { cacheMs, allow404: true },
  ).catch((err) => {
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  });

  const r = data?.chart?.result?.[0];
  if (!r?.timestamp) return null;

  const closes = r.indicators?.quote?.[0]?.close || [];
  const volumes = r.indicators?.quote?.[0]?.volume || [];
  const bars = r.timestamp
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i], volume: volumes[i] }))
    .filter((b) => typeof b.close === 'number' && typeof b.volume === 'number');

  return {
    firstTradeDate: r.meta?.firstTradeDate
      ? new Date(r.meta.firstTradeDate * 1000).toISOString().slice(0, 10)
      : null,
    bars,
  };
}

/** Average dollar volume over the last `days` bars. */
function avgDollarVol(bars, days) {
  const slice = bars.slice(-days);
  if (!slice.length) return null;
  return slice.reduce((s, b) => s + b.close * b.volume, 0) / slice.length;
}

/**
 * Derive the trading-decay signals the qualification model needs.
 * Volume decay = recent 60-day liquidity against the 6 months before it.
 */
export function deriveHistorySignals(history) {
  if (!history?.bars?.length) return {};
  const { bars } = history;

  const recent = avgDollarVol(bars, 60);
  const prior = bars.length > 60 ? avgDollarVol(bars.slice(0, -60), 126) : null;

  // Biggest single-day volume spike and what the price did with it: a company
  // whose news moves volume but not price is the "news, no reaction" signal.
  let spike = null;
  const medVol = [...bars].map((b) => b.volume).sort((a, b) => a - b)[Math.floor(bars.length / 2)] || 0;
  for (let i = 1; i < bars.length; i += 1) {
    if (medVol && bars[i].volume > medVol * 5) {
      const move = (bars[i].close - bars[i - 1].close) / bars[i - 1].close;
      if (!spike || bars[i].volume > spike.volume) {
        spike = { date: bars[i].date, volume: bars[i].volume, priceMove: move };
      }
    }
  }

  return {
    avgDollarVolume60d: recent,
    avgDollarVolumePrior6m: prior,
    volumeDecayPct: recent != null && prior ? (recent - prior) / prior : null,
    listingFirstTrade: history.firstTradeDate,
    biggestVolumeSpike: spike,
    barsCounted: bars.length,
  };
}

export const meta = {
  id: 'yahoo',
  label: 'Yahoo Finance (quoteSummary + chart)',
  url: `${Q1}/v8/finance/chart/AAPL?range=5d&interval=1d`,
};
