"use client";

import { useState } from "react";
import type { EmailType, GeneratedEmail } from "@/lib/types";

const TYPES: { value: EmailType; label: string }[] = [
  { value: "first_touch", label: "First touch" },
  { value: "follow_up", label: "Follow-up" },
  { value: "value", label: "Value" },
  { value: "case_study", label: "Case study" },
  { value: "final_check_in", label: "Final check-in" },
];

export default function EmailStudio({
  leads,
}: {
  leads: { id: string; name: string }[];
}) {
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [emailType, setEmailType] = useState<EmailType>("first_touch");
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, emailType }),
      });
      const data = await res.json();
      setEmail(data.email);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="section-title">AI Email Generation</div>
      <p className="mt-1 text-sm text-orca-300">
        Personalized by organization, city, industry, contact role, and the most similar Orca
        Coast project. Uses OpenAI when configured; otherwise the built-in template engine.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-orca-300">
          Lead
          <select
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="mt-1 block w-56 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
          >
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-orca-300">
          Email type
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as EmailType)}
            className="mt-1 block w-44 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={generate} disabled={loading || !leadId}>
          {loading ? "Generating…" : "Generate email"}
        </button>
      </div>

      {email && (
        <div className="mt-4 rounded-lg border border-orca-800 bg-orca-950/40 p-4">
          <div className="text-sm font-semibold text-white">{email.subject}</div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-orca-100">
            {email.body}
          </pre>
          <div className="mt-3 border-t border-orca-800 pt-2 text-xs text-orca-300">
            <span className="font-medium text-orca-200">CTA:</span> {email.cta}
            {email.objectionHandling && (
              <div className="mt-1">
                <span className="font-medium text-orca-200">Objection handling:</span>{" "}
                {email.objectionHandling}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
