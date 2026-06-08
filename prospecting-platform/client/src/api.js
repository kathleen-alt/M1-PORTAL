// API layer — routes to the bundled demo engine or the live /api/* endpoints
// depending on demo mode.
import { demo } from './demoFlag';
import { demoEngine } from './data';

async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Trim a company to the fields the server needs (drop client-only UI state).
const lean = (c) => ({
  name: c.name, ticker: c.ticker, exchange: c.exchange, industry: c.industry,
  marketCap: c.marketCapStr || c.marketCap, hq: c.hq, website: c.website,
  contacts: c.contacts, financings: c.financings, signals: c.signals,
});

export const api = {
  config: () => (demo.enabled ? Promise.resolve({ hasAnthropicKey: false, demo: true }) : jsonFetch('/api/config')),
  enrich: (c) => (demo.enabled ? demoEngine.enrich(c) : jsonFetch('/api/enrich', post({ company: lean(c) }))),
  research: (c) => (demo.enabled ? demoEngine.research(c) : jsonFetch('/api/research', post({ company: lean(c) }))),
  outreach: (c, contact, channel, signal, opts = {}) =>
    (demo.enabled
      ? demoEngine.outreach(c, contact, channel, opts)
      : jsonFetch('/api/outreach', post({ company: lean(c), contact, channel, type: channel === 'LinkedIn' ? 'linkedin' : 'email', signal, angle: opts.angle, instruction: opts.instruction }))),
  firstLine: (c, signal) =>
    (demo.enabled ? demoEngine.firstLine(c) : jsonFetch('/api/first-line', post({ company: lean(c), signal }))),
};
