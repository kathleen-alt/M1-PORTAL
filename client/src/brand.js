// Brand layer — the same engine renders either brand. The active brand is chosen
// by window.__M1_BRAND__ (standalone builds) or the server's /api/config in live
// mode. Bullionaire follows its official brand guidelines (May 2025, v1.0):
//   Gold #af800b · Royal Blue #001e49 · Cream #ffebc0 · White
//   Headline: Proxima Nova Bold · Subheadline: Times New Roman · Body: Proxima Nova Light
// Proxima Nova is a licensed Adobe font that can't load from Google Fonts, so the
// web build uses Montserrat as the standard free stand-in. To ship pixel-exact
// type, add @font-face rules for the licensed Proxima Nova in styles.css and set
// the `fonts` below to 'Proxima Nova'.

// Bullionaire "B" icon — the OFFICIAL logo vector, extracted directly from the
// brand-guidelines PDF (icon page). Nonzero winding; counters are part of the path.
const BULLIONAIRE_ICON = {
  viewBox: '0 0 225.12 216',
  w: 225.12,
  h: 216,
  fillRule: 'nonzero',
  path:
    'M165.87 64.49 C165.87 80.53 152.6 87.32 131.62 87.32 L87.8 87.32 L87.8 41.65 L134.71 41.65 C154.76 41.65 165.87 49.68 165.87 63.87 L165.87 64.49 ' +
    'M184.7 103.06 C200.12 94.42 213.08 80.84 213.08 56.47 L213.08 55.85 C213.08 21.91 185.93 0.0 141.8 0.0 L41.65 0.0 L41.56 0.0 L41.52 0.0 L0.0 0.15 L41.52 41.52 L41.52 87.32 L0.0 87.47 L87.8 174.41 L87.8 126.82 L142.73 126.82 C167.11 126.82 177.91 135.77 177.91 150.27 L177.91 150.89 C177.91 166.94 165.26 174.34 144.27 174.34 L42.43 174.49 L0.77 174.49 L42.43 216.0 L144.27 216.0 C193.03 216.0 225.12 196.25 225.12 156.75 L225.12 156.14 C225.12 127.13 209.69 112.63 184.7 103.06',
};

