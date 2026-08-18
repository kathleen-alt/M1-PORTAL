// Market One — Content Intelligence Portal · API server
// Sourcing (real, linked news) + AI analysis + on-brand copy generation.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ── Brands ───────────────────────────────────────────────────
// Select with BRAND=bullionaire (default: marketone). Each brand defines its own
// pillars, per-pillar search queries, credible-domain allowlist, and theme.
const COMMON_DOMAINS = [
  'bnnbloomberg.ca', 'reuters.com', 'financialpost.com', 'cnbc.com', 'bloomberg.com',
  'theglobeandmail.com', 'finance.yahoo.com', 'marketbeat.com', 'benzinga.com',
  'barrons.com', 'wsj.com', 'investing.com', 'stockhouse.com', 'seekingalpha.com',
];
const BRANDS = {
  marketone: {
    id: 'marketone', name: 'Market One', tag: 'Content Intelligence',
    accent: '#3B82F6', accent2: '#06B6D4', accentSoft: 'rgba(59, 130, 246, 0.14)',
    pillars: [
      { id: 'capital-markets', name: 'Capital Markets & IPOs', accent: '#3B82F6', blurb: 'Listings, financings, capital raises, exchange moves.', query: 'IPO OR "initial public offering" OR listing OR "capital raise" OR financing OR prospectus' },
      { id: 'mining-metals', name: 'Mining & Metals', accent: '#F59E0B', blurb: 'Producers, explorers, commodities, drill results.', query: 'mining OR gold OR copper OR lithium OR nickel OR silver OR "drill results"' },
      { id: 'energy-cleantech', name: 'Energy & Cleantech', accent: '#10B981', blurb: 'Oil & gas, renewables, batteries, the transition.', query: 'energy OR oil OR "natural gas" OR solar OR battery OR renewables OR "energy storage"' },
      { id: 'tech-innovation', name: 'Technology & Innovation', accent: '#8B5CF6', blurb: 'AI, software, semis, frontier tech.', query: 'AI OR semiconductor OR chip OR software OR "artificial intelligence" OR technology' },
      { id: 'deals-ma', name: 'Deals & M&A', accent: '#EC4899', blurb: 'Mergers, acquisitions, takeovers, strategic stakes.', query: 'acquisition OR merger OR takeover OR "to acquire" OR "all-stock deal" OR buyout' },
      { id: 'macro-markets', name: 'Macro & Markets', accent: '#06B6D4', blurb: 'Rates, inflation, indices, the broad tape.', query: '"S&P 500" OR Nasdaq OR "Federal Reserve" OR inflation OR "interest rates" OR "Dow Jones"' },
      { id: 'esg-governance', name: 'ESG & Governance', accent: '#22C55E', blurb: 'Sustainability, disclosure, boards, stewardship.', query: 'activist investor OR governance OR "board" OR ESG OR shareholder OR "proxy"' },
    ],
    domains: [...COMMON_DOMAINS, 'mining.com', 'kitco.com', 'northernminer.com'],
    voice: 'Market One, a capital-markets communications firm',
  },
  bullionaire: {
    id: 'bullionaire', name: 'Bullionaire', tag: 'Precious-Metals Intelligence',
    accent: '#af800b', accent2: '#d0a02f', accentSoft: 'rgba(175, 128, 11, 0.18)',
    pillars: [
      { id: 'gold', name: 'Gold', accent: '#E5B80B', blurb: 'Spot, futures, ETFs, price forecasts.', query: 'gold OR bullion OR "gold price" OR "gold ETF" OR "gold futures"' },
      { id: 'silver-pgms', name: 'Silver & PGMs', accent: '#C6CED8', blurb: 'Silver, platinum, palladium.', query: 'silver OR platinum OR palladium OR PGM OR "silver price"' },
      { id: 'miners', name: 'Miners & Producers', accent: '#D98A3D', blurb: 'Gold & silver miners, earnings, output.', query: '"gold miner" OR "gold production" OR Newmont OR Barrick OR "Agnico Eagle" OR "mine output"' },
      { id: 'central-banks', name: 'Central Banks & Reserves', accent: '#7FB2FF', blurb: 'Official-sector buying, reserves, de-dollarization.', query: '"central bank" gold OR "gold reserves" OR "World Gold Council" OR "reserve asset"' },
      { id: 'macro', name: 'Macro & Rates', accent: '#4FD1C5', blurb: 'Fed, inflation, real yields, the dollar.', query: '"Federal Reserve" OR inflation OR "real yields" OR "US dollar" OR "safe haven"' },
      { id: 'physical', name: 'Physical & Mints', accent: '#E0A82E', blurb: 'Coins, bars, mints, premiums, demand.', query: '"gold coin" OR "US Mint" OR "gold bar" OR "bullion demand" OR premium' },
      { id: 'digital-gold', name: 'Digital Gold & Crypto', accent: '#F7931A', blurb: 'Bitcoin as digital gold, tokenized gold, ETF flows.', query: 'bitcoin OR "digital gold" OR "tokenized gold" OR "gold ETF flows" OR crypto' },
    ],
    domains: [...COMMON_DOMAINS, 'kitco.com', 'gold.org', 'mining.com', 'coindesk.com', 'coinworld.com', 'coinnews.net'],
    voice: 'Bullionaire, a precious-metals research and communications firm',
  },
};

