#!/usr/bin/env node
// Rebuild server/data/issuers.seed.json from the Market One x Zevenue POC workbook.
//
//   node cli/seed-from-poc.js
//
// The workbook's two qualified sheets are committed as CSV under data/poc/. Its
// cells are analyst prose rather than numbers ("$3.6M/day = 160% of peer median
// $2.2M"), so this reads the figures back out of that prose into the canonical
// record shape. The result seeds the portal so it is populated and scored before
// the first live refresh, and gives the model a known-good set to check against.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../issuers/http.js';
import { issuerKey } from '../issuers/normalize.js';
import { classifySector, capBand, scoreAll } from '../issuers/score.js';
import { yahooSymbol } from '../issuers/sources/yahoo.js';
import { stocktwitsSymbol } from '../issuers/sources/stocktwits.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POC_DIR = path.resolve(__dirname, '../data/poc');
const OUT = path.resolve(__dirname, '../data/issuers.seed.json');

const MULT = { K: 1e3, M: 1e6, B: 1e9 };
const blank = (v) => !v || ['-', '—', '–', 'n/a', 'N/A', ''].includes(String(v).trim());

/** "$3.6M", "$103,799,104", "C$92M" -> a number. */
function money(text) {
  if (blank(text)) return null;
  const m = String(text).match(/\$\s*([\d,]+(?:\.\d+)?)\s*([KMB])?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return n * (m[2] ? MULT[m[2].toUpperCase()] : 1);
}

/** "58% below 52w high" -> -0.58 */
function drawdown(text) {
  if (blank(text)) return null;
  const m = String(text).match(/(\d+(?:\.\d+)?)\s*%\s*below/i);
  return m ? -Number(m[1]) / 100 : null;
}

/** "CONVICTION GAP: 9,686 watchers but only ..." -> 9686 */
function watchers(text) {
  if (blank(text)) return null;
  const m = String(text).match(/([\d,]+)\s*watchers/i);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

/** "$3.6M/day = 160% of peer median $2.2M" -> { perDay, peerMedian } */
function volume(text) {
  if (blank(text)) return {};
  const s = String(text);
  const per = s.match(/\$\s*([\d,.]+)\s*([KMB])?\s*\/\s*day/i);
  const peer = s.match(/peer median\s*\$\s*([\d,.]+)\s*([KMB])?/i);
  const toNum = (m) => (m ? Number(m[1].replace(/,/g, '')) * (m[2] ? MULT[m[2].toUpperCase()] : 1) : null);
  return { perDay: toNum(per), peerMedian: toNum(peer) };
}

/**
 * The incumbent column is the sheet's most judgement-heavy field. It reads
 * either "Runs IR in-house (ir@x.com) - release footer" or names an agency.
 */
function incumbent(text) {
  if (blank(text)) return { hasIncumbentAgency: null, incumbentAgency: null, irPosture: 'unknown' };
  const s = String(text);
  const email = (s.match(/\b[\w.%+-]+@[\w.-]+\.\w{2,}\b/) || [null])[0];

  // Order matters. The sheet marks retained agencies with an explicit
  // "PAYS EXTERNAL AGENCY:" prefix, and several of those rows *also* mention an
  // in-house name further along ("...; in-house Deborah Elson also listed").
  // Testing for "in-house" first would flip those to no-incumbent and invert
  // the signal, so the explicit marker is checked first.
  const paysExternal = /pays\s+external\s+agency/i.test(s);
  const inHouse = !paysExternal && /in-?house/i.test(s);

  if (inHouse) {
    return {
      hasIncumbentAgency: false,
      incumbentAgency: null,
      incumbentEvidence: /footer/i.test(s) ? 'release/page footer' : 'analyst note',
      irPosture: 'in-house',
      irEmail: email ? email.toLowerCase() : null,
      incumbentNote: s,
    };
  }
  // Anything else names a provider. Strip the sheet's marker, cut at the
  // evidence clause ("- named in their own release footer"), and drop the
  // parenthetical contact names so the tag reads as the agency itself.
  const name = s
    .replace(/^pays\s+external\s+agency\s*:?\s*/i, '')
    .replace(/^(retains|uses|incumbent)[:\s]*/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s+[—–-]\s+/)[0]
    .split(/;/)[0]
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    hasIncumbentAgency: true,
    incumbentAgency: name || s.slice(0, 60),
    incumbentEvidence: /footer/i.test(s) ? 'release/page footer' : 'analyst note',
    irPosture: 'agency-retained',
    irEmail: email ? email.toLowerCase() : null,
    incumbentNote: s,
  };
}

function domain(text) {
  if (blank(text)) return null;
  const s = String(text).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return s.includes('.') ? `https://${s}` : null;
}

function year(text) {
  if (blank(text)) return null;
  const m = String(text).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** Map one workbook row onto the canonical issuer record. */
function fromRow(row, sheet) {
  const symbol = String(row.Symbol || '').trim().toUpperCase();
  if (!symbol) return null;

  // Labels must match what the universe adapters emit, or the same company
  // arriving from a live refresh would be stored under a second key. NYSE
  // American is its own venue, not NYSE.
  const exchangeRaw = String(row.Exchange || '').trim().toUpperCase();
  const exchange =
    exchangeRaw.includes('TSXV') || exchangeRaw.includes('VENTURE') ? 'TSXV'
    : exchangeRaw.includes('CSE') ? 'CSE'
    : exchangeRaw.includes('TSX') ? 'TSX'
    : exchangeRaw.includes('OTC') ? 'OTC'
    : exchangeRaw.includes('AMERICAN') || exchangeRaw.includes('AMEX') ? 'NYSE American'
    : exchangeRaw.includes('ARCA') ? 'NYSE Arca'
    : exchangeRaw.includes('NYSE') ? 'NYSE'
    : 'NASDAQ';

  const vol = volume(row['Low Volume'] || row['Avg $ Volume/day (3-month average)']);
  const marketCap = money(row['Market Cap'] || row['Live Market Cap']);
  const revenue = /pre-?revenue/i.test(row['Revenue (latest)'] || row['Revenue 2025'] || '')
    ? 0
    : money(row['Revenue 2025'] || row['Revenue (latest)']);
  const cash = money(row.Cash || row['Cash / Treasury']);
  const inc = incumbent(row['Incumbent PR/IR (footer-verified)'] || row['Media Provider (receipt)']);
  const website = domain(row.Domain);
  const sector = classifySector(row['Hot Sector'], row.Sector, row.Industry, row['What They Do (1-line)'], row.Name);
  const watcherCount = watchers(row['Conviction Gap (watchers vs trading)'] || row['Awareness Gap (StockTwits watchers vs $ traded)']);

  const irHire = row['New IR Hire'] || row['In-house IR / Comms (name, tenure)'] || '';
  const jobPosting = row['IR Job Posting'] || row['IR Job Posting (6 months)'] || '';

  return {
    key: issuerKey(symbol, exchange),
    symbol,
    name: String(row.Name || '').trim() || symbol,
    exchange,
    yahooSymbol: yahooSymbol(symbol, exchange),
    stocktwitsSymbol: stocktwitsSymbol(symbol, exchange),

    price: money(row['Live Price']),
    marketCap,
    capBand: capBand(marketCap),
    avgDollarVolume3m: vol.perDay ?? null,
    peerMedianDollarVolume: vol.peerMedian ?? null,
    drawdownPct: drawdown(row.Drawdown),
    watchers: watcherCount,

    revenue,
    cash,
    enterpriseValue: money(row.EV),

    sector: row.Sector || null,
    industry: row.Industry || null,
    sectorGroup: sector.id,
    sectorLabel: sector.label,
    sectorScore: sector.score,
    website,
    summary: row['What They Do (1-line)'] || null,
    listingYear: year(row['IPO Year']),

    ...inc,
    irJobPosting: blank(jobPosting) ? null : jobPosting,
    newIrHire: blank(irHire) ? null : irHire,

    // The analyst's own qualification notes, preserved verbatim.
    analystNotes: {
      whyFit: row['Why this company is a good fit for Market One'] || row['Why reach out to this company?'] || null,
      catalyst: row['Catalyst Runway'] || row['Catalyst & Window'] || null,
      ambition: row['Growth Ambition (Gap Test v2)'] || row['Growth Ambition (from their own filings)'] || row['Growth Ambition'] || null,
      financing: row['Active Financing'] || row['Financing (latest) + Use of Proceeds'] || null,
      contact: row['Primary Contact + LinkedIn'] || null,
    },

    sources: { universe: `poc-workbook:${sheet}`, marketData: 'poc-workbook' },
    provenance: 'Market One x Zevenue POC workbook',
    universeAt: new Date().toISOString(),
    marketDataAt: new Date().toISOString(),
  };
}

async function readSheet(file) {
  try {
    return parseCsv(await fs.readFile(path.join(POC_DIR, file), 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const sheets = [
    ['qualified-companies.csv', 'Qualified Companies'],
    ['v2-final.csv', 'V2 Final'],
  ];

  const byKey = new Map();
  for (const [file, label] of sheets) {
    for (const row of await readSheet(file)) {
      const rec = fromRow(row, label);
      if (!rec) continue;
      // Later sheets are the more recent analyst pass, so they win on conflict.
      byKey.set(rec.key, byKey.has(rec.key) ? { ...byKey.get(rec.key), ...rec } : rec);
    }
  }

  const scored = scoreAll([...byKey.values()]);
  const db = {
    version: 1,
    updatedAt: new Date().toISOString(),
    seededFrom: 'Market One x Zevenue POC workbook',
    runs: [{ at: new Date().toISOString(), stage: 'seed', scored: scored.length }],
    issuers: Object.fromEntries(scored.map((r) => [r.key, r])),
  };

  await fs.writeFile(OUT, `${JSON.stringify(db, null, 2)}\n`);

  const tiers = {};
  for (const s of scored) tiers[s.fit.tier] = (tiers[s.fit.tier] || 0) + 1;
  console.log(`Seeded ${scored.length} issuers -> ${path.relative(process.cwd(), OUT)}`);
  console.log(`Tiers: ${JSON.stringify(tiers)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
