import { getLeads, getProjects } from "@/lib/store";
import { marketExpansion } from "@/lib/prospecting/recommend";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const penetrationStyle: Record<string, string> = {
  none: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
  low: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  moderate: "bg-orca-500/20 text-orca-200 border border-orca-500/40",
  strong: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
};

export default function MarketExpansionPage() {
  const insights = marketExpansion(getLeads(), getProjects());
  const topGap = insights.find((i) => i.penetration === "none" || i.penetration === "low");

  return (
    <div>
      <PageHeader
        title="Market Expansion Finder"
        subtitle="The engine compares categories Orca Coast has WON against where open leads exist, and surfaces under-penetrated verticals worth a dedicated campaign."
      />

      {topGap && (
        <div className="card mb-6 border-orca-500/50 bg-orca-800/40">
          <div className="text-sm uppercase tracking-wide text-orca-300">Top Recommendation</div>
          <p className="mt-2 text-lg text-white">
            Orca Coast has{" "}
            {topGap.penetration === "none" ? "no closed projects" : "low penetration"} in{" "}
            <span className="font-semibold">{topGap.industry}</span>.
          </p>
          <p className="mt-1 text-sm text-orca-200">
            Estimated addressable market: <strong>{topGap.estimatedMarketSize}+</strong>{" "}
            organizations. Recommended campaign:{" "}
            <span className="font-semibold text-white">{topGap.industry} Outreach Campaign</span>.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-orca-800">
        <table className="w-full text-sm">
          <thead className="bg-orca-900/80 text-left text-xs uppercase text-orca-300">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Penetration</th>
              <th className="px-4 py-3">Past Projects</th>
              <th className="px-4 py-3">Open Leads</th>
              <th className="px-4 py-3">Est. Market</th>
              <th className="px-4 py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {insights.map((i) => (
              <tr key={i.industry} className="border-t border-orca-800">
                <td className="px-4 py-3 font-medium text-white">{i.industry}</td>
                <td className="px-4 py-3 text-orca-200">Tier {i.tier}</td>
                <td className="px-4 py-3">
                  <span className={`pill ${penetrationStyle[i.penetration]}`}>
                    {i.penetration}
                  </span>
                </td>
                <td className="px-4 py-3 text-orca-200">{i.pastProjects}</td>
                <td className="px-4 py-3 text-orca-200">{i.openLeads}</td>
                <td className="px-4 py-3 text-orca-100">{i.estimatedMarketSize}+</td>
                <td className="px-4 py-3 text-xs text-orca-300">{i.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
