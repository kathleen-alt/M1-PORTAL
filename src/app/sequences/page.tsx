import Link from "next/link";
import { getEnrollments } from "@/lib/store";
import { PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function SequencesPage() {
  const enrollments = getEnrollments();
  const active = enrollments.filter((e) => e.status === "active");

  const rows = enrollments
    .map((e) => {
      const next = e.steps[e.currentIndex];
      const sent = e.steps.filter((s) => s.status === "sent").length;
      return { e, next, sent };
    })
    .sort((a, b) => {
      if (!a.next) return 1;
      if (!b.next) return -1;
      return new Date(a.next.dueAt).getTime() - new Date(b.next.dueAt).getTime();
    });

  const now = Date.now();
  const dueNow = rows.filter((r) => r.e.status === "active" && r.next && new Date(r.next.dueAt).getTime() <= now).length;

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  return (
    <div>
      <PageHeader
        title="Email Sequences"
        subtitle="Every account currently in a cadence, what step is next, and when it's due. Open an account to send/skip steps and view the generated email."
      />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat label="Active Sequences" value={active.length} />
        <Stat label="Due Now" value={dueNow} />
        <Stat label="Total Enrollments" value={enrollments.length} />
        <Stat
          label="Completed"
          value={enrollments.filter((e) => e.status === "completed").length}
        />
      </div>

      {enrollments.length === 0 ? (
        <div className="card text-sm text-orca-300">
          No active sequences yet. Open a lead from{" "}
          <Link href="/leads" className="text-orca-400 hover:underline">
            Lead Discovery
          </Link>{" "}
          and use “Enroll in sequence”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-orca-800">
          <table className="w-full text-sm">
            <thead className="bg-orca-900/80 text-left text-xs uppercase text-orca-300">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Sequence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Next Step</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, next, sent }) => {
                const overdue = e.status === "active" && next && new Date(next.dueAt).getTime() <= now;
                return (
                  <tr key={e.id} className="border-t border-orca-800 hover:bg-orca-900/40">
                    <td className="px-4 py-3 font-medium text-white">{e.leadName}</td>
                    <td className="px-4 py-3 text-orca-200">{e.campaignName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`pill ${
                          e.status === "active"
                            ? "bg-kelp-600/30 text-kelp-300"
                            : e.status === "paused"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-orca-700/50 text-orca-200"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-orca-200">
                      {sent}/{e.steps.length} sent
                    </td>
                    <td className="px-4 py-3 text-orca-200">{next ? `Day ${next.day} · ${next.label}` : "—"}</td>
                    <td className={`px-4 py-3 ${overdue ? "font-semibold text-amber-300" : "text-orca-200"}`}>
                      {next ? fmt(next.dueAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${e.leadId}`} className="text-orca-400 hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