const MO_SANS = "'Franklin Gothic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const BULL_SANS = "'Proxima Nova', 'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const BRANDS = {
  marketone: {
    id: 'marketone',
    name: 'Market One',
    tag: 'Content Intelligence',
    accent: '#3B82F6',
    accent2: '#06B6D4',
    accentSoft: 'rgba(59, 130, 246, 0.14)',
    wordmarkColor: null,
    icon: null, // uses the default coin mark
    fonts: {
      display: "'Superior Title', Georgia, 'Times New Roman', serif",
      body: MO_SANS,
      subhead: MO_SANS,
    },
    theme: {
      ink: '#0b0f1a', ink2: '#111726', panel: '#151c2e', panel2: '#1b2438',
      line: '#263049', lineSoft: '#1f283d', text: '#e8ecf6', textDim: '#c4ccde',
      muted: '#8d99b5', muted2: '#6b7796',
      glow1: 'rgba(59, 130, 246, 0.12)', glow2: 'rgba(6, 182, 212, 0.10)',
    },
    pillars: [
      { id: 'capital-markets', name: 'Capital Markets & IPOs', accent: '#3B82F6', blurb: 'Listings, financings, capital raises, exchange moves.' },
      { id: 'mining-metals', name: 'Mining & Metals', accent: '#F59E0B', blurb: 'Producers, explorers, commodities, drill results.' },
      { id: 'energy-cleantech', name: 'Energy & Cleantech', accent: '#10B981', blurb: 'Oil & gas, renewables, batteries, the transition.' },
      { id: 'tech-innovation', name: 'Technology & Innovation', accent: '#8B5CF6', blurb: 'AI, software, semis, frontier tech.' },
      { id: 'deals-ma', name: 'Deals & M&A', accent: '#EC4899', blurb: 'Mergers, acquisitions, takeovers, strategic stakes.' },
      { id: 'macro-markets', name: 'Macro & Markets', accent: '#06B6D4', blurb: 'Rates, inflation, indices, the broad tape.' },
      { id: 'esg-governance', name: 'ESG & Governance', accent: '#22C55E', blurb: 'Sustainability, disclosure, boards, stewardship.' },
    ],
  },
  bullionaire: {
    id: 'bullionaire',
    name: 'Bullionaire',
    tag: 'Precious-Metals Intelligence',
    accent: '#af800b', // brand Gold
    accent2: '#d0a02f',
    accentSoft: 'rgba(175, 128, 11, 0.18)',
    wordmarkColor: '#af800b',
    icon: BULLIONAIRE_ICON,
    fonts: {
      display: BULL_SANS, // Proxima Nova Bold → Montserrat
      body: BULL_SANS, // Proxima Nova Light → Montserrat
      subhead: "'Times New Roman', Times, serif", // brand subheadline
    },
    theme: {
      ink: '#001e49', // brand Royal Blue — primary background
      ink2: '#04264f', panel: '#0a2c58', panel2: '#123a6d',
      line: '#1f4677', lineSoft: '#173860', text: '#f3f6fb', textDim: '#d6e0ef',
      muted: '#93a6c6', muted2: '#7488ac',
      glow1: 'rgba(175, 128, 11, 0.12)', glow2: 'rgba(255, 235, 192, 0.06)',
    },
    pillars: [
      { id: 'gold', name: 'Gold', accent: '#E5B80B', blurb: 'Spot, futures, ETFs, price forecasts.' },
      { id: 'silver-pgms', name: 'Silver & PGMs', accent: '#C6CED8', blurb: 'Silver, platinum, palladium.' },
      { id: 'miners', name: 'Miners & Producers', accent: '#D98A3D', blurb: 'Gold & silver miners, earnings, output.' },
      { id: 'central-banks', name: 'Central Banks & Reserves', accent: '#7FB2FF', blurb: 'Official-sector buying, reserves, de-dollarization.' },
      { id: 'macro', name: 'Macro & Rates', accent: '#4FD1C5', blurb: 'Fed, inflation, real yields, the dollar.' },
      { id: 'physical', name: 'Physical & Mints', accent: '#E0A82E', blurb: 'Coins, bars, mints, premiums, demand.' },
      { id: 'digital-gold', name: 'Digital Gold & Crypto', accent: '#F7931A', blurb: 'Bitcoin as digital gold, tokenized gold, ETF flows.' },
    ],
  },
};

export function activeBrandId() {
  try {
    const b = window.__M1_BRAND__;
    if (b && BRANDS[b]) return b;
  } catch {
    /* ignore */
  }
  return 'marketone';
}

export function getBrand() {
  return BRANDS[activeBrandId()];
}

// Apply a brand's full palette + fonts as CSS variables (recolors the whole UI).
// Sets only the fields that are present, so a partial server brand still works.
export function applyTheme(brand) {
  if (!brand || typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const set = (k, v) => { if (v) r.setProperty(k, v); };
  set('--accent', brand.accent);
  set('--accent-2', brand.accent2);
  set('--accent-soft', brand.accentSoft);
  const t = brand.theme || {};
  set('--ink', t.ink); set('--ink-2', t.ink2); set('--panel', t.panel); set('--panel-2', t.panel2);
  set('--line', t.line); set('--line-soft', t.lineSoft);
  set('--text', t.text); set('--text-dim', t.textDim); set('--muted', t.muted); set('--muted-2', t.muted2);
  set('--bg-glow-1', t.glow1); set('--bg-glow-2', t.glow2);
  const f = brand.fonts || {};
  set('--serif', f.display); set('--sans', f.body); set('--subhead', f.subhead);
}