const BRAND = BRANDS[process.env.BRAND] || BRANDS.marketone;
export const PILLARS = BRAND.pillars.map(({ query, ...p }) => p);
const PILLAR_IDS = BRAND.pillars.map((p) => p.id);
const PILLAR_QUERIES = Object.fromEntries(BRAND.pillars.map((p) => [p.id, p.query]));
const PILLAR_NL = Object.fromEntries(BRAND.pillars.map((p) => [p.id, `${p.name} — ${p.blurb}`]));
const SOURCE_ALLOWLIST = BRAND.domains;

const SENTIMENTS = ['positive', 'neutral', 'negative'];

// ── Helpers ──────────────────────────────────────────────────
function requireClaude(res) {
  if (!anthropic) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.',
    });
    return false;
  }
  return true;
}

function firstText(message) {
  const block = (message?.content || []).find((b) => b.type === 'text');
  return block ? block.text : '';
}

// Tolerant JSON extraction — handles ```json fences and surrounding prose.
function parseJsonLoose(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[[{]/);
    if (start === -1) return null;
    const end = Math.max(candidate.lastIndexOf(']'), candidate.lastIndexOf('}'));
    if (end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

// Structured-output call that returns parsed JSON.
// Belt-and-suspenders: we pass `output_config` (enforced on models that support
// structured outputs) AND embed the schema in the prompt, so we still get valid
// JSON even if the SDK/endpoint ignores the param.
async function callJson({ system, user, schema, maxTokens = 4096 }) {
  const userWithSchema = schema
    ? `${user}\n\nRespond with ONLY a single JSON value that conforms to this JSON Schema. No prose, no code fences:\n${JSON.stringify(schema)}`
    : user;
  const req = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userWithSchema }],
  };
  if (system) req.system = system;
  if (schema) req.output_config = { format: { type: 'json_schema', schema } };

  try {
    const message = await anthropic.messages.create(req);
    return parseJsonLoose(firstText(message));
  } catch (err) {
    // If the endpoint rejects structured outputs outright, retry without it.
    if (schema) {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userWithSchema }],
      });
      return parseJsonLoose(firstText(message));
    }
    throw err;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function dedupe(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const key = (a.url || a.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

// ── Sourcing: NewsAPI path ──────────────────────────────────────
async function fetchFromNewsApi({ query, from, to, page, pageSize }) {
  const params = new URLSearchParams({
    domains: SOURCE_ALLOWLIST.join(','),
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: String(pageSize),
    page: String(page),
    apiKey: NEWS_API_KEY,
  });
  params.set('q', query && query.trim() ? query.trim() : 'markets OR mining OR IPO OR earnings OR acquisition OR energy');
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const resp = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`);
  const data = await resp.json();
  if (data.status !== 'ok') {
    throw new Error(data.message || 'NewsAPI request failed');
  }
  const articles = (data.articles || []).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source?.name || hostOf(a.url),
    publishedAt: a.publishedAt,
    image: a.urlToImage || null,
    description: a.description || a.content || '',
  })).filter((a) => a.title && a.url);

  return { articles: dedupe(articles), totalResults: data.totalResults || articles.length };
}

// Classify a batch of real articles into pillar / sentiment / summary / stat.
async function classifyArticles(articles) {
  if (!articles.length) return [];
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            index: { type: 'integer' },
            pillar: { type: 'string', enum: PILLAR_IDS },
            sentiment: { type: 'string', enum: SENTIMENTS },
            summary: { type: 'string' },
            stat: { type: 'string' },
          },
          required: ['index', 'pillar', 'sentiment', 'summary', 'stat'],
        },
      },
    },
    required: ['items'],
  };

  const list = articles
    .map((a, i) => `#${i}\nHEADLINE: ${a.title}\nSOURCE: ${a.source}\nSUMMARY: ${(a.description || '').slice(0, 400)}`)
    .join('\n\n');

  const system =
    `You are the desk editor for ${BRAND.voice}. ` +
    'Classify each financial/business news item into exactly one content pillar, judge market sentiment, ' +
    'write a tight one-sentence editorial summary, and pull one concrete stat or figure from the item ' +
    '(a price, %, $ amount, or "—" if none is present). Be precise and never invent facts.';

  const pillarGuide = PILLARS.map((p) => `- ${p.id}: ${p.name} — ${p.blurb}`).join('\n');
  const user = `Content pillars:\n${pillarGuide}\n\nClassify these ${articles.length} items. Return an item for every index.\n\n${list}`;

  const parsed = await callJson({ system, user, schema, maxTokens: 4096 });
  const byIndex = new Map();
  for (const it of parsed?.items || []) byIndex.set(it.index, it);

  return articles.map((a, i) => {
    const c = byIndex.get(i) || {};
    return {
      ...a,
      id: `${hostOf(a.url)}-${i}-${Date.parse(a.publishedAt || '') || Date.now()}`,
      pillar: PILLAR_IDS.includes(c.pillar) ? c.pillar : 'macro-markets',
      sentiment: SENTIMENTS.includes(c.sentiment) ? c.sentiment : 'neutral',
      summary: c.summary || a.description || a.title,
      stat: c.stat || '—',
    };
  });
}

// ── Sourcing: Claude web-search fallback ────────────────────────────
async function fetchViaWebSearch({ query, from, to, count }) {
  const dateHint = from && to ? ` published between ${from} and ${to}` : from ? ` published on or after ${from}` : '';
  const topic = query && query.trim() ? query.trim() : 'financial markets, mining, IPOs, M&A, energy, and macro';

  const pillarGuide = PILLARS.map((p) => `- ${p.id}: ${p.name} — ${p.blurb}`).join('\n');
  const allow = SOURCE_ALLOWLIST.join(', ');

  const system =
    `You are the sourcing desk for ${BRAND.voice}. ` +
    'Use the web_search tool to find REAL, recently published business/financial news articles with their exact source URLs. ' +
    `Prefer these credible outlets: ${allow}. Never fabricate URLs, headlines, or facts — only report articles you actually found.`;

  const user =
    `Find ${count} distinct, real, recently published news articles about ${topic}${dateHint}. ` +
    `For each article, classify it into one ${BRAND.name} content pillar, judge market sentiment (positive/neutral/negative), ` +
    `write a one-sentence editorial summary, and pull one concrete stat (price, %, $, or "—").\n\n` +
    `Content pillars:\n${pillarGuide}\n\n` +
    `After searching, respond with ONLY a JSON array (no prose) where each element is:\n` +
    `{"title": string, "url": string (the real article URL), "source": string, "publishedAt": ISO8601 string or "", ` +
    `"summary": string, "stat": string, "pillar": one of [${PILLAR_IDS.join(', ')}], "sentiment": one of [positive, neutral, negative]}`;

  let messages = [{ role: 'user', content: user }];
  let final = null;
  for (let i = 0; i < 5; i++) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages,
    });
    if (message.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: message.content }];
      continue;
    }
    final = message;
    break;
  }

  const parsed = parseJsonLoose(firstText(final)) || [];
  const rows = Array.isArray(parsed) ? parsed : parsed.items || [];
  const articles = rows
    .filter((r) => r && r.url && r.title)
    .map((r, i) => ({
      id: `${hostOf(r.url)}-${i}-${Date.parse(r.publishedAt || '') || Date.now()}`,
      title: r.title,
      url: r.url,
      source: r.source || hostOf(r.url),
      publishedAt: r.publishedAt || new Date().toISOString(),
      image: null,
      description: r.summary || '',
      summary: r.summary || r.title,
      stat: r.stat || '—',
      pillar: PILLAR_IDS.includes(r.pillar) ? r.pillar : 'macro-markets',
      sentiment: SENTIMENTS.includes(r.sentiment) ? r.sentiment : 'neutral',
    }));
  return dedupe(articles);
}

