// The canonical issuer record.
//
// Four exchange feeds, a market-data API, a social API and a website scraper all
// describe the same company differently. Everything downstream — scoring, the
// API, the CSV export — reads the shape defined here and nothing else.

import { capBand, classifySector } from './score.js';
import { yahooSymbol } from './sources/yahoo.js';
import { stocktwitsSymbol } from './sources/stocktwits.js';

/** Stable key for an issuer across refreshes: exchange + native symbol. */
export function issuerKey(symbol, exchange) {
  return `${exchange}:${String(symbol).toUpperCase()}`;
}

/** Build the base record from an exchange universe row. */
export function fromUniverse(row) {
  const symbol = String(row.symbol).toUpperCase();
  return {
    key: issuerKey(symbol, row.exchange),
    symbol,
    name: row.name,
    exchange: row.exchange,
    listingTier: row.tier || null,
    financialStatus: row.financialStatus || null,
    country: row.country || null,
    yahooSymbol: yahooSymbol(symbol, row.exchange),
    stocktwitsSymbol: stocktwitsSymbol(symbol, row.exchange),
    sectorHint: row.sectorHint || null,
    sources: { universe: row.source },
    universeAt: new Date().toISOString(),
  };
}

/** Fold Yahoo fundamentals + derived history signals into a record. */
export function applyMarketData(issuer, quote, historySignals = {}) {
  if (!quote) return { ...issuer, marketDataAt: null, marketDataError: 'no Yahoo match' };

  const drawdownPct =
    quote.price != null && quote.high52w ? (quote.price - quote.high52w) / quote.high52w : null;

  const sector = classifySector(quote.sector, quote.industry, issuer.sectorHint, quote.summary, issuer.name);

  const listingYear = historySignals.listingFirstTrade
    ? Number(historySignals.listingFirstTrade.slice(0, 4))
    : null;

  return {
    ...issuer,
    currency: quote.currency,
    price: quote.price,
    marketCap: quote.marketCap,
    capBand: capBand(quote.marketCap),
    enterpriseValue: quote.enterpriseValue,
    sharesOutstanding: quote.sharesOutstanding,
    floatShares: quote.floatShares,
    heldByInsidersPct: quote.heldByInsidersPct,
    heldByInstitutionsPct: quote.heldByInstitutionsPct,
    shortPercentOfFloat: quote.shortPercentOfFloat,

    avgVolume3m: quote.avgVolume3m,
    avgDollarVolume3m: quote.avgDollarVolume3m,
    avgDollarVolume10d: quote.avgDollarVolume10d,
    avgDollarVolume60d: historySignals.avgDollarVolume60d ?? null,
    avgDollarVolumePrior6m: historySignals.avgDollarVolumePrior6m ?? null,
    volumeDecayPct: historySignals.volumeDecayPct ?? null,
    biggestVolumeSpike: historySignals.biggestVolumeSpike ?? null,

    high52w: quote.high52w,
    low52w: quote.low52w,
    drawdownPct,

    revenue: quote.revenue,
    ebitda: quote.ebitda,
    netIncome: quote.netIncome,
    cash: quote.cash,
    debt: quote.debt,
    freeCashflow: quote.freeCashflow,
    operatingCashflow: quote.operatingCashflow,
    revenueGrowth: quote.revenueGrowth,
    evToRevenue: quote.enterpriseValue != null && quote.revenue ? quote.enterpriseValue / quote.revenue : null,

    sector: quote.sector,
    industry: quote.industry,
    sectorGroup: sector.id,
    sectorLabel: sector.label,
    sectorScore: sector.score,
    website: quote.website,
    summary: quote.summary,
    employees: quote.employees,
    hqCountry: quote.hqCountry,
    hqRegion: quote.hqRegion,
    officers: quote.officers,
    nextEarnings: quote.nextEarnings,
    listingYear,
    listingFirstTrade: historySignals.listingFirstTrade ?? null,

    sources: { ...issuer.sources, marketData: 'yahoo' },
    marketDataAt: quote.fetchedAt,
    marketDataError: null,
  };
}

