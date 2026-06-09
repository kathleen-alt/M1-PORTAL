import type { ProspectRecommendation } from "@/lib/types";
import { industryLabel } from "@/lib/taxonomy";
import { categoryBadge, moneyRange, scoreColor } from "@/lib/format";
import { ScoreBar, ScoreRing } from "./ui";

export default function RecommendationCard({
  rec,
  rank,
}: {
  rec: ProspectRecommendation;
  rank?: number;
}) {
  const { lead, scores, estimatedValue, closeProbability, lookalikes } = rec;
  const topMatch = lookalikes[0];

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="text-xs font-bold text-orca-400">#{rank}</span>
            )}
            <h3 className="text-base font-semibold text-white">{lead.name}</h3>
            <span className={`pill ${categoryBadge(rec.category)}`}>{rec.category}</span>
          </div>
          <p className="mt-0.5 text-xs text-orca-300">
            {industryLabel(lead.industry)} · {lead.address.city}, {lead.address.region} ·
            Tier {scores.tier}
          </p>
        </div>
        <ScoreRing score={scores.opportunity} label="Opp" />
      </div>

      {/* Why selected */}
      <ul className="mt-3 space-y-1 text-sm text-orca-100">
        {rec.reasons.slice(0, 4).map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-orca-400">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
        <ScoreBar label="Playground Fit" score={scores.playgroundFit} />
        <ScoreBar label="Budget Likelihood" score={scores.budgetLikelihood} />
        <ScoreBar label="Family Traffic" score={scores.familyTraffic} />
        <ScoreBar label="Decision-Maker Access" score={scores.decisionMakerAccess} />
        <ScoreBar label="Revenue Potential" score={scores.revenuePotential} />
        <ScoreBar label="Lead Qualification" score={rec.leadScore} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-orca-800 pt-4 text-sm">
        <div>
          <div className="stat-label">Est. Value</div>
          <div className="mt-0.5 font-semibold text-white">
            {moneyRange(estimatedValue.low, estimatedValue.high)}
          </div>
        </div>
        <div>
          <div className="stat-label">Close Probability</div>
          <div className={`mt-0.5 font-semibold ${scoreColor(closeProbability)}`}>
            {closeProbability}%
          </div>
        </div>
        <div>
          <div className="stat-label">Decision Makers</div>
          <div className="mt-0.5 font-semibold text-white">{rec.decisionMakers.length}</div>
        </div>
      </div>

      {/* Decision makers */}
      {rec.decisionMakers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rec.decisionMakers.map((c) => (
            <span
              key={c.id}
              className="pill border border-orca-700 bg-orca-800/60 text-orca-100"
              title={c.email ?? ""}
            >
              {c.name} — {c.role}
            </span>
          ))}
        </div>
      )}

      {/* Similar Orca Coast projects */}
      {topMatch && (
        <div className="mt-4 rounded-lg border border-orca-800 bg-orca-950/40 p-3">
          <div className="stat-label">Similar Orca Coast Projects</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {lookalikes.map((m) => (
              <span
                key={m.project.id}
                className="pill bg-orca-700/50 text-orca-100"
                title={m.reasons.join(" · ")}
              >
                {m.project.name} ({m.similarity}%)
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-orca-300">{topMatch.reasons.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
