// Market One's own client roster.
//
// A company already on retainer is not a prospect — the mandate is taken. The
// roster lives at server/data/clients.csv (Company, Symbol, Exchange, Note) and
// is matched by ticker where one is known, falling back to a normalised company
// name so a roster row that has not been resolved to a ticker still excludes.
//
// Name matching is deliberately strict. A looser rule mapped "GH Power" onto
// Power Metals Corp. and "Contango Silver & Gold" onto Go Metals, which would
// have struck two live prospects off the list.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.ISSUERS_CLIENTS_FILE || path.resolve(__dirname, '../data/clients.csv');

/** Drop legal suffixes and "(formerly …)" but keep every distinguishing word. */
export function normalizeName(s) {
  return String(s || '')
    .replace(/\((?:formerly|previously)[^)]*\)/ig, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(inc|corp|corporation|ltd|limited|plc|co|company)\b/ig, ' ')
    .replace(/[^a-z0-9 ]/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

let cache = null;

/**
 * @returns {Promise<{rows:object[], keys:Set<string>, names:Set<string>, loadedFrom:string|null}>}
 */
export async function load({ reload = false } = {}) {
  if (cache && !reload) return cache;
  let rows = [];
  try {
    rows = parseCsv(await fs.readFile(FILE, 'utf8'));
  } catch {
    // No roster configured is a valid state: nothing is excluded.
    cache = { rows: [], keys: new Set(), names: new Set(), loadedFrom: null };
    return cache;
  }

  const keys = new Set();
  const names = new Set();
  const clean = [];
  for (const r of rows) {
    const company = (r.Company || r.company || r.Name || '').trim();
    const symbol = (r.Symbol || r.symbol || '').trim().toUpperCase();
    const exchange = (r.Exchange || r.exchange || '').trim().toUpperCase();
    const note = (r.Note || r.note || '').trim();
    if (!company && !symbol) continue;
    if (symbol && exchange) keys.add(`${exchange}:${symbol}`);
    if (company) names.add(normalizeName(company));
    clean.push({ company, symbol, exchange, note, resolved: Boolean(symbol) });
  }
  cache = { rows: clean, keys, names, loadedFrom: FILE };
  return cache;
}

/**
 * Is this issuer already a client?
 *
 * Matches on `EXCHANGE:SYMBOL` first. The name fallback requires an exact
 * normalised match, or a prefix that differs by at most one trailing word, so
 * "RZOLV Technologies Inc. (Innovation Mining)" still matches RZOLV
 * Technologies Inc. while unrelated names sharing a word do not.
 */
export function isClient(issuer, roster) {
  if (!roster || (!roster.keys.size && !roster.names.size)) return false;
  if (issuer.key && roster.keys.has(String(issuer.key).toUpperCase())) return true;
  if (issuer.symbol && issuer.exchange
      && roster.keys.has(`${String(issuer.exchange).toUpperCase()}:${String(issuer.symbol).toUpperCase()}`)) {
    return true;
  }
  const k = normalizeName(issuer.name);
  if (!k) return false;
  if (roster.names.has(k)) return true;
  for (const n of roster.names) {
    if (!n) continue;
    const [long, short] = n.length > k.length ? [n, k] : [k, n];
    if (long.startsWith(`${short} `) && long.slice(short.length + 1).split(' ').length === 1) return true;
  }
  return false;
}

/** Tag every issuer with `isClient`, for filtering and for the UI badge. */
export async function tag(issuers) {
  const roster = await load();
  return issuers.map((i) => ({ ...i, isClient: isClient(i, roster) }));
}

export const meta = { id: 'clients', label: 'Market One client roster', file: FILE };