export function applyAwareness(issuer, awareness) {
  if (!awareness) return { ...issuer, watchers: issuer.watchers ?? null };
  return {
    ...issuer,
    watchers: awareness.watchers,
    recentMessages: awareness.recentMessages,
    sources: { ...issuer.sources, awareness: 'stocktwits' },
    awarenessAt: new Date().toISOString(),
  };
}

export function applySiteScan(issuer, scan, signals) {
  if (!scan) return issuer;
  return {
    ...issuer,
    website: issuer.website || scan.website,
    siteReachable: scan.reachable,
    irPosture: signals.irPosture,
    hasIncumbentAgency: signals.hasIncumbentAgency,
    incumbentAgency: signals.incumbentAgency,
    incumbentEvidence: signals.incumbentEvidence,
    irEmail: signals.irEmail,
    irEmails: scan.irEmails,
    irJobPosting: signals.irJobPosting,
    hasIrPage: signals.hasIrPage,
    irPages: scan.irPages,
    linkedin: signals.linkedin,
    socials: scan.socials,
    contactBlocks: scan.contactBlocks,
    sources: { ...issuer.sources, site: scan.website },
    siteScanAt: scan.scannedAt,
  };
}

/**
 * Fold a press-release archive scan into a record.
 *
 * Release footers outrank the website scan when they disagree: a name printed
 * on the releases themselves, repeatedly, is the "footer-verified" standard the
 * POC sheet holds itself to. The absence of an agency only counts as evidence
 * once enough releases have actually been read -- concluding "runs IR in-house"
 * from two releases would be guessing.
 */
export function applyReleaseScan(issuer, scan, signals) {
  if (!scan) return issuer;

  const READ_ENOUGH = 3;
  const next = {
    ...issuer,
    releaseCount: signals.releaseCount ?? 0,
    releasesLast12m: signals.releasesLast12m ?? null,
    releasesLast90d: signals.releasesLast90d ?? null,
    latestRelease: signals.latestRelease ?? null,
    latestReleaseTitle: signals.latestReleaseTitle ?? null,
    primaryNewswire: signals.primaryNewswire ?? null,
    releaseNewswires: signals.releaseNewswires ?? [],
    releaseAgencies: signals.releaseAgencies ?? [],
    financingCount12m: signals.financingCount12m ?? null,
    latestFinancing: signals.latestFinancing ?? null,
    irHireAnnouncement: signals.irHireAnnouncement ?? null,
    catalystCount12m: signals.catalystCount12m ?? null,
    latestCatalyst: signals.latestCatalyst ?? null,
    undervaluedQuote: signals.undervaluedQuote ?? null,
    newsReaction: signals.newsReaction ?? null,
    // Keep a trimmed archive for the timeline in the UI.
    releases: (scan.releases || []).slice(0, 40).map((r) => ({
      date: r.date, title: r.title, url: r.url,
      newswires: r.newswires, agencies: r.agencies,
      isFinancing: r.isFinancing, isIrHire: r.isIrHire, isCatalyst: r.isCatalyst,
    })),
    releaseScanAt: scan.scannedAt,
    releaseScanVia: scan.discoveredVia,
    sources: { ...issuer.sources, releases: scan.website },
  };

  if (signals.footerVerifiedAgency) {
    next.hasIncumbentAgency = true;
    next.incumbentAgency = signals.footerVerifiedAgency;
    next.incumbentEvidence = `release footer${signals.releaseAgencies?.[0]?.count > 1 ? ` x${signals.releaseAgencies[0].count}` : ''}`;
    next.incumbentEvidenceUrl = signals.footerVerifiedAgencyUrl || null;
    next.irPosture = 'agency-retained';
  } else if ((signals.releaseCount ?? 0) >= READ_ENOUGH) {
    next.hasIncumbentAgency = false;
    next.incumbentAgency = null;
    next.incumbentEvidence = `no agency named across ${signals.releaseCount} release footers`;
    next.irPosture = signals.releaseIrEmails?.length || issuer.irEmail ? 'in-house' : 'no-visible-ir';
  }

  if (signals.releaseIrEmails?.length && !next.irEmail) next.irEmail = signals.releaseIrEmails[0];
  return next;
}

