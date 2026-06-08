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

export const DEMO_ARTICLES = [
  mk('Lithium producer posts record quarterly output as battery demand firms', 'Mining.com', 'https://www.mining.com/', 'mining-metals', 'positive', 'A leading lithium miner reported record quarterly production, citing tightening battery-grade supply.', '+18% QoQ', 42),
  mk('Tech firm files for IPO, seeking $4.5B valuation on the TSX', 'Financial Post', 'https://financialpost.com/', 'capital-markets', 'positive', 'A fast-growing software company filed its prospectus to list, targeting a multibillion-dollar valuation.', '$4.5B', 88),
  mk('Central bank holds rates steady, signals patience on cuts', 'Reuters', 'https://www.reuters.com/', 'macro-markets', 'neutral', 'Policymakers kept the benchmark rate unchanged and pushed back on near-term easing expectations.', '5.00%', 130),
  mk('Major miner to acquire copper developer in $2.1B all-stock deal', 'BNN Bloomberg', 'https://www.bnnbloomberg.ca/', 'deals-ma', 'positive', 'A diversified producer agreed to buy a copper developer, expanding exposure to electrification metals.', '$2.1B', 175),
  mk('Grid-scale battery storage installs jump as utilities chase reliability', 'CNBC', 'https://www.cnbc.com/', 'energy-cleantech', 'positive', 'Utility-scale storage deployments accelerated, with developers pointing to firm renewable demand.', '+34% YoY', 210),
  mk('Chipmaker guides higher on record AI accelerator backlog', 'Bloomberg', 'https://www.bloomberg.com/', 'tech-innovation', 'positive', 'The semiconductor firm raised guidance, citing a record backlog for AI accelerators.', '+27%', 260),
  mk('Gold holds near record as haven demand persists', 'Kitco', 'https://www.kitco.com/', 'mining-metals', 'neutral', 'Bullion traded near all-time highs as investors balanced rate expectations against geopolitical risk.', '$2,640/oz', 305),
  mk('Board overhaul follows activist push for stronger disclosure', 'The Globe and Mail', 'https://www.theglobeandmail.com/', 'esg-governance', 'negative', 'A shareholder campaign forced governance changes, including new directors and disclosure commitments.', '3 seats', 360),
  mk('Oil slips as demand outlook softens into the quarter', 'Investing.com', 'https://www.investing.com/', 'energy-cleantech', 'negative', 'Crude eased as traders weighed a softer demand outlook against steady supply.', '-2.4%', 410),
  mk('Index notches fresh high as breadth improves', 'Yahoo Finance', 'https://finance.yahoo.com/', 'macro-markets', 'positive', 'The benchmark closed at a record, with gains broadening beyond mega-cap leadership.', '+0.8%', 455),
  mk('Explorer reports high-grade gold intercepts at flagship project', 'The Northern Miner', 'https://www.northernminer.com/', 'mining-metals', 'positive', 'Drilling returned high-grade intercepts, lifting confidence in the resource ahead of an update.', '12.4 g/t', 510),
  mk('Software roll-up announces strategic stake from growth investor', 'Benzinga', 'https://www.benzinga.com/', 'deals-ma', 'neutral', 'A growth investor took a strategic minority stake to back the company’s acquisition pipeline.', '15% stake', 560),
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
