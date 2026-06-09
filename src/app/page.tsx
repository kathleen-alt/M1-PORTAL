import { getLeads, getProjects } from "@/lib/store";
import { recommendProspects } from "@/lib/prospecting/recommend";
import { computeAnalytics } from "@/lib/analytics";
import RecommendationCard from "@/components/RecommendationCard";
import { PageHeader, Stat } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ExecutiveDashboard() {
  const leads = getLeads();
  const projects = getProjects();
  const recs = recommendProspects(leads, projects, {
    excludeStages: ["Closed Won", "Closed Lost"],
    limit: 8,
  });
  const analytics = computeAnalytics(leads);
  const above80 = recs.filter((r) => r.scores.opportunity >= 80).length;

  const today = new Date(2026, 5, 9); // matches demo "current date"
  const weekOf = today.toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Who Should We Contact This Week?"
        subtitle={`Week of ${weekOf}. The Prospect Recommendation Engine ranks every account by Opportunity Score, matches it to similar Orca Coast wins, and tells you why it made the list.`}
      />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat label="Recommended Accounts" value={recs.length} />
        <Stat label="Scoring Above 80" value={above80} />
        <Stat label="Weighted Pipeline" value={money(analytics.revenuePipeline)} />
        <Stat
          label="Top Opportunity"
          value={recs[0] ? `${recs[0].scores.opportunity}` : "—"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {recs.map((rec, i) => (
          <RecommendationCard key={rec.lead.id} rec={rec} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
