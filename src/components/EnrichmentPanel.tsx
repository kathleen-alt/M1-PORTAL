"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, OrgSignals, Socials } from "@/lib/types";

const BUDGET_LABEL: Record<string, string> = {
  under_500k: "< $500K",
  "500k_2m": "$500K–$2M",
  "2m_10m": "$2M–$10M",
  over_10m: "> $10M",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="mt-0.5 text-sm text-white">{value ?? <span className="text-orca-500">—</span>}</div>
    </div>
  );
}

export default function EnrichmentPanel({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [signals, setSignals] = useState<OrgSignals>(lead.signals);
  const [socials, setSocials] = useState<Socials>(lead.socials ?? {});
  const [confidence, setConfidence] = useState(lead.dataConfidence);
  const [report, setReport] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function enrich() {
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" });
      const data = await res.json();
      setReport(data.report);
      setSignals(data.lead.signals);
      setSocials(data.lead.socials ?? {});
      setConfidence(data.lead.dataConfidence);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const socialEntries = Object.entries(socials).filter(([, v]) => v);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="section-title">Firmographics &amp; Enrichment</div>
        <button className="btn" disabled={busy} onClick={enrich}>
          {busy ? "Enriching…" : "✨ Enrich data"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3">
        <Field label="Org Size" value={signals.orgSize ? `~${signals.orgSize} staff` : null} />
        <Field
          label="Facility Size"
          value={signals.facilitySqFt ? `~${signals.facilitySqFt.toLocaleString()} sq ft` : null}
        />
        <Field label="Locations" value={signals.locationCount ?? null} />
        <Field
          label="Child-Focused"
          value={signals.childFocused == null ? null : signals.childFocused ? "Yes" : "No"}
        />
        <Field
          label="Budget Band"
          value={signals.annualBudgetBand ? BUDGET_LABEL[signals.annualBudgetBand] : null}
        />
        <Field
          label="Weekly Family Traffic"
          value={signals.weeklyFamilyTraffic ? `~${signals.weeklyFamilyTraffic.toLocaleString()}` : null}
        />
      </div>

      {signals.growthIndicators?.length ? (
        <div className="mt-3">
          <div className="stat-label">Growth Signals</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {signals.growthIndicators.map((gi) => (
              <span key={gi} className="pill bg-kelp-600/20 text-kelp-300">
                {gi}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {socialEntries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {socialEntries.map(([k, v]) => (
            <a key={k} href={v as string} target="_blank" rel="noreferrer" className="text-orca-400 hover:text-kelp-300 hover:underline">
              {k}
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-orca-400">
        Data confidence: {confidence}
        {lead.enrichedAt && ` · last enriched ${new Date(lead.enrichedAt).toLocaleDateString("en-CA")}`}
      </div>

      {report && (
        <div className="mt-3 rounded-lg border border-kelp-600/40 bg-kelp-600/10 p-3 text-sm">
          <div className="text-kelp-200">{report.note}</div>
          <div className="mt-1 text-orca-200">
            Sources: {report.sources.join(", ") || "estimates"} · +{report.contactsAdded.length} contact(s) ·{" "}
            {report.emailsFilled} email(s) · Opportunity{" "}
            <span className="font-semibold text-white">
              {report.opportunityBefore} → {report.opportunityAfter}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
