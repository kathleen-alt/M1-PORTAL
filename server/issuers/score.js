// The Market One qualification model.
//
// This is the POC workbook expressed as code. The sheet grouped its columns
// into five tests, and each one is a reason an issuer would buy: nobody is
// trading them, people watch but will not buy, the business is real enough to
// be worth marketing, something is coming that needs an audience, and they are
// already spending money trying to fix it.
//
// Every signal returns { hit, value, label, weight } so the UI can show *why* a
// company scored the way it did rather than an unexplained number.

// ── Eligibility ──────────────────────────────────────────────────────────────
// Hard floors, applied before scoring means anything. The qualification model
// rewards a company for being overlooked, but past a point "overlooked" is just
// untradeable: a name that trades a few hundred shares a day cannot absorb the
// interest a campaign creates, and a shell-sized market cap is not a client.
// These are disqualifiers rather than signals, so they gate the list instead of
// moving the score.
export const ELIGIBILITY = {
  minShareVolume: Number(process.env.ISSUERS_MIN_SHARE_VOLUME || 10_000),
  minMarketCap: Number(process.env.ISSUERS_MIN_MARKET_CAP || 10_000_000),
};

/**
 * Apply the hard floors.
 *
 * A missing value is not a failure -- an un-enriched record is "unknown", not
 * "ineligible", or a refresh would quietly delete half the universe.
 *
 * @returns {{eligible: boolean, unknown: boolean, reasons: string[]}}
 */
export function assessEligibility(issuer) {
  const reasons = [];
  let unknown = false;

  // Yahoo reports share volume directly; derive it from dollar volume when a
  // record carries only that (the POC seed does).
  const shareVolume = issuer.avgVolume3m
    ?? (issuer.avgDollarVolume3m != null && issuer.price ? issuer.avgDollarVolume3m / issuer.price : null);

  if (shareVolume == null) unknown = true;
  else if (shareVolume < ELIGIBILITY.minShareVolume) {
    reasons.push(
      `Trades ~${Math.round(shareVolume).toLocaleString()} shares/day, below the ` +
      `${ELIGIBILITY.minShareVolume.toLocaleString()}-share floor`,
    );
  }

  if (issuer.marketCap == null) unknown = true;
  else if (issuer.marketCap < ELIGIBILITY.minMarketCap) {
    reasons.push(
      `Market cap $${(issuer.marketCap / 1e6).toFixed(1)}M is under the ` +
      `$${(ELIGIBILITY.minMarketCap / 1e6).toFixed(0)}M floor`,
    );
  }

  return { eligible: reasons.length === 0, unknown, reasons };
}

/** Cap bands used for peer grouping and for the affordability test. */
export const CAP_BANDS = [
  { id: 'nano', label: 'Nano (<$50M)', max: 50e6 },
  { id: 'micro', label: 'Micro ($50-300M)', max: 300e6 },
  { id: 'small', label: 'Small ($300M-2B)', max: 2e9 },
  { id: 'mid', label: 'Mid ($2B+)', max: Infinity },
];

export function capBand(marketCap) {
  if (marketCap == null) return null;
  return CAP_BANDS.find((b) => marketCap < b.max)?.id || 'mid';
}

// Sectors where a retail-facing story actually moves the needle. Straight from
// the sheet's "Hot Sector" column.
const HOT_SECTORS = [
  { id: 'mining', label: 'Mining & Metals', score: 10, re: /mining|metal|gold|silver|copper|lithium|uranium|graphite|rare earth|basic materials/i },
  { id: 'energy', label: 'Energy & Nuclear', score: 9, re: /energy|oil|gas|nuclear|uranium|solar|renewable/i },
  { id: 'defense', label: 'Defense & Space', score: 9, re: /defen[cs]e|aerospace|space|drone|uav/i },
  { id: 'ai', label: 'AI & Data', score: 9, re: /artificial intelligence|machine learning|\bAI\b|data cent(er|re)|semiconductor/i },
  { id: 'biotech', label: 'Biotech & Health', score: 7, re: /biotech|pharmaceutic|therapeutic|medical|health|diagnostic|life science/i },
  { id: 'tech', label: 'Technology', score: 6, re: /technology|software|internet|communication/i },
  { id: 'crypto', label: 'Crypto & Fintech', score: 7, re: /crypto|blockchain|digital asset|bitcoin|fintech/i },
  { id: 'cleantech', label: 'Cleantech & EV', score: 7, re: /battery|electric vehicle|\bEV\b|clean tech|hydrogen|carbon/i },
];

