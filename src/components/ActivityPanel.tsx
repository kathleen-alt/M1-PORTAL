"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, type ActivityLog, type ActivityType, type PipelineStage } from "@/lib/types";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "📝 Note" },
  { value: "email", label: "✉️ Email" },
  { value: "call", label: "📞 Call" },
  { value: "linkedin", label: "in LinkedIn" },
  { value: "meeting", label: "🤝 Meeting" },
];

const ICON: Record<ActivityType, string> = {
  note: "📝", email: "✉️", call: "📞", linkedin: "in", sms: "💬", meeting: "🤝", stage_change: "🔁",
};

export default function ActivityPanel({
  leadId,
  initialStage,
  initialActivities,
}: {
  leadId: string;
  initialStage: PipelineStage;
  initialActivities: ActivityLog[];
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityLog[]>(initialActivities);
  const [stage, setStage] = useState<PipelineStage>(initialStage);
  const [type, setType] = useState<ActivityType>("note");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function logActivity() {
    if (!summary.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, summary }),
      });
      const data = await res.json();
      if (data.activity) {
        setActivities((a) => [data.activity, ...a]);
        setSummary("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(next: PipelineStage) {
    setStage(next);
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    if (res.ok) {
      // reflect the auto-logged stage_change activity
      const list = await fetch(`/api/leads/${leadId}/activities`).then((r) => r.json());
      setActivities(list.activities ?? activities);
      router.refresh();
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="section-title">Activity & Tracking</div>
        <select
          value={stage}
          onChange={(e) => changeStage(e.target.value as PipelineStage)}
          className="rounded-lg border border-orca-700 bg-orca-950 px-3 py-1.5 text-sm text-white"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className="rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && logActivity()}
          placeholder="Log a call, email, or note…"
          className="flex-1 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
        />
        <button className="btn" disabled={busy || !summary.trim()} onClick={logActivity}>
          Log
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {activities.length === 0 && (
          <li className="text-sm text-orca-400">No activity yet — log your first touch above.</li>
        )}
        {activities.map((a) => (
          <li key={a.id} className="flex gap-3 border-l-2 border-orca-700 pl-3">
            <span aria-hidden>{ICON[a.type]}</span>
            <div>
              <div className="text-sm text-orca-100">{a.summary}</div>
              <div className="text-xs text-orca-400">
                {a.type.replace("_", " ")} · {new Date(a.createdAt).toLocaleString("en-CA")}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
