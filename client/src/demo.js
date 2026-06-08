// Demo mode — bundled sample data served entirely client-side so the portal is
// presentable with no API key. Activate via ?demo=1, the topbar toggle, or
// automatically when the server reports no Anthropic key.
//
// Demo content is clearly sample data: headlines link to the outlet's homepage,
// not to fabricated article URLs. With a real key the app sources live, linked
// stories instead.

let _enabled = false;
const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));

export const DEMO_PILLARS = [
  { id: 'capital-markets', name: 'Capital Markets & IPOs', accent: '#3B82F6', blurb: 'Listings, financings, capital raises, exchange moves.' },
  { id: 'mining-metals', name: 'Mining & Metals', accent: '#F59E0B', blurb: 'Producers, explorers, commodities, drill results.' },
  { id: 'energy-cleantech', name: 'Energy & Cleantech', accent: '#10B981', blurb: 'Oil & gas, renewables, batteries, the transition.' },
  { id: 'tech-innovation', name: 'Technology & Innovation', accent: '#8B5CF6', blurb: 'AI, software, semis, frontier tech.' },
  { id: 'deals-ma', name: 'Deals & M&A', accent: '#EC4899', blurb: 'Mergers, acquisitions, takeovers, strategic stakes.' },
  { id: 'macro-markets', name: 'Macro & Markets', accent: '#06B6D4', blurb: 'Rates, inflation, indices, the broad tape.' },
  { id: 'esg-governance', name: 'ESG & Governance', accent: '#22C55E', blurb: 'Sustainability, disclosure, boards, stewardship.' },
];

const now = Date.now();
const mk = (title, source, url, pillar, sentiment, summary, stat, mins) => ({
  id: `${url}#${mins}`,
  title, source, url, pillar, sentiment, summary, stat,
  description: summary,
  image: null,
  publishedAt: new Date(now - mins * 60000).toISOString(),
});

// Real, specific article URLs (snapshot — sourced via web search). In live mode
// the server returns fresh stories with their own exact links automatically.
export const DEMO_ARTICLES = [
  mk('Cerebras pops 68% in Nasdaq debut, pushing the AI chipmaker’s market cap to $95 billion', 'CNBC', 'https://www.cnbc.com/2026/05/14/cerebras-cbrs-stock-trade-nasdaq-ipo.html', 'capital-markets', 'positive', 'AI chipmaker Cerebras soared 68% in its Nasdaq debut after raising $5.5B — the largest US tech IPO since Uber — lifting its market cap near $95B.', '+68%', 38),
  mk('Honeywell’s Quantinuum raises $1.68 billion in U.S. IPO as quantum computing heats up', 'CNBC', 'https://www.cnbc.com/2026/06/04/quantinuum-qnt-stock-first-trade-ipo.html', 'capital-markets', 'neutral', 'Honeywell-backed Quantinuum raised $1.68B and began trading on the Nasdaq under “QNT” as investor appetite for quantum computing builds.', '$1.68B', 76),
  mk('Global lithium production hits record high on electric vehicle demand', 'Mining.com', 'https://www.mining.com/global-lithium-production-hits-record-high-on-electric-vehicle-demand/', 'mining-metals', 'positive', 'Global lithium production hit a record high as EV and energy-storage demand pulled the market out of a multi-year slump.', 'record', 120),
  mk('Gold’s average price set to rise 43% to a record in 2026, even as demand dips — Metals Focus', 'Kitco', 'https://www.kitco.com/news/article/2026-06-05/gold-demand-will-drop-year-even-supply-increases-average-price-will-still', 'mining-metals', 'neutral', 'Metals Focus projects the average gold price will rise 43% to a record near $4,920 in 2026, even as demand softens and supply grows.', '+43%', 165),
  mk('Hudbay Minerals to buy Arizona Sonoran in $1B all-stock deal', 'Mining.com', 'https://www.mining.com/hudbay-minerals-to-buy-arizona-sonoran-in-1b-deal/', 'deals-ma', 'positive', 'Hudbay agreed to acquire Arizona Sonoran in an all-stock deal worth ~C$1.48B at a 30% premium, forging North America’s third-largest copper district.', 'C$1.48B', 205),
  mk('New U.S. electric generating capacity expected to reach a record high in 2026', 'U.S. EIA', 'https://www.eia.gov/todayinenergy/detail.php?id=67205', 'energy-cleantech', 'positive', 'US generating capacity is set for a record 2026, with battery storage making up 28% of additions — 24.3 GW — second only to solar.', '24.3 GW', 240),
  mk('The battery linchpin: why energy storage is the only way to safely power the AI boom', 'pv magazine', 'https://pv-magazine-usa.com/2026/04/02/the-battery-linchpin-why-energy-storage-is-the-only-the-only-way-to-safely-power-the-ai-boom/', 'energy-cleantech', 'positive', 'Grid-scale storage is emerging as the linchpin for powering the AI data-center boom, with the world set to add ~353 GWh in 2026.', '353 GWh', 285),
  mk('Broadcom Q2 2026 earnings: AI chip revenue doubles, but stock sinks on guidance', 'Yahoo Finance', 'https://finance.yahoo.com/markets/stocks/articles/broadcom-q2-2026-earnings-ai-111613207.html', 'tech-innovation', 'negative', 'Broadcom’s AI chip revenue doubled year over year, but shares sank after $16B guidance came in below estimates and it declined to lift its forecast.', '$16B guide', 300),
  mk('ASML stock sinks amid tightening China restrictions despite strong earnings, guidance', 'CNBC', 'https://www.cnbc.com/2026/04/15/asml-q1-2026-earnings-report.html', 'tech-innovation', 'neutral', 'ASML shares slid on tightening China export restrictions even as quarterly earnings and guidance beat expectations.', 'beat', 330),
  mk('Fed holds rates steady amid dissent in April 2026 decision', 'CNBC', 'https://www.cnbc.com/2026/04/29/fed-interest-rate-decision-april-2026.html', 'macro-markets', 'neutral', 'The Fed held its benchmark rate at 3.50%–3.75% in an unusually divided 8-4 vote, pushing back on bets for near-term cuts.', '3.50–3.75%', 360),
  mk('S&P 500 posts first close above 7,600 as tech rally overpowers oil spike', 'CNBC', 'https://www.cnbc.com/2026/06/01/stock-market-today-live-updates.html', 'macro-markets', 'positive', 'The S&P 500 closed above 7,600 for the first time, extending a record run led by technology and AI-linked names.', '7,609.78', 410),
  mk('Activist Plantro pushes for board overhaul at Ag Growth International', 'Bloomberg', 'https://www.bloomberg.com/news/articles/2026-01-22/activist-plantro-pushes-for-board-overhaul-at-ag-growth-international', 'esg-governance', 'negative', 'Activist Plantro pressed Ag Growth for a board overhaul, citing a governance breakdown after a regulatory cease-trade order and CEO departure.', '~5% stake', 480),
];

