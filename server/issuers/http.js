// Shared HTTP layer for every issuer data source.
//
// Public data sources are rate-limited, occasionally hostile to bots, and change
// shape without notice. Everything that leaves this process goes through `get()`
// so that throttling, retries, caching and user-agent handling are applied once
// rather than re-implemented per source.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.resolve(__dirname, '../data/.cache');

const UA =
  process.env.ISSUERS_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Per-host request spacing (ms). Public endpoints ban aggressive callers, and a
// prospecting sweep touches thousands of symbols, so pace by default.
const DEFAULT_DELAY = Number(process.env.ISSUERS_HOST_DELAY_MS || 350);
const HOST_DELAY = {
  'api.stocktwits.com': 1200,
  'query1.finance.yahoo.com': 250,
  'query2.finance.yahoo.com': 250,
  'backend.otcmarkets.com': 600,
  'www.tsx.com': 600,
};

const lastHit = new Map();
const queues = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Serialise per host so concurrent callers still respect the spacing above.
function throttle(host, fn) {
  const delay = HOST_DELAY[host] ?? DEFAULT_DELAY;
  const prev = queues.get(host) || Promise.resolve();
  const next = prev.then(async () => {
    const since = Date.now() - (lastHit.get(host) || 0);
    if (since < delay) await sleep(delay - since);
    lastHit.set(host, Date.now());
    return fn();
  });
  // Keep the chain alive even when a link rejects.
  queues.set(host, next.then(() => {}, () => {}));
  return next;
}

function cacheKey(url, extra = '') {
  let h = 5381;
  for (const ch of `${url}::${extra}`) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `${h.toString(36)}-${(url.split('/').pop() || 'root').replace(/[^a-z0-9._-]/gi, '_').slice(0, 48)}`;
}

async function readCache(key, maxAgeMs) {
  if (!maxAgeMs) return null;
  try {
    const file = path.join(CACHE_DIR, key);
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(key, body) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, key), body);
  } catch {
    /* cache is best-effort */
  }
}

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = (body || '').slice(0, 400);
  }
}

/**
 * Throttled, retrying, optionally-cached GET.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {object} [opts.headers]   extra request headers
 * @param {number} [opts.cacheMs]   serve from disk cache when younger than this
 * @param {number} [opts.timeoutMs] per-attempt timeout (default 20s)
 * @param {number} [opts.retries]   retry count for 429/5xx/network (default 2)
 * @param {boolean} [opts.allow404] resolve to null instead of throwing on 404
 * @returns {Promise<string|null>} response body
 */
export async function get(url, opts = {}) {
  const { headers = {}, cacheMs = 0, timeoutMs = 20000, retries = 2, allow404 = false } = opts;
  const key = cacheKey(url, JSON.stringify(headers.Cookie ? { ...headers, Cookie: 'x' } : headers));

  const cached = await readCache(key, cacheMs);
  if (cached !== null) return cached;

  const host = new URL(url).host;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const body = await throttle(host, async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            redirect: 'follow',
            signal: ctrl.signal,
            headers: {
              'User-Agent': UA,
              Accept: '*/*',
              'Accept-Language': 'en-CA,en;q=0.9',
              ...headers,
            },
          });
          if (res.status === 404 && allow404) return null;
          const text = await res.text();
          if (!res.ok) throw new HttpError(res.status, url, text);
          return text;
        } finally {
          clearTimeout(timer);
        }
      });

      if (body !== null && cacheMs) await writeCache(key, body);
      return body;
    } catch (err) {
      lastErr = err;
      // 4xx other than 429 are deterministic — retrying just burns the budget.
      const status = err instanceof HttpError ? err.status : 0;
      if (status && status !== 429 && status < 500) break;
      if (attempt < retries) await sleep(800 * 2 ** attempt + Math.random() * 400);
    }
  }
  throw lastErr;
}

/** GET returning parsed JSON, or null when the body is not JSON. */
export async function getJson(url, opts = {}) {
  const body = await get(url, { headers: { Accept: 'application/json' }, ...opts });
  if (body === null) return null;
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON from ${url} but got ${body.slice(0, 120)}`);
  }
}

/**
 * Local file override for any source.
 *
 * Every universe adapter checks `server/data/universe/<name>` first. When a
 * source is blocked by a corporate proxy, geofenced, or has changed shape, drop
 * the exchange's own CSV/TXT export there and the pipeline keeps working.
 */
export async function readOverride(name) {
  try {
    return await fs.readFile(path.resolve(__dirname, '../data/universe', name), 'utf8');
  } catch {
    return null;
  }
}

/** Minimal CSV parser — handles quoted fields, embedded commas and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const clean = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!clean.length) return [];
  const header = clean[0].map((h) => h.trim());
  return clean.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
