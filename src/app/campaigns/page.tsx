import { CAMPAIGN_TEMPLATES } from "@/lib/data/campaigns";
import { getLeads } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import EmailStudio from "@/components/EmailStudio";

export const dynamic = "force-dynamic";

const channelIcon: Record<string, string> = {
  email: "✉️",
  phone: "📞",
  linkedin: "in",
  sms: "💬",
};

export default function CampaignsPage() {
  const leads = getLeads().map((l) => ({ id: l.id, name: l.name }));

  return (
    <div>
      <PageHeader
        title="Outreach Campaign Builder"
        subtitle="Multi-step sequences across email, LinkedIn, phone, and SMS. Start from a vertical template, then customize cadence timing."
      />

      <div className="mb-8 grid grid-cols-2 gap-4">
        {CAMPAIGN_TEMPLATES.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{c.name}</h3>
              <span className="pill bg-orca-700/50 text-orca-100">{c.vertical}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.focusPoints.map((f) => (
                <span key={f} className="pill bg-orca-800 text-orca-200">
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <div className="stat-label">Automated Cadence</div>
              <ol className="mt-2 space-y-2">
                {c.cadence.map((step, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-12 flex-shrink-0 items-center justify-center rounded bg-orca-800 text-xs font-medium text-orca-200">
                      Day {step.day}
                    </span>
                    <span aria-hidden>{channelIcon[step.channel]}</span>
                    <span className="text-orca-100">{step.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>

      <EmailStudio leads={leads} />
    </div>
  );
}
