// Market One — Public Company Prospecting & Outreach Platform · API server
//
// Standalone app. The company database, pipeline, sequences and CRM state live
// client-side (seeded from the bundled sample dataset), and these endpoints add
// the live AI layer — contact enrichment, the research agent, and the outreach
// writer — whenever an ANTHROPIC_API_KEY is configured. With no key, the client
// runs fully in Demo mode against the same shapes.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4100;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const EXEC_ROLES = [
  'CEO', 'CFO', 'COO', 'VP Corporate Development', 'VP Investor Relations',
  'IR Manager', 'Communications Lead', 'Marketing Lead',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function requireKey(res) {
  if (!anthropic) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set. Use Demo mode, or copy .env.example to .env and add a key.' });
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

// Structured-output call that returns parsed JSON. Passes output_config (enforced
// where supported) AND embeds the schema in the prompt; retries without the
// param if the endpoint rejects it.
async function callJson({ system, user, schema, maxTokens = 2048 }) {
  const userWithSchema = schema
    ? `${user}\n\nRespond with ONLY a single JSON value that conforms to this JSON Schema. No prose, no code fences:\n${JSON.stringify(schema)}`
    : user;
  const req = { model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: userWithSchema }] };
  if (system) req.system = system;
  if (schema) req.output_config = { format: { type: 'json_schema', schema } };
  try {
    const message = await anthropic.messages.create(req);
    return parseJsonLoose(firstText(message));
  } catch (err) {
    if (schema) {
      const message = await anthropic.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userWithSchema }] });
      return parseJsonLoose(firstText(message));
    }
    throw err;
  }
}

async function chat({ system, user, maxTokens = 400 }) {
  const message = await anthropic.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
  return firstText(message).trim();
}

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, hasAnthropicKey: Boolean(anthropic), execRoles: EXEC_ROLES });
});

app.get('/api/config', (_req, res) => {
  res.json({ model: MODEL, hasAnthropicKey: Boolean(anthropic), execRoles: EXEC_ROLES });
});

