import { discoverLeads } from "@/lib/discovery";
import { getProjects } from "@/lib/store";
import { recommendLead } from "@/lib/prospecting/recommend";
import { ALL_INDUSTRIES, industryLabel } from "@/lib/taxonomy";
import type { Industry } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { categoryBadge, moneyRange, scoreColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadDiscovery({
  searchParams,
}: {
  searchParams: { industry?: string; city?: string; region?: string; postalCode?: string };
}) {
  const result = await discoverLeads({
    industry: searchParams.industry as Industry | undefined,
    city: searchParams.city,
    region: searchParams.region,
    postalCode: searchParams.postalCode,
  });
  const projects = getProjects();

  return (
    <div>
      <PageHeader
        title="Lead Discovery Engine"
        subtitle="Search by industry, city, province/state, postal code, and radius. Each result is enriched with contacts and scored for confidence and fit."
      />

      <form className="card mb-6 grid grid-cols-5 items-end gap-3" method="get">
        <label className="text-xs text-orca-300">
          Industry
          <select
            name="industry"
            defaultValue={searchParams.industry ?? ""}
            className="mt-1 w-full rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All industries</option>
            {ALL_INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {industryLabel(i)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-orca-300">
          City
          <input
            name="city"
            defaultValue={searchParams.city ?? ""}
            className="mt-1 w-full rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
            placeholder="e.g. Calgary"
          />
        </label>
        <label className="text-xs text-orca-300">
          Province / State
          <input
            name="region"
            defaultValue={searchParams.region ?? ""}
            className="mt-1 w-full rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
            placeholder="e.g. AB"
          />
        </label>
        <label className="text-xs text-orca-300">
          Postal / ZIP
          <input
            name="postalCode"
            defaultValue={searchParams.postalCode ?? ""}
            className="mt-1 w-full rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
            placeholder="e.g. T3K"
          />
        </label>
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      <p className="mb-4 text-xs text-orca-400">
        {result.leads.length} result(s) · source: {result.source} · {result.note}
      </p>

      <div className="overflow-hidden rounded-xl border border-orca-800">
        <table className="w-full text-sm">
          <thead className="bg-orca-900/80 text-left text-xs uppercase text-orca-300">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Main Contact</th>
              <th className="px-4 py-3">Data Conf.</th>
              <th className="px-4 py-3">Est. Value (ind.)</th>
              <th className="px-4 py-3">Opp</th>
              <th className="px-4 py-3">Category</th>
            </tr>
          </thead>
          <tbody>
            {result.leads.map((lead) => {
              const rec = recommendLead(lead, projects);
              const dm = lead.contacts.find((c) => c.isDecisionMaker) ?? lead.contacts[0];
              return (
                <tr key={lead.id} className="border-t border-orca-800 hover:bg-orca-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{lead.name}</div>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orca-400 hover:underline"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-orca-200">{industryLabel(lead.industry)}</td>
                  <td className="px-4 py-3 text-orca-200">
                    {lead.address.city}, {lead.address.region}
                  </td>
                  <td className="px-4 py-3 text-orca-200">
                    {dm ? (
                      <>
                        <div>{dm.name}</div>
                        <div className="text-xs text-orca-400">{dm.role}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={scoreColor(lead.dataConfidence)}>{lead.dataConfidence}</span>
                  </td>
                  <td className="px-4 py-3 text-orca-100">
                    {moneyRange(rec.estimatedValue.low, rec.estimatedValue.high)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${scoreColor(rec.scores.opportunity)}`}>
                      {rec.scores.opportunity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${categoryBadge(rec.category)}`}>{rec.category}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
