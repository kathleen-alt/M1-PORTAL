import { getLeads } from "@/lib/store";
import { computeAnalytics } from "@/lib/analytics";
import { PageHeader, Stat } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  const a = computeAnalytics(getLeads());
  const maxStage = Math.max(...a.pipelineByStage.map((s) => s.count), 1);

  return (
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Funnel, outreach performance, and revenue pipeline across the engine."
      />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat label="Leads Generated" value={a.leadsGenerated} />
        <Stat label="Emails Sent" value={a.emailsSent} />
        <Stat label="Open Rate" value={`${a.openRate}%`} />
        <Stat label="Reply Rate" value={`${a.replyRate}%`} />
        <Stat label="Meetings Booked" value={a.meetingsBooked} />
        <Stat label="Opportunities" value={a.opportunities} />
        <Stat label="Revenue Pipeline" value={money(a.revenuePipeline)} />
        <Stat label="Closed Revenue" value={money(a.closedRevenue)} />
      </div>

      <div className="card">
        <div className="section-title mb-4">Pipeline by Stage</div>
        <div className="space-y-2">
          {a.pipelineByStage.map((s) => (
            <div key={s.stage} className="flex items-center gap-3">
              <div className="w-32 flex-shrink-0 text-sm text-orca-200">{s.stage}</div>
              <div className="h-6 flex-1 overflow-hidden rounded bg-orca-800">
                <div
                  className="flex h-full items-center justify-end rounded bg-orca-500 px-2 text-xs font-medium text-white"
                  style={{ width: `${Math.max((s.count / maxStage) * 100, s.count ? 8 : 0)}%` }}
                >
                  {s.count > 0 && s.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
