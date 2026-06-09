import { getLeads, getProjects } from "@/lib/store";
import { opportunityHeatMap } from "@/lib/prospecting/recommend";
import { PageHeader } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const COUNTRY = { CA: "Canada", US: "United States" } as const;

export default function HeatMapPage() {
  const cells = opportunityHeatMap(getLeads(), getProjects());
  const max = Math.max(...cells.map((c) => c.totalPotential), 1);

  return (
    <div>
      <PageHeader
        title="Opportunity Heat Map"
        subtitle="Provinces and states ranked by expected revenue potential and concentration of high-opportunity, family-focused organizations."
      />

      <div className="grid grid-cols-3 gap-4">
        {cells.map((cell) => {
          const intensity = cell.totalPotential / max;
          return (
            <div
              key={`${cell.country}-${cell.region}`}
              className="card"
              style={{
                background: `linear-gradient(135deg, rgba(255,107,74,${0.08 + intensity * 0.35}), rgba(10,31,46,0.6))`,
              }}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-white">{cell.region}</h3>
                <span className="text-xs text-orca-300">{COUNTRY[cell.country as "CA" | "US"]}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="stat-label">Potential</div>
                  <div className="font-semibold text-white">{money(cell.totalPotential)}</div>
                </div>
                <div>
                  <div className="stat-label">Leads</div>
                  <div className="font-semibold text-white">{cell.leadCount}</div>
                </div>
                <div>
                  <div className="stat-label">Avg Opp</div>
                  <div className="font-semibold text-white">{cell.avgOpportunity}</div>
                </div>
                <div>
                  <div className="stat-label">Hot (80+)</div>
                  <div className="font-semibold text-emerald-400">{cell.hotLeads}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