// POST /api/enrich — likely executive / IR contacts + plausible corporate-email
// pattern + confidence. Honest about uncertainty: inferred emails are flagged.
app.post('/api/enrich', async (req, res) => {
  if (!requireKey(res)) return;
  const { company } = req.body || {};
  if (!company?.name) return res.status(400).json({ error: 'company.name is required' });

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            role: { type: 'string', enum: EXEC_ROLES },
            email: { type: 'string' },
            emailStatus: { type: 'string', enum: ['verified', 'risky', 'invalid'] },
            confidence: { type: 'integer' },
            linkedin: { type: 'string' },
            location: { type: 'string' },
          },
          required: ['name', 'title', 'role', 'email', 'emailStatus', 'confidence', 'linkedin', 'location'],
        },
      },
    },
    required: ['contacts'],
  };

  const system =
    'You are a B2B contact-enrichment engine for an agency that prospects publicly traded companies. ' +
    'Return likely executive and investor-relations contacts. Where you are not certain of a real person, ' +
    'infer a plausible corporate email PATTERN from the company domain (e.g. first.last@domain) and mark its ' +
    'emailStatus "risky" with lower confidence. Never claim a personal email is verified unless it follows an ' +
    'obvious published pattern. confidence is 0-100. Be conservative and honest about uncertainty.';
  const user =
    `Company: ${company.name}${company.ticker ? ` (${company.ticker}${company.exchange ? `:${company.exchange}` : ''})` : ''}\n` +
    `Website: ${company.website || 'unknown'}\nIndustry: ${company.industry || 'unknown'}\nHQ: ${company.hq || 'unknown'}\n\n` +
    `Provide up to 6 contacts across these roles where relevant: ${EXEC_ROLES.join(', ')}.`;

  try {
    const parsed = await callJson({ system, user, schema, maxTokens: 1800 });
    res.json({ contacts: parsed?.contacts || [] });
  } catch (err) {
    console.error('POST /api/enrich failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/research — AI research agent: a structured brief for a company.
app.post('/api/research', async (req, res) => {
  if (!requireKey(res)) return;
  const { company } = req.body || {};
  if (!company?.name) return res.status(400).json({ error: 'company.name is required' });

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      financingHistory: { type: 'string' },
      competitiveLandscape: { type: 'string' },
      irOpportunities: { type: 'array', items: { type: 'string' } },
      outreachAngle: { type: 'string' },
    },
    required: ['summary', 'financingHistory', 'competitiveLandscape', 'irOpportunities', 'outreachAngle'],
  };

  const signals = (company.signals || []).map((s) => `- ${s.type}: ${s.headline}`).join('\n');
  const fin = (company.financings || []).map((f) => `- ${f.date}: ${f.type} ${f.amount}`).join('\n');
  const system =
    'You are a capital-markets research analyst at an agency that serves public companies (investor relations, ' +
    'awareness, capital-markets advisory). Produce a crisp, accurate brief and a specific recommended outreach ' +
    'angle. Be concrete, never invent precise figures beyond the context provided, and keep it compliant ' +
    '(no investment advice, no price targets).';
  const user =
    `Company: ${company.name}${company.ticker ? ` (${company.ticker}:${company.exchange || ''})` : ''}\n` +
    `Industry: ${company.industry || ''} · Market cap: ${company.marketCap || ''} · HQ: ${company.hq || ''}\n` +
    `Recent financings:\n${fin || '- none on file'}\nRecent signals:\n${signals || '- none on file'}\n\n` +
    'Return: a 2-3 sentence company summary, a financing-history read, a competitive-landscape note, 3-4 IR ' +
    'opportunities we could pitch, and one sharp recommended outreach angle.';

  try {
    const research = await callJson({ system, user, schema, maxTokens: 1600 });
    res.json({ research });
  } catch (err) {
    console.error('POST /api/research failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/outreach — AI outreach writer: a personalized email / LinkedIn /
// follow-up built off a company + (optional) contact + signal.
app.post('/api/outreach', async (req, res) => {
  if (!requireKey(res)) return;
  const { company, contact, type = 'email', channel, signal, variables = {} } = req.body || {};
  if (!company?.name) return res.status(400).json({ error: 'company.name is required' });

  const wantsSubject = (channel || type) === 'email' || channel === 'Email';
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { firstLine: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
    required: ['firstLine', 'subject', 'body'],
  };

  const trigger = signal?.headline || (company.financings?.[0] ? `${company.financings[0].type} of ${company.financings[0].amount}` : '');
  const system =
    'You write outbound sales copy for an agency that helps publicly traded companies with investor relations, ' +
    'awareness campaigns, and capital-markets communications. Write a warm, specific, non-spammy message. ' +
    'Open with a genuinely personalized first line tied to the company\'s recent news or financing. Keep it ' +
    'short, credible, and compliant — no guarantees, no investment advice. Use the recipient first name if ' +
    'provided. Avoid clichés like "I hope this email finds you well."';
  const user =
    `Recipient: ${contact?.name || 'the IR/exec contact'}${contact?.title ? `, ${contact.title}` : ''}\n` +
    `Company: ${company.name} (${company.ticker || ''}:${company.exchange || ''}) — ${company.industry || ''}\n` +
    `Channel: ${channel || type}\nRecent trigger: ${trigger || 'general prospecting'}\n` +
    `Variables: ${JSON.stringify(variables)}\n\n` +
    `Return a punchy personalized first line, ${wantsSubject ? 'a subject line, ' : 'an empty subject, '}` +
    'and the full message body (120-150 words).';

  try {
    const draft = await callJson({ system, user, schema, maxTokens: 900 });
    res.json({ draft });
  } catch (err) {
    console.error('POST /api/outreach failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/first-line — just the AI-personalized opening line for a sequence step.
app.post('/api/first-line', async (req, res) => {
  if (!requireKey(res)) return;
  const { company, signal } = req.body || {};
  if (!company?.name) return res.status(400).json({ error: 'company.name is required' });
  const trigger = signal?.headline || company.financings?.[0]?.amount || company.industry || '';
  try {
    const text = await chat({
      system:
        'You write a single, specific, non-generic opening line for a cold email to a public company executive. ' +
        'One sentence, warm, tied to their recent news. No greeting, no "I hope". Return only the line.',
      user: `Company: ${company.name} (${company.ticker || ''}). Recent: ${trigger}.`,
      maxTokens: 120,
    });
    res.json({ firstLine: text.replace(/^["']|["']$/g, '').trim() });
  } catch (err) {
    console.error('POST /api/first-line failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Serve the built client in production ─────────────────────────────────────
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built. Run `npm run build`.');
  });
});

app.listen(PORT, () => {
  console.log(`\n  Market One · Prospecting & Outreach Platform API`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → model: ${MODEL}`);
  console.log(`  → anthropic key: ${anthropic ? 'present' : 'MISSING (Demo mode)'}\n`);
});