/** Columns for the CSV export, mirroring the POC workbook's layout. */
export const EXPORT_COLUMNS = [
  ['symbol', 'Symbol'],
  ['name', 'Name'],
  ['exchange', 'Exchange'],
  ['sectorLabel', 'Hot Sector'],
  ['industry', 'Industry'],
  ['website', 'Domain'],
  ['summaryShort', 'What They Do (1-line)'],
  ['marketCap', 'Market Cap'],
  ['price', 'Live Price'],
  ['avgDollarVolume3m', 'Avg $ Volume/day (3mo)'],
  ['volumeDecayPct', 'Volume Decay'],
  ['drawdownPct', 'Drawdown'],
  ['watchers', 'Watchers'],
  ['dollarPerWatcher', 'Conviction Gap ($/watcher)'],
  ['revenue', 'Revenue (latest)'],
  ['cash', 'Cash / Treasury'],
  ['evToRevenue', 'EV/Rev'],
  ['runwayMonths', 'Cash Runway (months)'],
  ['nextEarnings', 'Catalyst Window'],
  ['listingYear', 'IPO / Listing Year'],
  ['irPosture', 'IR Posture'],
  ['incumbentAgency', 'Incumbent PR/IR (footer-verified)'],
  ['irEmail', 'IR Contact'],
  ['irJobPosting', 'IR Job Posting'],
  ['linkedin', 'LinkedIn'],
  ['primaryNewswire', 'Media Provider (receipt)'],
  ['releasesLast12m', 'Releases (12mo)'],
  ['latestRelease', 'Latest Release'],
  ['newsNoReactionPct', 'News No Reaction'],
  ['latestFinancingText', 'Raise Closed'],
  ['undervaluedQuoteText', 'CEO Undervalued Quote'],
  ['fitScore', 'Fit Score'],
  ['fitTier', 'Tier'],
  ['fitReasons', 'Why this company is a good fit for Market One'],
];

/** Flatten a scored issuer into the export/table row shape. */
export function toRow(it) {
  const burn = it.operatingCashflow != null && it.operatingCashflow < 0 ? -it.operatingCashflow : null;
  return {
    ...it,
    summaryShort: it.summary ? `${it.summary.split(/(?<=\.)\s/)[0]}`.slice(0, 220) : null,
    dollarPerWatcher: it.watchers && it.avgDollarVolume3m != null ? it.avgDollarVolume3m / it.watchers : null,
    runwayMonths: burn && it.cash != null ? (it.cash / burn) * 12 : null,
    newsNoReactionPct: it.newsReaction?.flatShare != null
      ? `${Math.round(it.newsReaction.flatShare * 100)}% of ${it.newsReaction.measured} releases moved nothing`
      : null,
    latestFinancingText: it.latestFinancing?.date
      ? `${it.latestFinancing.date} - ${it.latestFinancing.title || 'financing'}`
      : null,
    undervaluedQuoteText: it.undervaluedQuote?.quote
      ? `${it.undervaluedQuote.speaker ? `${it.undervaluedQuote.speaker}: ` : ''}"${it.undervaluedQuote.quote}"`
      : null,
    fitScore: it.fit?.score ?? null,
    fitTier: it.fit?.tier ?? null,
    fitReasons: it.fit?.reasons?.join(' | ') ?? null,
  };
}

export function toCsv(issuers) {
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(v) : String(v).replace(/\s+/g, ' ').trim();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = EXPORT_COLUMNS.map(([, label]) => esc(label)).join(',');
  const body = issuers
    .map(toRow)
    .map((r) => EXPORT_COLUMNS.map(([key]) => esc(r[key])).join(','))
    .join('\n');
  return `${head}\n${body}\n`;
}