export function classifySector(...fields) {
  const hay = fields.filter(Boolean).join(' ');
  const hit = HOT_SECTORS.find((s) => s.re.test(hay));
  return hit ? { id: hit.id, label: hit.label, score: hit.score } : { id: 'other', label: 'Other', score: 3 };
}

const pct = (n) => (n == null ? null : `${(n * 100).toFixed(0)}%`);
const usd = (n) =>
  n == null
    ? null
    : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
    : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

/**
 * Peer medians by sector x cap band, computed from the loaded universe itself.
 * "Low volume" only means something relative to comparable companies, and the
 * sheet's peer-median comparisons are exactly this.
 */
export function buildPeerStats(issuers) {
  const groups = new Map();
  for (const it of issuers) {
    const band = capBand(it.marketCap);
    const sector = it.sectorGroup || 'other';
    if (!band) continue;
    for (const key of [`${sector}:${band}`, `*:${band}`]) {
      if (!groups.has(key)) groups.set(key, { vol: [], watchers: [], perWatcher: [] });
      const g = groups.get(key);
      if (it.avgDollarVolume3m != null) g.vol.push(it.avgDollarVolume3m);
      if (it.watchers != null) g.watchers.push(it.watchers);
      if (it.avgDollarVolume3m != null && it.watchers) g.perWatcher.push(it.avgDollarVolume3m / it.watchers);
    }
  }

  const median = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const stats = {};
  for (const [key, g] of groups) {
    stats[key] = {
      n: g.vol.length,
      medianDollarVolume: median(g.vol),
      medianWatchers: median(g.watchers),
      medianDollarPerWatcher: median(g.perWatcher),
    };
  }
  return stats;
}

// Peer medians computed from the store are only meaningful once the store holds
// a real cross-section of the market. A curated shortlist is, by construction,
// all illiquid and all watched -- comparing those names against each other
// cancels out the very signal being measured, and every extreme prospect scores
// as unremarkable. Below this threshold the model uses market-wide reference
// baselines instead of the pool's own medians.
export const MIN_PEER_N = Number(process.env.ISSUERS_MIN_PEER_N || 30);

// Market-wide anchors: typical average daily dollar volume by cap band, and the
// dollars-traded-per-watcher pool median carried over from the POC workbook.
// Override via env when you have better house numbers.
export const REFERENCE_BASELINES = {
  medianDollarVolume: {
    nano: Number(process.env.ISSUERS_BASELINE_VOL_NANO || 150e3),
    micro: Number(process.env.ISSUERS_BASELINE_VOL_MICRO || 1.5e6),
    small: Number(process.env.ISSUERS_BASELINE_VOL_SMALL || 8e6),
    mid: Number(process.env.ISSUERS_BASELINE_VOL_MID || 50e6),
  },
  medianWatchers: { nano: 1500, micro: 4000, small: 12000, mid: 40000 },
  medianDollarPerWatcher: Number(process.env.ISSUERS_BASELINE_PER_WATCHER || 802),
};

/**
 * Best available peer comparison for an issuer, in order of trustworthiness:
 *   1. the sector x cap-band median, when that group is large enough
 *   2. the cap-band median across the whole pool, when the pool is large enough
 *   3. market-wide reference baselines
 * `basis` is returned so the UI can say which one was used.
 */
function peersFor(stats, sectorGroup, band) {
  const sectorGroupStats = stats?.[`${sectorGroup}:${band}`];
  if (sectorGroupStats?.n >= MIN_PEER_N) return { ...sectorGroupStats, basis: 'sector peers' };

  const bandStats = stats?.[`*:${band}`];
  if (bandStats?.n >= MIN_PEER_N) return { ...bandStats, basis: 'cap-band peers' };

  return {
    n: 0,
    basis: 'market baseline',
    medianDollarVolume: REFERENCE_BASELINES.medianDollarVolume[band] ?? null,
    medianWatchers: REFERENCE_BASELINES.medianWatchers[band] ?? null,
    medianDollarPerWatcher: REFERENCE_BASELINES.medianDollarPerWatcher,
  };
}

// ── The five tests ────────────────────────────────────────────────────────────
// Weights sum to 100. They mirror the emphasis of the POC sheet: liquidity and
// the conviction gap dominate, because they are what Market One actually sells
// against.