// ── Top stories: ≥ perTopic per pillar ────────────────────────────────
async function fetchTopByPillarNewsApi({ from, to, perTopic }) {
  const batches = await Promise.all(
    PILLARS.map(async (p) => {
      try {
        const { articles } = await fetchFromNewsApi({ query: PILLAR_QUERIES[p.id], from, to, page: 1, pageSize: Math.min(24, perTopic + 6) });
        return articles.slice(0, perTopic + 4).map((a) => ({ ...a, _pillar: p.id }));
      } catch {
        return [];
      }
    }),
  );
  const flat = dedupe(batches.flat());
  const classified = await classifyArticles(flat); // sentiment/summary/stat
  const counts = {};
  const out = [];
  for (const a of classified) {
    const pid = a._pillar || a.pillar; // trust the pillar we queried under
    a.pillar = pid;
    delete a._pillar;
    counts[pid] = (counts[pid] || 0) + 1;
    if (counts[pid] <= perTopic) out.push(a);
  }
  return out;
}

async function fetchTopByPillarWebSearch({ from, to, perTopic }) {
  const batches = await Promise.all(
    PILLARS.map(async (p) => {
      try {
        const arts = await fetchViaWebSearch({ query: PILLAR_NL[p.id], from, to, count: perTopic });
        return arts.slice(0, perTopic).map((a) => ({ ...a, pillar: p.id }));
      } catch {
        return [];
      }
    }),
  );
  return dedupe(batches.flat());
}

