// Issuer persistence.
//
// A JSON document store on disk: no native dependency to build, trivially
// diffable, and fast enough for the tens of thousands of records the four
// venues produce. Writes are atomic (temp file + rename) so an interrupted
// refresh cannot truncate the dataset.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'issuers.json');
const SEED_FILE = path.join(DATA_DIR, 'issuers.seed.json');

const EMPTY = { version: 1, updatedAt: null, runs: [], issuers: {} };

let cache = null;

async function readFile(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Load the store, falling back to the committed POC seed on first run. */
export async function load() {
  if (cache) return cache;
  cache = (await readFile(DB_FILE)) || (await readFile(SEED_FILE)) || { ...EMPTY };
  if (!cache.issuers) cache.issuers = {};
  if (!cache.runs) cache.runs = [];
  return cache;
}

export async function save() {
  if (!cache) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache));
  await fs.rename(tmp, DB_FILE);
}

export async function all() {
  return Object.values((await load()).issuers);
}

export async function get(key) {
  return (await load()).issuers[key] || null;
}

/**
 * Merge records in by key, preserving fields the incoming partial does not set.
 * A universe refresh must not wipe enrichment gathered by a previous scan.
 */
export async function upsertMany(records) {
  const db = await load();
  for (const rec of records) {
    if (!rec?.key) continue;
    const prev = db.issuers[rec.key];
    db.issuers[rec.key] = prev ? { ...prev, ...rec, sources: { ...prev.sources, ...rec.sources } } : rec;
  }
  db.updatedAt = new Date().toISOString();
  return records.length;
}

export async function replaceAll(records) {
  const db = await load();
  db.issuers = Object.fromEntries(records.filter((r) => r?.key).map((r) => [r.key, r]));
  db.updatedAt = new Date().toISOString();
  return records.length;
}

/** Record what a pipeline run did, so the UI can show data provenance and age. */
export async function logRun(entry) {
  const db = await load();
  db.runs.unshift({ at: new Date().toISOString(), ...entry });
  db.runs = db.runs.slice(0, 50);
}

export async function stats() {
  const db = await load();
  const issuers = Object.values(db.issuers);
  const byExchange = {};
  let enriched = 0;
  let scanned = 0;
  let scored = 0;
  for (const it of issuers) {
    byExchange[it.exchange] = (byExchange[it.exchange] || 0) + 1;
    if (it.marketDataAt) enriched += 1;
    if (it.siteScanAt) scanned += 1;
    if (it.fit?.score != null) scored += 1;
  }
  return {
    total: issuers.length,
    byExchange,
    enriched,
    scanned,
    scored,
    updatedAt: db.updatedAt,
    lastRun: db.runs[0] || null,
  };
}

/** Test hook — drop the in-process cache so the next load re-reads disk. */
export function _reset() {
  cache = null;
}