const TESTS = [
  {
    id: 'invisible',
    label: 'Nobody is trading them',
    weight: 32,
    signals: [
      {
        id: 'lowVolume',
        label: 'Thin vs peers',
        weight: 11,
        run: (it, ctx) => {
          const peers = peersFor(ctx.peerStats, it.sectorGroup, it.capBand);
          // A peer median carried on the record (e.g. an analyst's own
          // real-market comparison) beats anything derived from the pool.
          const med = it.peerMedianDollarVolume || peers?.medianDollarVolume;
          if (it.avgDollarVolume3m == null || !med) return null;
          const ratio = it.avgDollarVolume3m / med;

          // Thin is the opportunity; untradeable is not. Below the share-volume
          // floor the signal decays back toward zero rather than paying out
          // more the closer a company gets to not trading at all.
          const shares = it.avgVolume3m
            ?? (it.price ? it.avgDollarVolume3m / it.price : null);
          const floor = ELIGIBILITY.minShareVolume;
          const tradeable = shares == null ? 1 : Math.max(0, Math.min(1, shares / floor));

          return {
            hit: ratio < 1 && tradeable >= 1,
            // Full credit at a quarter of peer liquidity, none at peer level.
            strength: Math.max(0, Math.min(1, (1 - ratio) / 0.75)) * tradeable,
            value: ratio,
            label:
              `${usd(it.avgDollarVolume3m)}/day = ${(ratio * 100).toFixed(0)}% of peer median ${usd(med)}` +
              (tradeable < 1 ? ` - but only ~${Math.round(shares).toLocaleString()} shares/day, too thin to work` : ''),
          };
        },
      },
      {
        id: 'volumeDecay',
        label: 'Liquidity decaying',
        weight: 6,
        run: (it) => {
          if (it.volumeDecayPct == null) return null;
          return {
            hit: it.volumeDecayPct < -0.2,
            strength: Math.max(0, Math.min(1, -it.volumeDecayPct / 0.6)),
            value: it.volumeDecayPct,
            label: `60-day liquidity ${pct(it.volumeDecayPct)} vs the prior six months`,
          };
        },
      },
      {
        id: 'drawdown',
        label: 'Deep drawdown',
        weight: 9,
        run: (it) => {
          if (it.drawdownPct == null) return null;
          return {
            hit: it.drawdownPct <= -0.4,
            strength: Math.max(0, Math.min(1, -it.drawdownPct / 0.85)),
            value: it.drawdownPct,
            label: `${Math.abs(it.drawdownPct * 100).toFixed(0)}% below 52w high${it.drawdownPct <= -0.8 ? ' - DEEP' : ''}`,
          };
        },
      },
      {
        id: 'newsNoReaction',
        label: 'News, no reaction',
        weight: 6,
        run: (it) => {
          // Read out of the company's own release archive, joined against its
          // daily bars: announcements that move neither price nor volume. The
          // most direct evidence that the market is not listening.
          const r = it.newsReaction;
          if (!r || r.measured < 3) return null;
          return {
            hit: r.flatShare >= 0.6,
            strength: Math.max(0, Math.min(1, (r.flatShare - 0.3) / 0.6)),
            value: r.flatShare,
            label:
              `${r.flat} of ${r.measured} announcements moved the stock less than 3% on under 2x volume ` +
              `(median move ${(r.medianAbsMove * 100).toFixed(1)}%) - they publish and nothing happens`,
          };
        },
      },
    ],
  },
  {
    id: 'awareness',
    label: 'Watched but not bought',
    weight: 22,
    signals: [
      {
        id: 'convictionGap',
        label: 'Conviction gap',
        weight: 14,
        run: (it, ctx) => {
          if (!it.watchers || it.avgDollarVolume3m == null) return null;
          const perWatcher = it.avgDollarVolume3m / it.watchers;
          const peers = peersFor(ctx.peerStats, it.sectorGroup, it.capBand);
          const med =
            peers?.medianDollarPerWatcher ??
            ctx.poolMedianPerWatcher ??
            REFERENCE_BASELINES.medianDollarPerWatcher;
          if (!med) return null;
          const ratio = perWatcher / med;
          return {
            hit: ratio < 1 && it.watchers >= 500,
            strength: Math.max(0, Math.min(1, (1 - ratio) / 0.8)),
            value: perWatcher,
            label:
              `CONVICTION GAP: ${it.watchers.toLocaleString()} watchers but only ${usd(it.avgDollarVolume3m)}/day traded ` +
              `($${perWatcher.toFixed(1)} per watcher vs $${med.toFixed(0)} pool median) - they know you, they will not buy`,
          };
        },
      },
      {
        id: 'awarenessIndex',
        label: 'Retail awareness',
        weight: 4,
        run: (it, ctx) => {
          if (!it.watchers) return null;
          const peers = peersFor(ctx.peerStats, it.sectorGroup, it.capBand);
          const med = peers?.medianWatchers;
          if (!med) return null;
          const ratio = it.watchers / med;
          return {
            hit: ratio > 1.2,
            strength: Math.max(0, Math.min(1, (ratio - 1) / 3)),
            value: ratio,
            label: `${it.watchers.toLocaleString()} watchers = ${(ratio * 100).toFixed(0)}% of peer median`,
          };
        },
      },
      {
        id: 'ceoUndervalued',
        label: 'Management says so',
        weight: 4,
        run: (it) => {
          // Management stating in its own release that the market is not seeing
          // the company. The sheet's "CEO Undervalued Quote" -- the opening line
          // of the pitch, in their words rather than ours.
          if (!it.undervaluedQuote?.quote) return null;
          const speaker = it.undervaluedQuote.speaker ? `${it.undervaluedQuote.speaker}: ` : '';
          return {
            hit: true,
            strength: 1,
            value: it.undervaluedQuote.url || true,
            label: `THEIR WORDS - ${speaker}"${it.undervaluedQuote.quote.slice(0, 180)}"`,
          };
        },
      },
    ],
  },
  {
    id: 'quality',
    label: 'Business quality',
    weight: 16,
    signals: [
      {
        id: 'capFit',
        label: 'Cap in range',
        weight: 7,
        run: (it) => {
          if (it.marketCap == null) return null;
          // The sweet spot is a company big enough to pay and small enough to
          // be ignored: from the eligibility floor up to about $1B.
          const inRange = it.marketCap >= ELIGIBILITY.minMarketCap && it.marketCap <= 1e9;
          const strength = inRange
            ? (it.marketCap <= 500e6 ? 1 : 0.6)
            : it.marketCap < ELIGIBILITY.minMarketCap ? 0 : 0.2;
          return { hit: inRange, strength, value: it.marketCap, label: `Market cap ${usd(it.marketCap)}` };
        },
      },
      {
        id: 'assetBacked',
        label: 'Revenue or defined asset',
        weight: 4,
        run: (it) => {
          const hasRevenue = it.revenue != null && it.revenue > 1e6;
          const assetBacked = it.sectorGroup === 'mining' || it.sectorGroup === 'energy';
          if (!hasRevenue && !assetBacked) return { hit: false, strength: 0, value: it.revenue, label: 'Pre-revenue, no defined asset' };
          return {
            hit: true,
            strength: hasRevenue ? 1 : 0.6,
            value: it.revenue,
            label: hasRevenue ? `Revenue ${usd(it.revenue)}` : 'Asset-backed (resource issuer)',
          };
        },
      },
      {
        id: 'affordability',
        label: 'Can fund a program',
        weight: 5,
        run: (it) => {
          if (it.cash == null) return null;
          // A $100K engagement has to be a rounding error, not a bet-the-company decision.
          const ratio = 100e3 / it.cash;
          return {
            hit: it.cash >= 2e6,
            strength: Math.max(0, Math.min(1, 1 - ratio * 10)),
            value: it.cash,
            label: `${usd(it.cash)} cash - a $100K program is ${(ratio * 100).toFixed(2)}% of treasury`,
          };
        },
      },
    ],
  },
  {
    id: 'catalyst',
    label: 'Something is coming',
    weight: 18,
    signals: [
      {
        id: 'financingNeed',
        label: 'Capital-needing',
        weight: 6,
        run: (it) => {
          if (it.cash == null) return null;
          // Burn-implied runway: cash against trailing operating cash outflow.
          const burn = it.operatingCashflow != null && it.operatingCashflow < 0 ? -it.operatingCashflow : null;
          if (!burn) return null;
          const months = (it.cash / burn) * 12;
          return {
            hit: months < 18,
            strength: Math.max(0, Math.min(1, (18 - months) / 18)),
            value: months,
            label: `~${months.toFixed(0)} months of runway at the current burn - a raise is coming`,
          };
        },
      },
      {
        id: 'earningsWindow',
        label: 'Catalyst window',
        weight: 3,
        run: (it) => {
          if (!it.nextEarnings) return null;
          const days = (new Date(it.nextEarnings) - Date.now()) / 86400e3;
          return {
            hit: days > 0 && days < 75,
            strength: days > 0 && days < 75 ? 1 - days / 75 : 0,
            value: days,
            label: `Next reported results ${it.nextEarnings} (${Math.round(days)} days)`,
          };
        },
      },
      {
        id: 'listingCompliance',
        label: 'Listing pressure',
        weight: 2,
        run: (it) => {
          const deficient = it.financialStatus === 'D' || it.financialStatus === 'E';
          const subDollar = it.price != null && it.price < 1 && it.exchange === 'NASDAQ';
          if (!deficient && !subDollar) return { hit: false, strength: 0, value: null, label: 'No listing deficiency' };
          return {
            hit: true,
            strength: deficient ? 1 : 0.7,
            value: it.price,
            label: deficient ? 'Exchange deficiency notice on file' : `Trading under $1.00 - NASDAQ minimum-bid risk`,
          };
        },
      },
      {
        id: 'recentListing',
        label: 'Recent listing / IPO',
        weight: 2,
        run: (it) => {
          if (!it.listingYear) return null;
          const age = new Date().getFullYear() - it.listingYear;
          return {
            hit: age <= 3,
            strength: Math.max(0, Math.min(1, (4 - age) / 4)),
            value: it.listingYear,
            label: `Listed ${it.listingYear}${age <= 2 ? ' - still inside the post-IPO support window' : ''}`,
          };
        },
      },
      {
        id: 'recentFinancing',
        label: 'Just raised',
        weight: 5,
        run: (it) => {
          // A closed raise is the best possible timing: the money is in the bank
          // and the reason they raised it now needs an audience.
          if (!it.latestFinancing?.date && !it.financingCount12m) return null;
          const days = it.latestFinancing?.date
            ? (Date.now() - Date.parse(it.latestFinancing.date)) / 86400e3
            : null;
          if (days == null) return null;
          return {
            hit: days <= 270,
            strength: Math.max(0, Math.min(1, (365 - days) / 365)),
            value: it.latestFinancing.date,
            label:
              `Raise closed ${it.latestFinancing.date} (${Math.round(days)} days ago)` +
              `${it.financingCount12m > 1 ? `, ${it.financingCount12m} financings in 12 months` : ''}` +
              ` - ${it.latestFinancing.title ? `"${String(it.latestFinancing.title).slice(0, 90)}"` : 'funded and needing the story told'}`,
          };
        },
      },
    ],
  },
  {
    id: 'spending',
    label: 'Already paying to fix it',
    weight: 12,
    signals: [
      {
        id: 'noIncumbent',
        label: 'No agency retained',
        weight: 6,
        run: (it) => {
          if (it.hasIncumbentAgency == null) return null;
          return {
            hit: !it.hasIncumbentAgency,
            strength: it.hasIncumbentAgency ? 0 : 1,
            value: it.incumbentAgency,
            label: it.hasIncumbentAgency
              ? `Incumbent: ${it.incumbentAgency} (${it.incumbentEvidence}) - mandate already held`
              : `Runs IR in-house - no external agency in ${it.releaseCount ? `${it.releaseCount} release footers` : 'the footer'}`,
          };
        },
      },
      {
        id: 'irInvestment',
        label: 'Hiring / staffing IR',
        weight: 4,
        run: (it) => {
          const posting = Boolean(it.irJobPosting);
          const inHouse = it.irPosture === 'in-house';
          if (!posting && !inHouse) return { hit: false, strength: 0, value: null, label: 'No visible IR function' };
          return {
            hit: true,
            strength: posting ? 1 : 0.5,
            value: it.irJobPosting || it.irEmail,
            label: posting ? 'Open IR role posted - budget already approved' : 'In-house IR contact published',
          };
        },
      },
      {
        id: 'commsSpend',
        label: 'Pays to distribute',
        weight: 2,
        run: (it) => {
          // The sheet's "Media Provider (receipt)": a paid newswire on every
          // release proves there is already a comms budget to redirect.
          if (!it.primaryNewswire && !it.releasesLast12m) return null;
          if (!it.primaryNewswire) {
            return { hit: false, strength: 0, value: null, label: 'No paid wire detected on releases' };
          }
          return {
            hit: true,
            strength: 1,
            value: it.primaryNewswire,
            label: `Pays ${it.primaryNewswire} to distribute${it.releasesLast12m ? ` (${it.releasesLast12m} releases in 12 months)` : ''}`,
          };
        },
      },
    ],
  },
];

