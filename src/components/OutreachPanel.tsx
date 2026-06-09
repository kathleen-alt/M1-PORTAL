"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Enrollment } from "@/lib/types";

export default function OutreachPanel({
  leadId,
  campaigns,
  initialContacts,
  initialEnrollment,
}: {
  leadId: string;
  campaigns: { id: string; name: string }[];
  initialContacts: Contact[];
  initialEnrollment?: Enrollment;
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [enrollment, setEnrollment] = useState<Enrollment | undefined>(initialEnrollment);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function findEmails() {
    setBusy("find");
    setMsg("");
    try {
      const res = await fetch(`/api/leads/${leadId}/find-emails`, { method: "POST" });
      const data = await res.json();
      setContacts(data.contacts ?? contacts);
      setMsg(data.note ?? "");
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function enroll() {
    setBusy("enroll");
    try {
      const res = await fetch(`/api/leads/${leadId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (data.enrollment) setEnrollment(data.enrollment);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function advance(action: "sent" | "skipped" | "pause" | "resume") {
    setBusy("adv");
    try {
      const res = await fetch(`/api/enrollments/${enrollment!.id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.enrollment) setEnrollment(data.enrollment);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  const withEmail = contacts.filter((c) => c.email).length;

  return (
    <div className="card">
      <div className="section-title">Email Outreach</div>

      {/* Emails */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-orca-300">
          {withEmail} of {contacts.length || 0} contact(s) have an email.
        </div>
        <button className="btn-ghost" disabled={busy === "find"} onClick={findEmails}>
          {busy === "find" ? "Finding…" : "✉️ Find emails"}
        </button>
      </div>
      {contacts.some((c) => c.email) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {contacts
            .filter((c) => c.email)
            .map((c) => (
              <span key={c.id} className="pill border border-orca-700 bg-orca-800 text-orca-100">
                {c.name}: {c.email}
              </span>
            ))}
        </div>
      )}
      {msg && <div className="mt-2 text-xs text-kelp-300">{msg}</div>}

      {/* Sequence enrollment */}
      <div className="mt-5 border-t border-orca-800 pt-4">
        {!enrollment ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-orca-300">
              Move into an email sequence
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="mt-1 block w-64 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" disabled={busy === "enroll"} onClick={enroll}>
              {busy === "enroll" ? "Enrolling…" : "▶ Enroll in sequence"}
            </button>
          </div>
        ) : (
          <SequenceView enrollment={enrollment} onAdvance={advance} busy={busy === "adv"} />
        )}
      </div>
    </div>
  );
}

function SequenceView({
  enrollment,
  onAdvance,
  busy,
}: {
  enrollment: Enrollment;
  onAdvance: (a: "sent" | "skipped" | "pause" | "resume") => void;
  busy: boolean;
}) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const statusPill =
    enrollment.status === "active"
      ? "bg-kelp-600/30 text-kelp-300"
      : enrollment.status === "paused"
        ? "bg-amber-500/20 text-amber-300"
        : "bg-orca-700/50 text-orca-200";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-white">{enrollment.campaignName}</span>{" "}
          <span className={`pill ${statusPill}`}>{enrollment.status}</span>
        </div>
        {enrollment.status !== "completed" && (
          <div className="flex gap-2">
            {enrollment.status === "active" ? (
              <button className="btn-ghost" disabled={busy} onClick={() => onAdvance("pause")}>
                Pause
              </button>
            ) : (
              <button className="btn-ghost" disabled={busy} onClick={() => onAdvance("resume")}>
                Resume
              </button>
            )}
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {enrollment.steps.map((s, i) => {
          const isCurrent = i === enrollment.currentIndex && enrollment.status === "active";
          const icon = { email: "✉️", phone: "📞", linkedin: "in", sms: "💬" }[s.channel];
          return (
            <li
              key={i}
              className={`rounded-lg border p-3 ${
                isCurrent ? "border-kelp-500 bg-kelp-600/10" : "border-orca-800 bg-orca-950/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="mr-2 text-orca-300">Day {s.day}</span>
                  <span>{icon} {s.label}</span>
                  <span
                    className={`ml-2 text-xs ${
                      s.status === "sent"
                        ? "text-kelp-300"
                        : s.status === "skipped"
                          ? "text-orca-400"
                          : "text-orca-300"
                    }`}
                  >
                    · {s.status === "pending" ? `due ${fmt(s.dueAt)}` : s.status}
                  </span>
                </div>
                {isCurrent && (
                  <div className="flex gap-2">
                    <button className="btn" disabled={busy} onClick={() => onAdvance("sent")}>
                      Mark sent
                    </button>
                    <button className="btn-ghost" disabled={busy} onClick={() => onAdvance("skipped")}>
                      Skip
                    </button>
                  </div>
                )}
              </div>
              {s.subject && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-orca-300">
                    {s.toEmail ? `To ${s.toEmail} — ` : ""}Subject: {s.subject}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-orca-100">{s.body}</pre>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