// ── App ──────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    hasAnthropicKey: Boolean(anthropic),
    sourcing: NEWS_API_KEY ? 'newsapi' : 'web-search',
    slack: Boolean(SLACK_WEBHOOK_URL),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    pillars: PILLARS,
    brand: { id: BRAND.id, name: BRAND.name, tag: BRAND.tag, accent: BRAND.accent, accent2: BRAND.accent2, accentSoft: BRAND.accentSoft },
    sourcing: NEWS_API_KEY ? 'newsapi' : 'web-search',
    model: MODEL,
    slackConfigured: Boolean(SLACK_WEBHOOK_URL),
    hasAnthropicKey: Boolean(anthropic),
  });
});

// GET /api/news — real, sourced, de-duplicated, classified stories.
app.get('/api/news', async (req, res) => {
  if (!requireClaude(res)) return;
  const query = (req.query.q || '').toString();
  const from = (req.query.from || '').toString();
  const to = (req.query.to || '').toString();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(24, Math.max(6, parseInt(req.query.pageSize, 10) || 12));
  const perTopic = Math.min(20, Math.max(0, parseInt(req.query.perTopic, 10) || 0));
  // Default "top stories" view (no search query): pull ≥ perTopic per pillar.
  const topMode = perTopic > 0 && !query.trim() && page === 1;

  try {
    if (NEWS_API_KEY) {
      if (topMode) {
        const articles = await fetchTopByPillarNewsApi({ from, to, perTopic });
        return res.json({ articles, page: 1, hasMore: false, sourcing: 'newsapi', perTopic });
      }
      const { articles, totalResults } = await fetchFromNewsApi({ query, from, to, page, pageSize });
      const classified = await classifyArticles(articles);
      return res.json({
        articles: classified,
        page,
        hasMore: page * pageSize < totalResults && articles.length > 0,
        sourcing: 'newsapi',
      });
    }
    if (topMode) {
      const articles = await fetchTopByPillarWebSearch({ from, to, perTopic });
      return res.json({ articles, page: 1, hasMore: false, sourcing: 'web-search', perTopic });
    }
    const articles = await fetchViaWebSearch({ query, from, to, count: pageSize });
    return res.json({
      articles,
      page,
      hasMore: page < 3 && articles.length >= pageSize, // web-search has no stable paging
      sourcing: 'web-search',
    });
  } catch (err) {
    console.error('GET /api/news failed:', err.message);
    res.status(502).json({ error: `Sourcing failed: ${err.message}` });
  }
});