export const TEST_META = TESTS.map((t) => ({
  id: t.id,
  label: t.label,
  weight: t.weight,
  signals: t.signals.map((s) => ({ id: s.id, label: s.label, weight: s.weight })),
}));

// Minimum share of the model that must actually evaluate before a score is
// allowed to carry a sales-facing tier.
export const MIN_COVERAGE = Number(process.env.ISSUERS_MIN_COVERAGE || 60);

/**
 * Score one issuer.
 *
 * Scoring is coverage-aware: a signal that cannot be evaluated (missing data)
 * is excluded from both the numerator and the denominator rather than counted
 * as a miss, so a half-enriched record is not silently ranked as a bad fit. The
 * `coverage` field reports how much of the model actually ran.
 *
 * @param {object} issuer   normalized issuer record
 * @param {object} ctx      { peerStats, poolMedianPerWatcher }
 */
export function scoreIssuer(issuer, ctx = {}) {
  const tests = [];
  let earned = 0;
  let available = 0;

  for (const test of TESTS) {
    const signals = [];
    let testEarned = 0;
    let testAvailable = 0;

    for (const sig of test.signals) {
      let out = null;
      try {
        out = sig.run(issuer, ctx);
      } catch {
        out = null;
      }
      if (!out) {
        signals.push({ id: sig.id, label: sig.label, weight: sig.weight, evaluated: false });
        continue;
      }
      const strength = Math.max(0, Math.min(1, out.strength ?? (out.hit ? 1 : 0)));
      testEarned += strength * sig.weight;
      testAvailable += sig.weight;
      signals.push({
        id: sig.id,
        label: sig.label,
        weight: sig.weight,
        evaluated: true,
        hit: Boolean(out.hit),
        strength: Number(strength.toFixed(3)),
        value: out.value ?? null,
        detail: out.label || null,
      });
    }

    earned += testEarned;
    available += testAvailable;
    tests.push({
      id: test.id,
      label: test.label,
      weight: test.weight,
      score: testAvailable ? Math.round((testEarned / testAvailable) * 100) : null,
      signals,
    });
  }

  const score = available ? Math.round((earned / available) * 100) : null;
  const coverage = Math.round((available / 100) * 100);

  // A score built from a third of the model is not the same claim as one built
  // from all of it. Below the coverage floor the record is held at "unverified"
  // rather than being published as a priority target, because the cost of a rep
  // calling an unqualified name is higher than the cost of enriching it first.
  const provisional = coverage < MIN_COVERAGE;
  const tier =
    score == null ? 'unscored'
    : provisional ? 'U - unverified'
    : score >= 70 ? 'A - priority'
    : score >= 55 ? 'B - qualified'
    : score >= 40 ? 'C - watch'
    : 'D - pass';

  const eligibility = assessEligibility(issuer);

  return {
    score,
    coverage,
    provisional,
    tier,
    eligible: eligibility.eligible,
    eligibilityUnknown: eligibility.unknown,
    ineligibleReasons: eligibility.reasons,
    tests,
    reasons: tests
      .flatMap((t) => t.signals)
      .filter((s) => s.evaluated && s.hit && s.detail)
      .sort((a, b) => b.weight * b.strength - a.weight * a.strength)
      .slice(0, 5)
      .map((s) => s.detail),
  };
}

/** Score a whole universe, deriving peer context from the universe itself. */
export function scoreAll(issuers) {
  const peerStats = buildPeerStats(issuers);
  const perWatcher = issuers
    .filter((i) => i.watchers && i.avgDollarVolume3m != null)
    .map((i) => i.avgDollarVolume3m / i.watchers)
    .sort((a, b) => a - b);
  const poolMedianPerWatcher =
    perWatcher.length >= MIN_PEER_N ? perWatcher[perWatcher.length >> 1] : null;

  const ctx = { peerStats, poolMedianPerWatcher };
  return issuers.map((it) => ({ ...it, fit: scoreIssuer(it, ctx) }));
}
