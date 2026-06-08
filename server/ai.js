// Shared Anthropic client + JSON helpers.
// Used by both the content-intelligence endpoints (index.js) and the
// prospecting platform (platform.js).
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export function hasClaude() {
  return Boolean(anthropic);
}

// Guard for routes that require Claude. Returns false (and sends 500) if absent.
export function requireClaude(res) {
  if (!anthropic) {
    res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.',
    });
    return false;
  }
  return true;
}

export function firstText(message) {
  const block = (message?.content || []).find((b) => b.type === 'text');
  return block ? block.text : '';
}

// Tolerant JSON extraction — handles ```json fences and surrounding prose.
export function parseJsonLoose(text) {
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

// Structured-output call that returns parsed JSON. Passes output_config when the
// model supports it AND embeds the schema in the prompt as a fallback.
export async function callJson({ system, user, schema, maxTokens = 4096 }) {
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

// Plain text completion.
export async function callText({ system, user, maxTokens = 1200 }) {
  const req = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: user }],
  };
  if (system) req.system = system;
  const message = await anthropic.messages.create(req);
  return firstText(message).trim();
}
