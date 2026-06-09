import { getLeads, getProjects } from "@/lib/store";
import { recommendProspects } from "@/lib/prospecting/recommend";
import { generateEmail } from "@/lib/ai/email";
import { CAMPAIGN_TEMPLATES } from "@/lib/data/campaigns";
import { PageHeader } from "@/components/ui";
import { industryLabel } from "@/lib/taxonomy";
import { moneyRange, scoreColor } from "@/lib/format";

export const dynamic = "force-dynamic";

function focusForLead(industry: string): string[] {
  if (industry.includes("church")) return CAMPAIGN_TEMPLATES[1].focusPoints;
  if (industry.includes("daycare") || industry.includes("preschool"))
    return CAMPAIGN_TEMPLATES[2].focusPoints;
  if (industry === "ymca") return CAMPAIGN_TEMPLATES[0].focusPoints;
  return CAMPAIGN_TEMPLATES[3].focusPoints;
}

export default async function TerritoryManager() {
  const leads = getLeads();
  const projects = getProjects();
  // "Top 100" — capped at available leads in demo.
  const recs = recommendProspects(leads, projects, {
    excludeStages: ["Closed Won", "Closed Lost"],
    limit: 100,
  });

  // Generate an AI first-touch email for the top accounts.
  const withEmail = await Promise.all(
    recs.map(async (rec) => {
      const email = await generateEmail({
        lead: rec.lead,
        emailType: "first_touch",
        campaignFocus: focusForLead(rec.lead.industry),
        similarProject: rec.lookalikes[0]?.project,
      });
      return { rec, email };
    }),
  );

  return (
    <div>
      <PageHeader
        title="AI Territory Manager"
        subtitle="Every Monday the engine assembles the top organizations Orca Coast should contact — complete with contacts, estimated project size, the most similar past customer, a suggested outreach sequence, and an AI-generated first-touch email."
      />

      <div className="space-y-4">
        {withEmail.map(({ rec, email }, i) => {
          const dm = rec.decisionMakers[0] ?? rec.lead.contacts[0];
          return (
            <div key={rec.lead.id} className="card">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 flex items-center gap-3 lg:col-span-4">
                  <span className="text-lg font-bold text-orca-400">#{i + 1}</span>
                  <div>
                    <div className="font-semibold text-white">{rec.lead.name}</div>
                    <div className="text-xs text-orca-300">
                      {industryLabel(rec.lead.industry)} · {rec.lead.address.city},{" "}
                      {rec.lead.address.region}
                    </div>
                    {rec.lead.website && (
                      <a
                        href={rec.lead.website}
                        className="text-xs text-orca-400 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {rec.lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>

                <div className="col-span-6 text-sm lg:col-span-2">
                  <div className="stat-label">Contacts</div>
                  {dm && (
                    <div className="mt-0.5 text-orca-100">
                      <div>{dm.name}</div>
                      <div className="text-xs text-orca-300">{dm.email}</div>
                      <div className="text-xs text-orca-300">{dm.phone ?? rec.lead.phone}</div>
                    </div>
                  )}
                </div>

                <div className="col-span-6 text-sm lg:col-span-2">
                  <div className="stat-label">Est. Project Size (indicative)</div>
                  <div className="mt-0.5 font-medium text-white">
                    {moneyRange(rec.estimatedValue.low, rec.estimatedValue.high)}
                  </div>
                  <div className="stat-label mt-2">Similar Customer</div>
                  <div className="mt-0.5 text-xs text-orca-200">
                    {rec.lookalikes[0]?.project.name ?? "—"}
                  </div>
                </div>

                <div className="col-span-12 text-sm lg:col-span-2">
                  <div className="stat-label">Suggested Sequence</div>
                  <div className="mt-0.5 text-xs text-orca-200">
                    Email → Follow-up → Case study → Call → Final
                  </div>
                  <div className="stat-label mt-2">Opportunity</div>
                  <div className={`font-semibold ${scoreColor(rec.scores.opportunity)}`}>
                    {rec.scores.opportunity} · {rec.closeProbability}% close
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-2">
                  <div className="stat-label">AI First-Touch Email</div>
                </div>
              </div>

              <details className="mt-3 rounded-lg border border-orca-800 bg-orca-950/40 p-3">
                <summary className="cursor-pointer text-sm font-medium text-orca-200">
                  Subject: {email.subject}
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-orca-100">
                  {email.body}
                </pre>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
