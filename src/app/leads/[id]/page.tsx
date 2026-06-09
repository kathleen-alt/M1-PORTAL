import { notFound } from "next/navigation";
import Link from "next/link";
import { getActivities, getCampaigns, getEnrollments, getLead, getProjects } from "@/lib/store";
import { recommendLead } from "@/lib/prospecting/recommend";
import { industryLabel } from "@/lib/taxonomy";
import { PageHeader, ScoreBar, ScoreRing } from "@/components/ui";
import ActivityPanel from "@/components/ActivityPanel";
import OutreachPanel from "@/components/OutreachPanel";
import EnrichmentPanel from "@/components/EnrichmentPanel";
import { categoryBadge, locationLabel, mapsUrl, moneyRange, normalizeUrl, scoreColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function LeadDetail({ params }: { params: { id: string } }) {
  const lead = getLead(params.id);
  if (!lead) notFound();
  const rec = recommendLead(lead, getProjects());
  const activities = getActivities(lead.id);
  const campaigns = getCampaigns().map((c) => ({ id: c.id, name: c.name }));
  const activeEnrollment = getEnrollments(lead.id).find((e) => e.status !== "completed");

  return (
    <div>
      <Link href="/leads" className="text-sm text-orca-400 hover:underline">
        ← Back to Lead Discovery
      </Link>
      <PageHeader
        title={lead.name}
        subtitle={`${industryLabel(lead.industry)} · ${lead.address.city ? lead.address.city + ", " : ""}${lead.address.region}, ${lead.address.country} · Tier ${rec.scores.tier}`}
        action={<span className={`pill ${categoryBadge(rec.category)}`}>{rec.category}</span>}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Scores */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="section-title">Opportunity Scores</div>
              <ScoreRing score={rec.scores.opportunity} label="Opp" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
              <ScoreBar label="Playground Fit" score={rec.scores.playgroundFit} />
              <ScoreBar label="Budget Likelihood" score={rec.scores.budgetLikelihood} />
              <ScoreBar label="Family Traffic" score={rec.scores.familyTraffic} />
              <ScoreBar label="Decision-Maker Access" score={rec.scores.decisionMakerAccess} />
              <ScoreBar label="Revenue Potential" score={rec.scores.revenuePotential} />
              <ScoreBar label="Lead Qualification" score={rec.leadScore} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-orca-800 pt-4 text-sm">
              <div>
                <div className="stat-label">Est. Value (indicative)</div>
                <div className="mt-0.5 font-semibold text-white">
                  {moneyRange(rec.estimatedValue.low, rec.estimatedValue.high)}
                </div>
              </div>
              <div>
                <div className="stat-label">Close Probability</div>
                <div className={`mt-0.5 font-semibold ${scoreColor(rec.closeProbability)}`}>
                  {rec.closeProbability}%
                </div>
              </div>
              <div>
                <div className="stat-label">Data Confidence</div>
                <div className="mt-0.5 font-semibold text-white">{lead.dataConfidence}</div>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-orca-100">
              {rec.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-kelp-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <EnrichmentPanel lead={lead} />

          <OutreachPanel
            leadId={lead.id}
            campaigns={campaigns}
            initialContacts={lead.contacts}
            initialEnrollment={activeEnrollment}
          />

          <ActivityPanel leadId={lead.id} initialStage={lead.stage} initialActivities={activities} />
        </div>

        <div className="space-y-4">
          {/* Location & vetting */}
          <div className="card">
            <div className="section-title mb-2">Location &amp; Vetting</div>
            <div className="text-sm text-orca-100">{locationLabel(lead.address)}</div>
            {lead.phone && <div className="mt-1 text-sm text-orca-200">{lead.phone}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={mapsUrl({
                  name: lead.name,
                  city: lead.address.city,
                  region: lead.address.region,
                  country: lead.address.country,
                  lat: lead.address.lat,
                  lng: lead.address.lng,
                })}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                📍 View on Google Maps
              </a>
              {normalizeUrl(lead.website) && (
                <a href={normalizeUrl(lead.website)} target="_blank" rel="noreferrer" className="btn-ghost">
                  🔗 Visit website
                </a>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="card">
            <div className="section-title mb-3">Contacts</div>
            {lead.contacts.length === 0 && (
              <p className="text-sm text-orca-400">
                No contacts yet. Enrichment (Apollo/Hunter) or manual entry fills these.
              </p>
            )}
            {lead.contacts.map((c) => (
              <div key={c.id} className="mb-3 border-b border-orca-800 pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{c.name}</span>
                  {c.isDecisionMaker && (
                    <span className="pill bg-kelp-600/30 text-kelp-300">decision maker</span>
                  )}
                </div>
                <div className="text-xs text-orca-300">{c.role}</div>
                {c.email && <div className="text-xs text-orca-200">{c.email}</div>}
                {c.phone && <div className="text-xs text-orca-200">{c.phone}</div>}
              </div>
            ))}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" className="text-sm text-orca-400 hover:underline">
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* Lookalikes */}
          <div className="card">
            <div className="section-title mb-3">Similar Orca Coast Projects</div>
            {rec.lookalikes.map((m) => (
              <div key={m.project.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{m.project.name}</span>
                  <span className="text-xs text-orca-300">{m.similarity}%</span>
                </div>
                <div className="text-xs text-orca-400">{m.reasons.join(" · ")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
