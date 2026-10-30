// Proposal history — what Market One has already pitched, and when.
//
// Every proposal and contract is a spreadsheet in the shared "Due Diligence
// Check Lists" Drive folder, named by a convention the sales team has followed
// since 2016: a date stamp, the document type, the company, and a bracketed
// price code. The filename alone carries enough to answer the question that
// matters for prospecting — have we been here before, and how recently — so
// this reads the index rather than opening 600 workbooks.
//
// The index lives at server/data/proposals.csv (Company, Date, Type, File).
// Without it nothing is tagged and the sweep runs unchanged.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './http.js';
import { normalizeName } from './clients.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.ISSUERS_PROPOSALS_FILE || path.resolve(__dirname, '../data/proposals.csv');

// Document type, strongest commitment first. A contract means they bought; a
// proposal means they were pitched and did not. Both are history, but only one
// of them means the mandate was ever actually won.
const TYPE_RANK = { contract: 0, renewal: 1, proposal: 2 };

/**
 * Pull the date out of a filename stamp.
 *
 * The convention is YYYYMMDD, but the folder holds three other spellings that
 * are plainly the same intent: MMDDYYYY (`10062026 First Phosphate`), YYYYDDMM
 * (`20262910 RZOLV`, a transposition), and a stamp trailing the name
 * (`... DDC Regular (39C A) 20251125`). Each is accepted only when it resolves
 * to a real calendar date, and ambiguity is broken in the order above.
 *
 * @param {string} stamp  8 digits
 * @returns {string|null} ISO date, or null when no reading is a real date
 */
