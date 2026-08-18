// Demo mode — bundled sample data served entirely client-side so the portal is
// presentable with no API key. Activate via ?demo=1, the topbar toggle, or
// automatically when the server reports no Anthropic key.
//
// Real, specific article URLs (snapshot — sourced via web search). In live mode
// the server returns ≥10 fresh, classified stories per pillar with their own
// exact links. Dataset is brand-aware (Market One vs Bullionaire).

import { BRANDS, activeBrandId, getBrand } from './brand';

let _enabled = false;
const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));

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

const MARKETONE_ARTICLES = [
  // ── Capital Markets & IPOs ────────────────────────────────────
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

  // ── Mining & Metals ────────────────────────────────────────
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

  // ── Energy & Cleantech ────────────────────────────────────
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

  // ── Technology & Innovation ─────────────────────────────────
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

  // ── Macro & Markets ────────────────────────────────────────
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

  // ── Deals & M&A ─────────────────────────────────────────
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

  // ── ESG & Governance ────────────────────────────────────
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

// ── Bullionaire — precious-metals edition ────────────────────────────
const BULLIONAIRE_ARTICLES = [
  // Gold
  A('Gold’s average price set to rise 43% to a record in 2026, even as demand dips — Metals Focus', 'Kitco', 'https://www.kitco.com/news/article/2026-06-05/gold-demand-will-drop-year-even-supply-increases-average-price-will-still', 'gold', 'neutral', '+43%', 3, 'Metals Focus projects the average gold price will rise 43% to a record near $4,920 in 2026.'),
  A('Gold price will rise 22% to reach $6,300 by year-end 2026 — J.P. Morgan', 'Kitco', 'https://www.kitco.com/news/article/2026-02-25/gold-price-will-rise-22-above-current-level-reach-6300-year-end-2026-jp', 'gold', 'positive', '$6,300', 20),
  A('71% of retail investors see gold trading above $5,000/oz in 2026', 'Kitco', 'https://www.kitco.com/news/article/2026-01-02/71-retail-investors-see-gold-trading-above-5000oz-2026-banks-and-experts', 'gold', 'positive', '$5,000', 26),
  A('Gold will be the primary hedge and performance driver in 2026 — Bank of America', 'Kitco', 'https://www.kitco.com/news/article/2026-01-05/gold-will-be-primary-hedge-and-performance-driver-2026-silver-could-top-out', 'gold', 'positive', 'hedge', 30),
  A('Record start to 2026 brings the prospect of $5,000 gold into view', 'Kitco', 'https://www.kitco.com/news/off-the-wire/2026-01-14/record-start-2026-brings-prospect-5000-gold-price-view', 'gold', 'positive', '$5,000', 28),
  A('2026 is shaping up to be another record-breaking year for gold', 'Kitco', 'https://www.kitco.com/opinion/2026-02-11/2026-shaping-be-another-record-breaking-year-gold', 'gold', 'positive', 'record', 23),
  A('J.P. Morgan sees gold at $5,055 by Q4 2026 as China and crypto add demand', 'Kitco', 'https://www.kitco.com/news/article/2025-12-22/jp-morgan-sees-gold-5055-q4-2026-china-and-cryptosphere-add-new-demand', 'gold', 'positive', '$5,055', 34),
  A('Gold will reach $5,000/oz by Q1 2026 amid a broader commodities rally — UBS', 'Kitco', 'https://www.kitco.com/news/article/2026-01-06/gold-will-reach-5000oz-q1-2026-amid-broader-commodities-rally-ubs', 'gold', 'positive', '$5,000', 27),
  A('Strong price gains, record highs in gold and silver on risk aversion', 'Kitco', 'https://www.kitco.com/news/article/2026-01-20/strong-price-gains-record-highs-gold-silver-risk-aversion', 'gold', 'positive', 'record', 30),
  A('Gold still set to gain 20% above current prices in 2026 — UBS', 'Kitco', 'https://www.kitco.com/news/article/2026-03-16/gold-still-set-gain-20-above-current-prices-2026-ubs', 'gold', 'positive', '+20%', 16),

  // Silver & PGMs
  A('Silver could outgain gold again in 2026, but may face early headwinds', 'Kitco', 'https://www.kitco.com/news/article/2025-12-19/silver-could-outgain-gold-again-2026-may-face-some-early-headwinds', 'silver-pgms', 'positive', 'outgain', 33, 'Comex silver set an all-time record of $67.38 to end 2025 at more than double its 2024 close.'),
  A('57% of retail investors expect silver to trade above $100/oz in 2026', 'Kitco', 'https://www.kitco.com/news/article/2025-12-26/57-retail-investors-expect-silver-trade-above-100oz-2026-experts-see', 'silver-pgms', 'positive', '$100', 31),
  A('Silver could top out between $135 and $309 in 2026 — Bank of America', 'Kitco', 'https://www.kitco.com/news/article/2026-01-05/gold-will-be-primary-hedge-and-performance-driver-2026-silver-could-top-out', 'silver-pgms', 'positive', '$135–309', 30),
  A('Silver price outlooks chopped as supply deficit forecast to narrow — UBS', 'Kitco', 'https://www.kitco.com/news/article/2026-05-14/silver-price-outlooks-chopped-supply-deficit-forecasted-narrow-dramatically', 'silver-pgms', 'negative', 'cut', 5),
  A('Gold up to $4,400, silver mid-$40s, but PGMs will lead the pack in 2026 — TD Securities', 'Kitco', 'https://www.kitco.com/news/article/2025-12-04/gold-4400-silver-down-mid-40s-pgms-will-lead-pack-2026-td-securities', 'silver-pgms', 'neutral', 'PGMs lead', 36),
  A('Platinum price jumps 8% as the 2026 supply deficit returns to focus', 'EBC', 'https://www.ebc.com/forex/platinum-price-jumps-2026-supply-deficit', 'silver-pgms', 'positive', '+8%', 12),
  A('Metals Focus: bullish on platinum, bearish on palladium in 2026', 'Investing News', 'https://investingnews.com/metals-focus-platinum-palladium-outlook/', 'silver-pgms', 'neutral', 'split', 18),
  A('Platinum poised for strong 2026 as supply constraints offset EV headwinds', 'Kitco', 'https://www.kitco.com/news/article/2026-01-02/platinum-poised-strong-2026-supply-constraints-offset-ev-headwinds', 'silver-pgms', 'positive', 'deficit', 25),
  A('Palladium struggles with surplus risk — H2 2026 outlook', 'NAI 500', 'https://nai500.com/blog/2026/07/platinum-poised-for-structural-deficit-lift-palladium-struggles-with-surplus-risk-h2-2026-outlook/', 'silver-pgms', 'negative', 'surplus', 9),
  A('Precious-metals forecast 2026: Heraeus expects prices to reset', 'Heraeus', 'https://www.heraeus-precious-metals.com/en/company/press-and-news/heraeus-precious-metals-forecast-2026/', 'silver-pgms', 'neutral', 'reset', 21),

  // Miners & Producers
  A('Newmont hits record $3.3B net income in Q1 2026 on soaring gold prices', 'Discovery Alert', 'https://discoveryalert.com.au/newmont-record-earnings-gold-miner-free-cash-flow-2026/', 'miners', 'positive', '$3.3B', 15, 'Newmont posted record Q1 net income of $3.3B, fueled by soaring gold prices and strong operating leverage.'),
  A('Barrick’s Q2 earnings and sales top estimates on higher prices', 'Yahoo Finance', 'https://finance.yahoo.com/markets/commodities/articles/barrick-minings-q2-earnings-sales-121700925.html', 'miners', 'positive', '+50%', 8),
  A('Barrick Q2 2026 highlights: record gold production, 3% above guidance', 'Investing.com', 'https://ca.investing.com/news/company-news/barrick-mining-corp-b-q2-2026-earnings-call-highlights-record-gold-production-and--4790883', 'miners', 'positive', '+3%', 8),
  A('Gold demand climbs as top miners post record Q1 earnings', 'VanEck', 'https://www.vaneck.com/us/en/blogs/gold-investing/ima-casanova-gold-demand-climbs-as-top-miners-post-record-q1-earnings/', 'miners', 'positive', 'record', 19),
  A('Gold miners shine: record bullion prices propel Q3 earnings to new heights', 'Investing News', 'https://investingnews.com/gold-miners-ride-record-prices/', 'miners', 'positive', 'record', 22),
  A('Newmont: the gold giant’s “record cash flow” era', 'Simply Wall St', 'https://simplywall.st/community/narratives/us/materials/nyse-nem/newmont/yoytuwk7-newmont-corporation-nem-the-golden-fortress-at-the-2026-production-trough', 'miners', 'positive', 'cash flow', 14),
  A('Newmont transaction highlights rising valuations for undeveloped gold assets', 'Newswire', 'https://www.newswire.ca/news-releases/newmont-transaction-highlights-rising-valuations-for-undeveloped-gold-assets-855702779.html', 'miners', 'neutral', '—', 17),
  A('China’s gold miners set for strong 2026 on deals and higher output', 'Mining.com', 'https://www.mining.com/web/chinas-gold-miners-set-for-strong-2026-on-deals-higher-output/', 'miners', 'positive', 'record profit', 11),
  A('Agnico Eagle posts record Q1 adjusted net income of $1.7B, up 121%', 'Yahoo Finance', 'https://finance.yahoo.com/markets/commodities/articles/barrick-mining-corp-b-q2-230041888.html', 'miners', 'positive', '$1.7B', 20),

  // Central Banks & Reserves
  A('Record 45% of central banks plan to increase gold holdings, WGC survey finds', 'Kitco', 'https://www.kitco.com/news/article/2026-06-16/record-45-central-banks-plan-increase-gold-holdings-wgc-survey-finds', 'central-banks', 'positive', '45%', 2, 'A record 45% of central banks expect to add to reserves over the next year, the WGC 2026 survey found.'),
  A('Central banks bought 289 tonnes of gold last quarter as prices fell', 'GoldSilver', 'https://goldsilver.com/industry-news/goldsilver-news/central-bank-gold-buying-record-q2-2026/', 'central-banks', 'positive', '289t', 6),
  A('Central banks set to step up gold buying over the next year — World Gold Council', 'World Gold Council', 'https://www.gold.org/news-and-events/press-releases/central-banks-set-step-gold-buying-over-next-year', 'central-banks', 'positive', 'up', 10),
  A('World Gold Council sees new central banks on the buyer side in 2026', 'GoldInvest', 'https://goldinvest.de/en/gold-remains-in-demand-world-gold-council-sees-new-central-banks-on-the-buyer-side-in-2026', 'central-banks', 'positive', 'new buyers', 13),
  A('Central Bank Gold Reserves Survey 2026', 'World Gold Council', 'https://www.gold.org/goldhub/research/central-bank-gold-reserves-survey-2026', 'central-banks', 'neutral', 'survey', 12),
  A('Gold’s worst week of 2026 — but central banks just filed a record buy signal', 'GoldSilver', 'https://goldsilver.com/industry-news/goldsilver-news/gold-worst-week-2026-central-banks-record-buy-signal/', 'central-banks', 'neutral', 'buy signal', 7),
  A('Central bank gold buying 2026: why 1,000 tonnes a year may matter', 'Advantage Gold', 'https://www.advantagegold.com/blog/central-bank-gold-buying-2026-why-1000-tonnes-a-year-may-matter-to-you/', 'central-banks', 'neutral', '1,000t', 16),
  A('Central banks: gold demand trends, full-year 2025', 'World Gold Council', 'https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-full-year-2025/central-banks', 'central-banks', 'neutral', '863t', 29),

  // Macro & Rates
  A('Fed holds rates steady amid dissent in April 2026 decision', 'CNBC', 'https://www.cnbc.com/2026/04/29/fed-interest-rate-decision-april-2026.html', 'macro', 'neutral', '3.50–3.75%', 40, 'The Fed held its benchmark rate in an unusually divided 8-4 vote, pushing back on near-term cuts.'),
  A('Bitcoin down 21%, gold up 79% — so why are investors still betting on BTC?', 'AMBCrypto', 'https://ambcrypto.com/bitcoin-down-21-gold-up-79-so-why-are-investors-still-betting-on-btc/', 'macro', 'positive', '+79%', 9),
  A('Gold vs. Bitcoin in 2026: which “safe haven” is actually delivering?', 'Investing.com', 'https://www.investing.com/analysis/gold-vs-bitcoin-in-2026-which-safe-haven-is-actually-delivering-200679952', 'macro', 'neutral', 'haven', 14),
  A('S&P 500 posts first close above 7,600 as tech rally overpowers oil spike', 'CNBC', 'https://www.cnbc.com/2026/06/01/stock-market-today-live-updates.html', 'macro', 'positive', '7,609.78', 7),
  A('Dow, S&P 500, Nasdaq build on records as investors eye the AI boom', 'Yahoo Finance', 'https://finance.yahoo.com/economy/live/stock-market-today-tuesday-june-2-ai-231755175.html', 'macro', 'positive', '+0.3%', 6),
  A('S&P 500 catches a tailwind from falling oil prices', 'CNBC', 'https://www.cnbc.com/2026/05/04/stock-market-today-live-updates.html', 'macro', 'positive', '+0.6%', 35),
  A('S&P 500 and Nasdaq close at fresh records as traders look past Iran fears', 'CNBC', 'https://www.cnbc.com/2026/04/14/stock-market-today-live-updates.html', 'macro', 'positive', 'record', 55),

  // Physical & Mints
  A('U.S. Mint sales: 1776–2026 gold coins lead as prices ease', 'CoinNews', 'https://www.coinnews.net/2026/05/27/gold-coins-lead-prices-ease/', 'physical', 'positive', 'coins lead', 12, 'American Eagle gold bullion coin sales led U.S. Mint demand as spot prices eased into the spring.'),
  A('Global gold bar & coin demand hits second-highest quarter on record at 474t', 'Coin World', 'https://www.coinworld.com/news/precious-metals/world-gold-council-publishes-global-gold-demand-trends', 'physical', 'positive', '474t', 8),
  A('Mint’s authorized purchasers assess needs for 2026', 'Coin World', 'https://www.coinworld.com/news/precious-metals/mint-s-authorized-purchasers-assess-needs-for-2026', 'physical', 'neutral', '86,500 oz', 20),
  A('U.S. Mint 2026 product and coin release schedule', 'GovMint', 'https://www.govmint.com/learn/post/united-states-mint-2026-coin-release-schedule', 'physical', 'neutral', 'schedule', 30),
  A('Does the U.S. Mint sell gold bars?', 'JM Bullion', 'https://www.jmbullion.com/investing-guide/bullion/does-us-mint-sell-gold-bars/', 'physical', 'neutral', '—', 26),
  A('United States Mint gold & silver bullion', 'APMEX', 'https://www.apmex.com/category/81470/united-states-mint-u-s-mint', 'physical', 'neutral', 'bullion', 24),
  A('Best of the Mint: gold 2026 values & prices', 'Greysheet', 'https://www.greysheet.com/prices/sp/united-states-best-of-the-mint-gold-coin-issues/15897', 'physical', 'neutral', 'premiums', 18),

  // Digital Gold & Crypto
  A('Investors exit gold ETFs while Bitcoin inflows hit the longest streak of 2026', 'MEXC', 'https://www.mexc.com/news/978998', 'digital-gold', 'negative', '$291B out', 5, 'Institutions drained gold ETFs at a record pace while pouring into spot Bitcoin ETFs.'),
  A('Here’s why Bitcoin is outperforming gold in 2026', 'CoinGape', 'https://coingape.com/trending/heres-why-bitcoin-is-outperforming-gold-in-2026/', 'digital-gold', 'positive', 'BTC>gold', 7),
  A('Gold and metals ETFs see billions in inflows while crypto ETFs see outflows', 'BitKE', 'https://bitcoinke.io/2026/05/gold-and-metals-etfs-inflows-surge/', 'digital-gold', 'positive', 'inflows', 11),
  A('Bitcoin vs Gold: is BTC becoming a new hedge in 2026?', 'Analytics Insight', 'https://www.analyticsinsight.net/bitcoin/bitcoin-vs-gold-is-btc-becoming-a-new-hedge-in-2026', 'digital-gold', 'neutral', 'hedge', 15),
  A('Bitcoin ETFs could top $180 billion in 2026, analysts say', 'DL News', 'https://www.dlnews.com/articles/markets/bitcoin-etfs-to-top-180-billion-usd-in-2026-say-analysts/', 'digital-gold', 'positive', '$180B', 19),
  A('Bitcoin’s three-month uptrend against gold has snapped — what next?', 'CoinDesk', 'https://www.coindesk.com/markets/2026/05/27/bitcoin-vs-gold-btc-s-three-month-uptrend-has-snapped', 'digital-gold', 'negative', 'trend break', 13),
  A('Gold and metals ETFs see billions in recent inflows as crypto ETFs bleed', 'BitKE', 'https://bitcoinke.io/2026/05/gold-and-metals-etfs-inflows-surge/', 'digital-gold', 'positive', 'inflows', 10),
];

const DATASETS = { marketone: MARKETONE_ARTICLES, bullionaire: BULLIONAIRE_ARTICLES };
const datasetForBrand = () => DATASETS[activeBrandId()] || MARKETONE_ARTICLES;
const pillarName = (id) => {
  const p = getBrand().pillars.find((x) => x.id === id);
  return p ? p.name : 'the sector';
};

function analyzeFor(story) {
  const pname = pillarName(story.pillar);
  const trend = story.sentiment === 'positive' ? 'rising' : story.sentiment === 'negative' ? 'cooling' : 'steady';
  return {
    summary: `${story.summary} For ${getBrand().name} audiences, it’s a clean read on momentum in ${pname.toLowerCase()}.`,
    whyItMatters: `This matters because it reinforces the prevailing thesis in ${pname} and sets up the next catalyst. The signal is in the direction of travel — ${story.stat !== '—' ? `the ${story.stat} figure` : 'the underlying data'} suggests the move has legs, though execution and pricing remain the swing factors to watch.`,
    takeaways: [
      `The headline number (${story.stat}) is the proof point, not the story itself.`,
      'Watch whether the trend holds into the next reporting period.',
      `Positioning in ${pname} should weigh durability over the one-off print.`,
    ],
    sentiment: story.sentiment,
    trend,
    stat: story.stat,
  };
}

function generateFor(story, format) {
  const brandName = getBrand().name;
  const brandTag = `#${brandName.replace(/\s+/g, '')}`;
  const tag = `#${(story.pillar || 'markets').split('-').map((w) => (w[0] || '').toUpperCase() + w.slice(1)).join('')}`;
  const templates = {
    linkedin: `${story.title}.\n\nThe takeaway isn’t the headline number — it’s the direction of travel. ${story.summary}\n\nThe signal (${story.stat}) points to momentum, but the durability of the trend is what turns a good print into a real thesis.\n\nThe question from here: does it hold?\n\n${tag} ${brandTag}`,
    x: `${story.title} — ${story.stat}. The real signal is the trend, not the print. ${tag}`,
    instagram: `${story.title} 📈\n\n${story.summary}\n\nThe number to know: ${story.stat}. The question that matters: does the trend hold?\n\n${tag} #markets #finance ${brandTag} #investing`,
    newsletter: `SUBJECT: ${story.title}\n\n${story.summary} The figure to anchor on is ${story.stat}.\n\nWhy it matters: it reinforces the prevailing thesis and sets up the next catalyst — watch for durability over the next print.`,
    blog: `# ${story.title}\n\n${story.summary} It’s a small headline with an outsized signal: ${story.stat} tells you where momentum is heading.\n\nIn this piece, we unpack what the move means, who it favors, and the catalysts worth watching from here.`,
    reel: `[HOOK] ${story.title}?\n[BEAT 1] Here’s the number that matters: ${story.stat}.\n[BEAT 2] ${story.summary}\n[BEAT 3] The real question — does the trend hold?\n[CTA] Follow ${brandName} for the read that moves markets.`,
  };
  return templates[format] || templates.linkedin;
}

export const demo = {
  get enabled() { return _enabled; },
  set(v) { _enabled = Boolean(v); },
  async config() {
    await wait(120);
    const b = getBrand();
    return { pillars: b.pillars, brand: { id: b.id, name: b.name, tag: b.tag, accent: b.accent, accent2: b.accent2, accentSoft: b.accentSoft }, sourcing: 'demo', model: 'demo', slackConfigured: false, hasAnthropicKey: false, demo: true };
  },
  async news({ q = '', from = '', to = '' } = {}) {
    await wait();
    let rows = [...datasetForBrand()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
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
