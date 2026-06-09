import { getLead, getLeads } from "@/lib/store";
import { contactsToCsv } from "@/lib/export/csv";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/export
 * Query: leadId? (single lead), onlyWithEmail=1?
 * Returns a CSV download of contacts.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get("leadId");
  const onlyWithEmail = url.searchParams.get("onlyWithEmail") === "1";
  const onlyStarred = url.searchParams.get("starred") === "1";

  const leads = leadId ? [getLead(leadId)].filter(Boolean) : getLeads();
  if (leadId && leads.length === 0) {
    return new Response("lead not found", { status: 404 });
  }

  const csv = contactsToCsv(leads as any, { onlyWithEmail, onlyStarred });
  const date = new Date().toISOString().slice(0, 10);
  const tag = onlyStarred ? "-starred" : "";
  const name = leadId ? `orca-contacts-${leadId}-${date}.csv` : `orca-contacts${tag}-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