export function parseStamp(stamp) {
  const s = String(stamp || '');
  if (!/^\d{8}$/.test(s)) return null;
  const valid = (y, m, d) => {
    if (y < 2010 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  };
  const n = (a, b) => Number(s.slice(a, b));
  // YYYYMMDD, then MMDDYYYY, then the YYYYDDMM transposition.
  return valid(n(0, 4), n(4, 6), n(6, 8))
    || valid(n(4, 8), n(0, 2), n(2, 4))
    || valid(n(0, 4), n(6, 8), n(4, 6));
}

const TYPE_WORDS = /\b(proposals?|contracts?|renewals?|extensions?|EEOS|EOS|DDC|upsell)\b/ig;

/**
 * Read a company name and a document type out of a proposal filename.
 *
 * @param {string} filename
 * @returns {{company:string, type:string, date:string|null}|null} null when the
 *   name carries no company — a template, a test file, a folder, a recording
 */
export function parseFilename(filename) {
  let t = String(filename || '').trim();
  if (!t) return null;

  // Strip the extension and the duplicate marker Drive appends.
  t = t.replace(/\.(xlsx?|pdf|docx?|csv|numbers)$/i, '').replace(/\s*\(\d+\)\s*$/, '');

  // Dry runs of the template are not history. "TEST of 20260921 Banyan Gold
  // Corp. Proposal (534S ALG)" is somebody checking the arithmetic.
  if (/^(test|tst)\b/i.test(t) || /\btest\b/i.test(t.split(/\s+/).slice(0, 3).join(' '))) return null;

  // Nor are the blank templates the convention is copied from ("2024XXXX
  // Company", "... Regular EXAMPLE"), a meeting recording's transcript, or
  // another agency's paperwork that happens to sit in the same Drive.
  if (/X{4,}|\bEXAMPLE\b/i.test(t)) return null;
  if (/Notes by Gemini|- Recording$|Alliance Advisors/i.test(t)) return null;

  // The date stamp leads the name, or trails it in a handful of older files.
  let date = null;
  // The stamp is normally eight digits and a space. A handful were typed with
  // a stray digit, or with no space before the name at all.
  const lead = t.match(/^(\d{8,10})\s*/);
  if (lead) {
    // 202622210 and friends are nine digits: a slipped keystroke. Read the
    // first eight and let the validity check decide.
    date = parseStamp(lead[1].slice(0, 8));
    t = t.slice(lead[0].length);
  } else {
    const trail = t.match(/\s+(\d{8})$/);
    if (trail) {
      date = parseStamp(trail[1]);
      t = t.slice(0, trail.index);
    }
  }

  const typeWords = t.match(TYPE_WORDS) || [];
  const lower = typeWords.join(' ').toLowerCase();
  let type = 'proposal';
  if (/contract/.test(lower)) type = 'contract';
  else if (/renewal|extension|eos/.test(lower)) type = 'renewal';
  else if (!typeWords.length) return null; // not a proposal document at all

  // Everything that is not the company: the agency's own initials, the
  // document type, the bracketed price code, a version marker, a dollar figure,
  // and the free text sales adds after the name ("Exchange of Services",
  // "Social Media Upsell", "Lead Gen/NA Placements").
  // Order matters: the multi-word phrases go first, because TYPE_WORDS would
  // otherwise eat "Extension" out of "Exchange and Extension of Services" and
  // "EOS" out of "EOS New", leaving the remainder stuck to the company name.
  let company = t
    .replace(/\bM1\b/g, ' ')
    .replace(/\((?:formerly|previously)[^)]*\)/ig, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bRenewal\s*\/\s*Extension\b/ig, ' ')
    .replace(/\b(Extension|Exchange)( and (Extension|Exchange))?( of)? Services\b/ig, ' ')
    .replace(/\bof Services\b/ig, ' ')
    .replace(/\bEOS\s*:?\s*(New|Old|Extension)\b/ig, ' ')
    .replace(/\bExchange Items\b|\bRemaining Value\b|\bLead Gen\b|\bNA Placements\b|\bSocial Media\b|\bSM and PD\b/ig, ' ')
    .replace(TYPE_WORDS, ' ')
    .replace(/\bV\d\b/ig, ' ')
    .replace(/\b\d+(\.\d+)?K\b/ig, ' ')
    .replace(/[\t]+/g, ' ')
    .replace(/\s*[/,]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .trim();

  // Price-code and status words the convention leaves outside the brackets,
  // stacked in any order: "Argentina Lithium LG A", "Dolly Varden Silver Corp.
  // Signed". Peel them one at a time until the name stops shrinking.
  const TRAILING = /\s+(Regular|Upsell|New|Old|Cash|Signed|Executed|Final|Draft|Option\s*\d+|LG|ALG|A|S|C|E)$/i;
  while (TRAILING.test(company)) company = company.replace(TRAILING, '');
  company = company.replace(/\s+/g, ' ').trim();

  // A name reduced to nothing, or to a bare qualifier, carried no company.
  if (!company || company.length < 3) return null;
  if (!/[a-z]/i.test(company)) return null;

  return { company, type, date };
}

let cache = null;

/**
 * @returns {Promise<{byName:Map<string,object>, rows:object[], loadedFrom:string|null}>}
 */
export async function load({ reload = false } = {}) {
  if (cache && !reload) return cache;
  let rows = [];
  try {
    rows = parseCsv(await fs.readFile(FILE, 'utf8'));
  } catch {
    cache = { byName: new Map(), rows: [], loadedFrom: null };
    return cache;
  }

  const byName = new Map();
  const clean = [];
  for (const r of rows) {
    const company = (r.Company || r.company || '').trim();
    if (!company) continue;
    const row = {
      company,
      date: (r.Date || r.date || '').trim() || null,
      type: ((r.Type || r.type || 'proposal').trim() || 'proposal').toLowerCase(),
      file: (r.File || r.file || '').trim(),
    };
    clean.push(row);
    const k = normalizeName(company);
    if (!k) continue;
    const prev = byName.get(k);
    if (!prev) byName.set(k, { key: k, company, docs: [row] });
    else prev.docs.push(row);
  }

  // Newest first within a company, so "last pitched" is docs[0].
  for (const entry of byName.values()) {
    entry.docs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    entry.lastDate = entry.docs[0]?.date || null;
    entry.count = entry.docs.length;
    entry.bestType = entry.docs
      .map((d) => d.type)
      .sort((a, b) => (TYPE_RANK[a] ?? 9) - (TYPE_RANK[b] ?? 9))[0] || 'proposal';
  }

  cache = { byName, rows: clean, loadedFrom: FILE };
  return cache;
}

/**
 * Has this issuer been pitched before?
 *
 * Name matching mirrors the client roster: an exact normalised match, or a
 * prefix differing by at most one trailing word, so "Banyan Gold Corp" matches
 * "Banyan Gold" while "Gold Terra" never matches "Golden Arrow".
 *
 * @returns {{lastDate:string|null, count:number, type:string, company:string}|null}
 */
export function findHistory(issuer, index) {
  if (!index || !index.byName.size) return null;
  const k = normalizeName(issuer.name);
  if (!k) return null;
  const hit = index.byName.get(k);
  if (hit) return summarize(hit);
  for (const entry of index.byName.values()) {
    const n = entry.key;
    const [long, short] = n.length > k.length ? [n, k] : [k, n];
    if (long.startsWith(`${short} `) && long.slice(short.length + 1).split(' ').length === 1) {
      return summarize(entry);
    }
  }
  return null;
}

function summarize(entry) {
  return {
    company: entry.company,
    lastDate: entry.lastDate,
    count: entry.count,
    type: entry.bestType,
    docs: entry.docs.slice(0, 5),
  };
}

/** Tag every issuer with its proposal history, for filtering and the UI badge. */
export async function tag(issuers) {
  const index = await load();
  return issuers.map((i) => {
    const h = findHistory(i, index);
    return h ? { ...i, proposalHistory: h } : i;
  });
}

export const meta = { id: 'proposals', label: 'Market One proposal history', file: FILE };