// POST /api/analyze — deep editorial analysis for one story (Studio).
app.post('/api/analyze', async (req, res) => {
  if (!requireClaude(res)) return;
  const { story } = req.body || {};
  if (!story?.title) return res.status(400).json({ error: 'story.title is required' });

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      whyItMatters: { type: 'string' },
      takeaways: { type: 'array', items: { type: 'string' } },
      sentiment: { type: 'string', enum: SENTIMENTS },
      trend: { type: 'string', enum: ['rising', 'steady', 'cooling'] },
      stat: { type: 'string' },
    },
    required: ['summary', 'whyItMatters', 'takeaways', 'sentiment', 'trend', 'stat'],
  };

  const system =
    `You are a senior analyst at ${BRAND.name}. Produce a crisp, accurate editorial read on a single news story for ` +
    'professional-investor clients. Be specific, avoid hype, never invent facts beyond what the source supports.';
  const user =
    `Analyze this story.\n\nHEADLINE: ${story.title}\nSOURCE: ${story.source || ''} (${story.url || ''})\n` +
    `CONTEXT: ${story.summary || story.description || ''}\n\n` +
    `Return: a 1-2 sentence summary, a "why it matters" paragraph, 3-4 sharp takeaways, sentiment, ` +
    `a trend read (rising/steady/cooling), and one concrete stat.`;

  try {
    const analysis = await callJson({ system, user, schema, maxTokens: 1500 });
    res.json({ analysis });
  } catch (err) {
    console.error('POST /api/analyze failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/generate — on-brand copy for a chosen format.
const FORMAT_GUIDE = {
  linkedin: 'A LinkedIn post (120-200 words). Professional, insightful, a strong hook, 2-4 short paragraphs, 3-5 relevant hashtags. No emoji spam.',
  x: 'An X/Twitter post under 280 characters. Punchy, one clean insight, 1-2 hashtags, no fluff.',
  instagram: 'An Instagram caption (60-120 words). Approachable but credible, a hook line, light structure, 4-6 hashtags.',
  newsletter: 'A newsletter blurb (120-180 words) with a bold one-line subject suggestion, then a tight, scannable summary and a "why it matters" close.',
  blog: 'A short blog intro (180-260 words) with an H1-style title line, a compelling lede, and a clear thesis that sets up the piece.',
  reel: 'A 25-40 second reel/video script: a hook line, 3-4 beats with on-screen text cues in [brackets], and a closing CTA.',
};

app.post('/api/generate', async (req, res) => {
  if (!requireClaude(res)) return;
  const { story, format, tone } = req.body || {};
  if (!story?.title) return res.status(400).json({ error: 'story.title is required' });
  const guide = FORMAT_GUIDE[format] || FORMAT_GUIDE.linkedin;

  const system =
    `You write in ${BRAND.name}'s brand voice: confident, precise, and editorial — credible for professional investors, never hypey. ` +
    'Compliance guardrails: no investment advice, no price targets or buy/sell calls, no guarantees of returns, ' +
    'no fabricated figures. Attribute facts to the source. Write copy a regulated communications firm could publish.';
  const user =
    `Write ${guide}\n\n` +
    `Tone: ${tone || 'confident, editorial'}.\n\n` +
    `Source story:\nHEADLINE: ${story.title}\nSOURCE: ${story.source || ''} (${story.url || ''})\n` +
    `CONTEXT: ${story.summary || story.description || ''}\nKEY STAT: ${story.stat || '—'}\n\n` +
    `Output only the copy itself — no preamble, no "Here is".`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: user }],
    });
    res.json({ text: firstText(message).trim(), format: format || 'linkedin' });
  } catch (err) {
    console.error('POST /api/generate failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/refine — refine arbitrary copy (used by Studio + graphic editor).
app.post('/api/refine', async (req, res) => {
  if (!requireClaude(res)) return;
  const { text, instruction } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });

  const system =
    `You are ${BRAND.name}'s copy editor. Refine the given copy while keeping its meaning and the brand voice ` +
    '(confident, precise, editorial, compliant — no advice, no price targets, no invented figures). ' +
    'Return only the revised copy.';
  const user = `Instruction: ${instruction || 'Tighten and improve clarity and impact.'}\n\nCopy:\n${text}`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: user }],
    });
    res.json({ text: firstText(message).trim() });
  } catch (err) {
    console.error('POST /api/refine failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/slack — post an alert to Slack (if configured) and echo it back.
app.post('/api/slack', async (req, res) => {
  const { text, blocks } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (!SLACK_WEBHOOK_URL) {
    return res.json({ delivered: false, reason: 'SLACK_WEBHOOK_URL not configured (alert kept in-app).' });
  }
  try {
    const resp = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    });
    res.json({ delivered: resp.ok });
  } catch (err) {
    console.error('POST /api/slack failed:', err.message);
    res.status(502).json({ delivered: false, error: err.message });
  }
});

// ── Serve the built client in production ───────────────────────────────
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built. Run `npm run build`.');
  });
});

app.listen(PORT, () => {
  console.log(`\n  ${BRAND.name} · Content Intelligence Portal API`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → model: ${MODEL}`);
  console.log(`  → sourcing: ${NEWS_API_KEY ? 'NewsAPI + Claude classification' : 'Claude web-search'}`);
  console.log(`  → anthropic key: ${anthropic ? 'present' : 'MISSING (set ANTHROPIC_API_KEY)'}`);
  console.log(`  → slack: ${SLACK_WEBHOOK_URL ? 'webhook configured' : 'in-app only'}\n`);
});
