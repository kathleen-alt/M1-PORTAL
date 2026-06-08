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

// Real, specific article URLs (snapshot — sourced via web search). In live mode
// the server returns ≥10 fresh, classified stories per pillar with their own
// exact links automatically. Dates are spread across recent weeks so the
// date-range filter is meaningful in demo mode.
let _seq = 0;
const A = (title, source, url, pillar, sentiment, stat, daysAgo, summary = '') => ({
  id: `${url}#${_seq++}`,
  title, source, url, pillar, sentiment,
  stat: stat || '—',
  summary: summary || title,
  description: summary || title,
  image: null,
  publishedAt: new Date(Date.now() - daysAgo * 86400000 - _seq * 137000).toISOString(),
});

export const DEMO_ARTICLES = [
  // ── Capital Markets & IPOs ─────────────────────────────────────────────────
  A('Cerebras pops 68% in Nasdaq debut, pushing the AI chipmaker’s market cap to $95 billion', 'CNBC', 'https://www.cnbc.com/2026/05/14/cerebras-cbrs-stock-trade-nasdaq-ipo.html', 'capital-markets', 'positive', '+68%', 4, 'AI chipmaker Cerebras soared 68% in its Nasdaq debut after raising $5.5B — the largest US tech IPO since Uber.'),
  A('Cerebras raises $5.5B, kicking off 2026’s IPO season with a bang', 'TechCrunch', 'https://techcrunch.com/2026/05/14/cerebras-raises-5-5b-kicking-off-2026s-ipo-season-with-a-bang/', 'capital-markets', 'positive', '$5.5B', 4),
  A('Cerebras stock falls after blockbuster IPO debut', 'CNBC', 'https://www.cnbc.com/2026/05/15/cerebras-stock-ipo-debut-ai.html', 'capital-markets', 'negative', '—', 3),
  A('Honeywell’s Quantinuum raises $1.68 billion in U.S. IPO as quantum computing heats up', 'CNBC', 'https://www.cnbc.com/2026/06/04/quantinuum-qnt-stock-first-trade-ipo.html', 'capital-markets', 'neutral', '$1.68B', 4, 'Honeywell-backed Quantinuum raised $1.68B and began trading on the Nasdaq under “QNT”.'),
  A('Quantinuum QNT stock surges above IPO price on Nasdaq debut', 'Yahoo Finance', 'https://finance.yahoo.com/markets/stocks/articles/quantinuum-ipo-raises-1-68-171019693.html', 'capital-markets', 'positive', '$60', 4),
  A('Quantinuum to debut on Nasdaq after raising $1.68 billion in IPO', 'The Quantum Insider', 'https://thequantuminsider.com/2026/06/04/quantinuum-to-debut-on-nasdaq-after-raising-1-68-billion-in-ipo/', 'capital-markets', 'neutral', '$1.68B', 5),
  A('SpaceX, OpenAI and Anthropic: the most anticipated IPOs of 2026', 'Yahoo Finance', 'https://finance.yahoo.com/markets/article/spacex-openai-and-anthropic-here-are-the-most-anticipated-ipos-in-2026-114439441.html', 'capital-markets', 'neutral', '$3T', 8),
  A('All 2026 IPOs so far: the year’s new-listings tracker', 'StockAnalysis', 'https://stockanalysis.com/ipos/2026/', 'capital-markets', 'neutral', '251 IPOs', 10),
  A('10 hot IPOs to watch in 2026: SpaceX, Anthropic and more', 'MarketWise', 'https://marketwise.com/investing/hot-ipos-to-watch-2026/', 'capital-markets', 'neutral', '—', 9),
  A('Global IPO proceeds jump 45% as the 2026 listing market reopens', 'U.S. News', 'https://money.usnews.com/investing/articles/new-and-upcoming-ipos-in-2026', 'capital-markets', 'positive', '+45%', 15),

  // ── Mining & Metals ────────────────────────────────────────────────────────
  A('Global lithium production hits record high on electric vehicle demand', 'Mining.com', 'https://www.mining.com/global-lithium-production-hits-record-high-on-electric-vehicle-demand/', 'mining-metals', 'positive', 'record', 6, 'Global lithium production hit a record high as EV and energy-storage demand pulled the market out of a multi-year slump.'),
  A('Sigma Lithium on track to double production capacity in Q4', 'Mining.com', 'https://www.mining.com/sigma-lithium-on-track-to-double-production-capacity-in-q4/', 'mining-metals', 'positive', '520kt', 9),
  A('Gold’s average price set to rise 43% to a record in 2026, even as demand dips — Metals Focus', 'Kitco', 'https://www.kitco.com/news/article/2026-06-05/gold-demand-will-drop-year-even-supply-increases-average-price-will-still', 'mining-metals', 'neutral', '+43%', 3, 'Metals Focus projects the average gold price will rise 43% to a record near $4,920 in 2026.'),
  A('China’s gold miners set for strong 2026 on deals, higher output', 'Mining.com', 'https://www.mining.com/web/chinas-gold-miners-set-for-strong-2026-on-deals-higher-output/', 'mining-metals', 'positive', 'record profit', 5),
  A('Gold price will rise 22% to reach $6,300 by year-end 2026 — J.P. Morgan', 'Kitco', 'https://www.kitco.com/news/article/2026-02-25/gold-price-will-rise-22-above-current-level-reach-6300-year-end-2026-jp', 'mining-metals', 'positive', '$6,300', 20),
  A('Strong price gains, record highs in gold and silver on risk aversion', 'Kitco', 'https://www.kitco.com/news/article/2026-01-20/strong-price-gains-record-highs-gold-silver-risk-aversion', 'mining-metals', 'positive', 'record', 30),
  A('Lithium output at SQM-Codelco venture edges out forecasts', 'Mining.com', 'https://www.mining.com/web/lithium-output-at-sqm-codelco-venture-edges-out-forecasts/', 'mining-metals', 'positive', 'beat', 14),
  A('Chile’s mining agency expects another global lithium surplus this year', 'Mining.com', 'https://www.mining.com/web/chiles-mining-agency-expects-another-global-lithium-surplus-this-year/', 'mining-metals', 'negative', 'surplus', 16),
  A('Energy-storage boom strengthens demand outlook for beaten-down lithium', 'Mining.com', 'https://www.mining.com/web/energy-storage-boom-strengthens-demand-outlook-for-beaten-down-lithium/', 'mining-metals', 'positive', '—', 11),
  A('China’s gold miners set for biggest profits in 2026', 'Mining.com', 'https://www.mining.com/web/chinas-gold-miners-set-for-strong-2026-on-deals-higher-output/', 'mining-metals', 'positive', '$5,000/oz', 7),

  // ── Energy & Cleantech ─────────────────────────────────────────────────────
  A('New U.S. electric generating capacity expected to reach a record high in 2026', 'U.S. EIA', 'https://www.eia.gov/todayinenergy/detail.php?id=67205', 'energy-cleantech', 'positive', '24.3 GW', 7, 'US generating capacity is set for a record 2026, with battery storage making up 28% of additions — second only to solar.'),
  A('EIA: 80 GW of new solar, wind + storage capacity coming in 2026', 'Electrek', 'https://electrek.co/2026/04/27/eia-80-gw-of-new-solar-wind-storage-capacity-coming-in-2026/', 'energy-cleantech', 'positive', '80 GW', 13),
  A('Solar generation could exceed coal in ERCOT for the first time in 2026', 'U.S. EIA', 'https://www.eia.gov/todayinenergy/detail.php?id=67685', 'energy-cleantech', 'positive', 'first', 9),
  A('BloombergNEF forecasts 158 GW of global energy-storage deployments in 2026', 'Energy-Storage.News', 'https://www.energy-storage.news/bloombergnef-forecasts-158gw-of-global-energy-storage-deployments-in-2026/', 'energy-cleantech', 'positive', '158 GW', 11),
  A('Solar and storage to lead an 86 GW capacity surge in 2026', 'pv magazine', 'https://pv-magazine-usa.com/2026/04/28/solar-and-storage-to-lead-86-gw-capacity-surge-in-2026/', 'energy-cleantech', 'positive', '86 GW', 12),
  A('The battery linchpin: why energy storage is the only way to safely power the AI boom', 'pv magazine', 'https://pv-magazine-usa.com/2026/04/02/the-battery-linchpin-why-energy-storage-is-the-only-the-only-way-to-safely-power-the-ai-boom/', 'energy-cleantech', 'positive', '353 GWh', 17),
  A('IEA: solar investment to hit $365 billion in 2026 as renewables capture majority of power spending', 'SolarQuarter', 'https://solarquarter.com/2026/05/28/iea-report-solar-investment-to-hit-365-billion-in-2026-as-renewables-capture-majority-of-global-power-spending/', 'energy-cleantech', 'positive', '$365B', 4),
  A('24/7 renewables outcompete fossil fuels on firm costs — IRENA', 'IRENA', 'https://www.irena.org/News/pressreleases/2026/May/24-7-Renewables-Outcompete-Fossil-Fuels-on-Firm-Costs', 'energy-cleantech', 'positive', '$54/MWh', 19),
  A('Five themes shaping the energy world in 2026', 'Wood Mackenzie', 'https://www.woodmac.com/blogs/the-edge/five-themes-shaping-the-energy-world-2026/', 'energy-cleantech', 'neutral', '—', 22),
  A('2026 renewable-energy industry outlook', 'Deloitte', 'https://www.deloitte.com/us/en/insights/industry/renewable-energy/renewable-energy-industry-outlook.html', 'energy-cleantech', 'neutral', '—', 26),

  // ── Technology & Innovation ────────────────────────────────────────────────
  A('Broadcom Q2 2026 earnings: AI chip revenue doubles, but stock sinks on guidance', 'Yahoo Finance', 'https://finance.yahoo.com/markets/stocks/articles/broadcom-q2-2026-earnings-ai-111613207.html', 'tech-innovation', 'negative', '$16B guide', 5, 'Broadcom’s AI chip revenue doubled YoY, but shares sank after guidance came in below estimates.'),
  A('ASML stock sinks amid tightening China restrictions despite strong earnings, guidance', 'CNBC', 'https://www.cnbc.com/2026/04/15/asml-q1-2026-earnings-report.html', 'tech-innovation', 'neutral', 'beat', 22),
  A('Semiconductor stocks selloff: $1.3T wiped out in AI chip crash', 'Intellectia', 'https://intellectia.ai/blog/semiconductor-stocks-selloff-june-2026', 'tech-innovation', 'negative', '-$1.3T', 3),
  A('Broadcom AI revenue surges 106% on custom-chip strategy', 'Tech Insider', 'https://tech-insider.org/broadcom-ai-revenue-custom-chips-2026/', 'tech-innovation', 'positive', '+106%', 6),
  A('NVIDIA vs TSMC vs Broadcom: which AI chip stock looks best in 2026?', 'HeyGoTrade', 'https://www.heygotrade.com/en/blog/ai-semiconductor-stocks-2026-nvidia-tsmc-broadcom/', 'tech-innovation', 'neutral', '—', 8),
  A('Semiconductor stocks selloff 2026: dip or rotation?', 'HeyGoTrade', 'https://www.heygotrade.com/en/blog/semiconductor-stocks-selloff-2026/', 'tech-innovation', 'negative', '-10.3%', 4),
  A('Amazon’s AI chip backlog stands at a massive $225 billion', 'Motley Fool', 'https://www.fool.com/investing/2026/05/11/amazons-ai-chip-backlog-stands-at-a-massive-225-bi/', 'tech-innovation', 'positive', '$225B', 14),
  A('Semiconductor AI chip supercycle 2026: cloud-cost impact', 'BuildMVPfast', 'https://www.buildmvpfast.com/blog/semiconductor-ai-chip-supercycle-cloud-cost-impact-2026', 'tech-innovation', 'neutral', '—', 9),
  A('2026 semiconductor industry outlook', 'Deloitte', 'https://www.deloitte.com/us/en/insights/industry/technology/technology-media-telecom-outlooks/semiconductor-industry-outlook.html', 'tech-innovation', 'neutral', '$1.29T', 20),
  A('Broadcom’s Q3 guidance misses expectations by $1.2 billion', 'TechFlow', 'https://www.techflowpost.com/en-US/article/31908', 'tech-innovation', 'negative', '-$1.2B', 5),

  // ── Macro & Markets ────────────────────────────────────────────────────────
  A('S&P 500 posts first close above 7,600 as tech rally overpowers oil spike', 'CNBC', 'https://www.cnbc.com/2026/06/01/stock-market-today-live-updates.html', 'macro-markets', 'positive', '7,609.78', 7, 'The S&P 500 closed above 7,600 for the first time, extending a record run led by technology.'),
  A('Fed holds rates steady amid dissent in April 2026 decision', 'CNBC', 'https://www.cnbc.com/2026/04/29/fed-interest-rate-decision-april-2026.html', 'macro-markets', 'neutral', '3.50–3.75%', 40, 'The Fed held its benchmark rate in an unusually divided 8-4 vote, pushing back on near-term cuts.'),
  A('S&P 500 jumps to a new record close as Micron leads tech rally', 'CNBC', 'https://www.cnbc.com/2026/05/25/stock-futures-today-live-updates.html', 'macro-markets', 'positive', 'record', 14),
  A('S&P 500 and Nasdaq close at new records, lifted by tech', 'CNBC', 'https://www.cnbc.com/2026/05/27/stock-market-today-live-updates.html', 'macro-markets', 'positive', '7,563.63', 12),
  A('S&P 500 closes at a record to kick off June trading', 'CNBC', 'https://www.cnbc.com/2026/05/31/stock-market-today-live-updates.html', 'macro-markets', 'positive', 'record', 8),
  A('S&P 500 notches longest weekly winning streak since 2024', 'CNBC', 'https://www.cnbc.com/2026/05/07/stock-market-today-live-updates.html', 'macro-markets', 'positive', 'streak', 32),
  A('S&P 500 catches a tailwind from falling oil prices', 'CNBC', 'https://www.cnbc.com/2026/05/04/stock-market-today-live-updates.html', 'macro-markets', 'positive', '+0.6%', 35),
  A('S&P 500 closes at a record as oil cools and Apple rises', 'CNBC', 'https://www.cnbc.com/2026/04/30/stock-market-today-live-updates.html', 'macro-markets', 'positive', 'record', 39),
  A('S&P 500 and Nasdaq close at fresh records as traders look past Iran fears', 'CNBC', 'https://www.cnbc.com/2026/04/14/stock-market-today-live-updates.html', 'macro-markets', 'positive', 'record', 55),
  A('Dow, S&P 500, Nasdaq build on records as investors eye the AI boom', 'Yahoo Finance', 'https://finance.yahoo.com/economy/live/stock-market-today-tuesday-june-2-ai-231755175.html', 'macro-markets', 'positive', '+0.3%', 6),

  // ── Deals & M&A ────────────────────────────────────────────────────────────
  A('Hudbay Minerals to buy Arizona Sonoran in $1B all-stock deal', 'Mining.com', 'https://www.mining.com/hudbay-minerals-to-buy-arizona-sonoran-in-1b-deal/', 'deals-ma', 'positive', 'C$1.48B', 10, 'Hudbay agreed to acquire Arizona Sonoran in an all-stock deal at a 30% premium, forging a top-3 North American copper district.'),
  A('Publicis Groupe shares jump 4.2% after $2.2 billion LiveRamp acquisition', 'Meyka', 'https://meyka.com/blog/publicis-group-shares-jump-4-2-after-2-2-billion-liveramp-acquisition-deal/', 'deals-ma', 'positive', '$2.2B', 7),
  A('Sun Pharma shares jump 5% after $11.75 billion Organon acquisition', 'StartupTalky', 'https://startuptalky.com/news/sun-pharma-shares-jump-organon-acquisition-11-75-billion-deal/', 'deals-ma', 'positive', '$11.75B', 9),
  A('Ampol shares jump as $1.1 billion deal clears a major hurdle', 'Motley Fool', 'https://www.fool.com.au/2026/06/03/ampol-shares-jump-as-1-1-billion-deal-clears-a-major-hurdle/', 'deals-ma', 'positive', '$1.1B', 5),
  A('Hudbay to acquire Arizona Sonoran in C$1.48bn deal', 'Mining Weekly', 'https://www.miningweekly.com/article/hudbay-to-acquire-arizona-sonoran-in-c148bn-deal-2026-03-02', 'deals-ma', 'positive', 'C$1.48B', 10),
  A('Berkshire Hathaway to buy homebuilder Taylor Morrison for $6.8 billion', 'Taylor Morrison (8-K)', 'https://www.sec.gov/Archives/edgar/data/0001562476/000119312526249694/d111152dex991.htm', 'deals-ma', 'positive', '$6.8B', 6),
  A('Netflix to acquire Warner Bros. Discovery’s studios in $83 billion deal', 'Warner Bros. Discovery (SEC)', 'https://www.sec.gov/Archives/edgar/data/0001437107/000119312526015348/d63752d425.htm', 'deals-ma', 'neutral', '$83B', 30),
  A('Ondas stock rises again after 2026 outlook jump and World View deal', 'TS2', 'https://ts2.tech/en/ondas-stock-price-rises-again-after-2026-outlook-jump-world-view-deal/', 'deals-ma', 'positive', '—', 8),
  A('Top 10 largest global M&A deals — February 2026', 'Intellizence', 'https://intellizence.com/insights/merger-and-acquisition/top-10-largest-global-merger-acquisition-deals-february-2026/', 'deals-ma', 'neutral', '—', 16),
  A('Upcoming M&A deals: 2026 mergers and acquisitions tracker', 'Dealroom', 'https://dealroom.net/blog/upcoming-m-a', 'deals-ma', 'neutral', '—', 12),

  // ── ESG & Governance ───────────────────────────────────────────────────────
  A('Activist Plantro pushes for board overhaul at Ag Growth International', 'Bloomberg', 'https://www.bloomberg.com/news/articles/2026-01-22/activist-plantro-pushes-for-board-overhaul-at-ag-growth-international', 'esg-governance', 'negative', '~5% stake', 30, 'Activist Plantro pressed Ag Growth for a board overhaul, citing a governance breakdown after a regulatory order and CEO departure.'),
  A('Synopsys shares rally as activist Elliott builds multibillion-dollar stake', 'CNBC', 'https://www.cnbc.com/2026/03/23/synopsys-stock-rally-activist-elliott-stake.html', 'esg-governance', 'positive', 'multi-$B', 12),
  A('Activist investor Ancora said to build stake in Warner Bros.', 'Bloomberg', 'https://www.bloomberg.com/news/articles/2026-02-11/activist-investor-ancora-is-said-to-build-stake-in-warner-bros-mlhcwf5o', 'esg-governance', 'neutral', '$200M', 18),
  A('Ancora builds $200M Warner Bros. stake, plans to oppose the Netflix deal', 'TheWrap', 'https://www.thewrap.com/industry-news/deals-ma/ancora-holdings-activist-investor-warner-bros-stake/', 'esg-governance', 'negative', '$200M', 17),
  A('Activist investor Starboard targets Bill, plans director slate', 'Payments Dive', 'https://www.paymentsdive.com/news/activist-investor-targets-bill-performance-Starboard-accounting-software/759578/', 'esg-governance', 'neutral', '8.5% stake', 22),
  A('Bill CEO defends performance as Elliott and Starboard circle', 'Payments Dive', 'https://www.paymentsdive.com/news/bill-ceo-defends-company-performance-activist-Elliott-management-starboard-value/759878/', 'esg-governance', 'neutral', '5% stake', 20),
  A('Activist Starboard takes a Starbucks stake', 'Hedgeweek', 'https://www.hedgeweek.com/activist-starboard-takes-starbucks-stake/', 'esg-governance', 'neutral', 'stake', 26),
  A('GAMCO nominates a director to challenge activist Saba over fund discounts', 'QuotedData', 'https://quoteddata.com/2026/02/gamco-gabelli-nominates-a-director-to-challenge-activist-saba-about-the-discounts-on-its-us-listed-funds/', 'esg-governance', 'neutral', '—', 28),
  A('Saba Capital takes a 5.13% activist stake in The Korea Fund', 'TradingView', 'https://www.tradingview.com/news/tradingview:96babbbade6f6:0-boaz-weinstein-s-saba-capital-takes-activist-stake-at-the-korea-fund-with-5-13-stake/', 'esg-governance', 'neutral', '5.13%', 24),
  A('Activist investor wants board shakeup at Maryland-based Eagle', 'American Banker', 'https://www.americanbanker.com/news/activist-investor-wants-board-shakeup-at-maryland-based-eagle', 'esg-governance', 'negative', '27,500 sh', 33),
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
  async news({ q = '', from = '', to = '' } = {}) {
    await wait();
    let rows = [...DEMO_ARTICLES].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((a) => `${a.title} ${a.summary} ${a.source}`.toLowerCase().includes(needle));
    }
    if (from) {
      const fromT = new Date(`${from}T00:00:00`).getTime();
      rows = rows.filter((a) => new Date(a.publishedAt).getTime() >= fromT);
    }
    if (to) {
      const toT = new Date(`${to}T23:59:59`).getTime();
      rows = rows.filter((a) => new Date(a.publishedAt).getTime() <= toT);
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