function analyzeFor(story) {
  const p = DEMO_PILLARS.find((x) => x.id === story.pillar);
  const trend = story.sentiment === 'positive' ? 'rising' : story.sentiment === 'negative' ? 'cooling' : 'steady';
  return {
    summary: `${story.summary} For Market One audiences, it’s a clean read on momentum in ${p ? p.name.toLowerCase() : 'the sector'}.`,
    whyItMatters: `This matters because it reinforces the prevailing thesis in ${p ? p.name : 'the space'} and sets up the next catalyst. The signal is in the direction of travel — ${story.stat !== '—' ? `the ${story.stat} figure` : 'the underlying data'} suggests the move has legs, though execution and pricing remain the swing factors to watch.`,
    takeaways: [
      `The headline number (${story.stat}) is the proof point, not the story itself.`,
      'Watch whether the trend holds into the next reporting period.',
      `Positioning in ${p ? p.name : 'the sector'} should weigh durability over the one-off print.`,
    ],
    sentiment: story.sentiment,
    trend,
    stat: story.stat,
  };
}

function generateFor(story, format) {
  const tag = `#${(story.pillar || 'markets').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;
  const templates = {
    linkedin: `${story.title}.\n\nThe takeaway isn’t the headline number — it’s the direction of travel. ${story.summary}\n\nFor capital-markets audiences, the signal (${story.stat}) points to momentum, but the durability of the trend is what turns a good print into a real thesis.\n\nThe question for next quarter: does it hold?\n\n${tag} #CapitalMarkets #MarketOne`,
    x: `${story.title} — ${story.stat}. The real signal is the trend, not the print. ${tag}`,
    instagram: `${story.title} 📈\n\n${story.summary}\n\nThe number to know: ${story.stat}. The question that matters: does the trend hold?\n\n${tag} #markets #finance #MarketOne #investing`,
    newsletter: `SUBJECT: ${story.title}\n\n${story.summary} The figure to anchor on is ${story.stat}.\n\nWhy it matters: it reinforces the prevailing thesis and sets up the next catalyst — watch for durability over the next print.`,
    blog: `# ${story.title}\n\n${story.summary} It’s a small headline with an outsized signal: ${story.stat} tells you where momentum is heading.\n\nIn this piece, we unpack what the move means for the sector, who it favors, and the catalysts worth watching from here.`,
    reel: `[HOOK] ${story.title}?\n[BEAT 1] Here’s the number that matters: ${story.stat}.\n[BEAT 2] ${story.summary}\n[BEAT 3] The real question — does the trend hold?\n[CTA] Follow Market One for the read that moves markets.`,
  };
  return templates[format] || templates.linkedin;
}

export const demo = {
  get enabled() { return _enabled; },
  set(v) { _enabled = Boolean(v); },
  async config() {
    await wait(120);
    return { pillars: DEMO_PILLARS, sourcing: 'demo', model: 'demo', slackConfigured: false, hasAnthropicKey: false, demo: true };
  },
  async news({ q = '', from = '', page = 1 } = {}) {
    await wait();
    let rows = DEMO_ARTICLES;
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((a) => `${a.title} ${a.summary} ${a.source}`.toLowerCase().includes(needle));
    }
    return { articles: rows, page: 1, hasMore: false, sourcing: 'demo' };
  },
  async analyze(story) { await wait(560); return { analysis: analyzeFor(story) }; },
  async generate(story, format) { await wait(680); return { text: generateFor(story, format), format }; },
  async refine(text) { await wait(520); return { text: (text || '').replace(/\s+/g, ' ').trim() }; },
  async slack() { await wait(80); return { delivered: false, reason: 'demo' }; },
};

export function initialDemoFromUrl() {
  try {
    if (window.__M1_FORCE_DEMO__) return true; // standalone/offline build flag
    return new URLSearchParams(window.location.search).has('demo');
  } catch {
    return false;
  }
}
