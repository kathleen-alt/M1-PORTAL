// Exports ONLY real reference data for the self-contained demo:
//   - the real historical portfolio (227 completed projects)
//   - the industry taxonomy / scoring metadata
//   - campaign cadence templates
// The demo ships with NO leads; the user imports real leads in-browser and the
// engine computes scores, lookalikes, pipeline, and analytics live from them.
import { getProjects } from "../src/lib/store";
import { getLeads } from "../src/lib/store";
import { CAMPAIGN_TEMPLATES } from "../src/lib/data/campaigns";
import { INDUSTRY_META, ALL_INDUSTRIES, industryLabel } from "../src/lib/taxonomy";

const industryMeta: Record<string, any> = {};
for (const ind of ALL_INDUSTRIES) {
  const m = INDUSTRY_META[ind];
  industryMeta[ind] = {
    label: m.label,
    tier: m.tier,
    baseLow: m.baseValue.low,
    baseHigh: m.baseValue.high,
    childFocused: m.childFocused,
  };
}

const portfolio = getProjects().map((p) => ({
  name: p.name,
  ind: p.industry,
  label: industryLabel(p.industry),
  tier: INDUSTRY_META[p.industry].tier,
  child: INDUSTRY_META[p.industry].childFocused,
  city: p.city,
  region: p.region,
  country: p.country,
  website: p.website,
  year: p.year,
  value: p.contractValue,
}));

const sourcedLeads = getLeads().map((l) => ({
  id: l.id,
  name: l.name,
  industry: l.industry,
  website: l.website,
  phone: l.phone,
  address: l.address,
  contacts: l.contacts,
  signals: l.signals,
  dataConfidence: l.dataConfidence,
  source: l.source,
  stage: l.stage,
}));

const data = {
  generatedAt: new Date().toISOString(),
  industryMeta,
  campaigns: CAMPAIGN_TEMPLATES,
  portfolio,
  sourcedLeads,
};

process.stdout.write(JSON.stringify(data));
