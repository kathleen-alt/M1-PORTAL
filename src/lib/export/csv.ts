// ---------------------------------------------------------------------------
// Contact CSV export. One row per contact (flattened with its organization),
// ready to import into Gmail / Google Contacts, a CRM, or a mail-merge tool.
// ---------------------------------------------------------------------------

import type { Lead } from "../types";
import { computeScores } from "../prospecting/scoring";
import { industryLabel } from "../taxonomy";

export const CONTACT_HEADERS = [
  "Organization", "Contact", "Role", "Email", "Phone", "LinkedIn",
  "Decision Maker", "Industry", "City", "Region", "Country", "Website",
  "Opportunity", "Stage",
];

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvOptions {
  /** Only include contacts that have an email address. */
  onlyWithEmail?: boolean;
  /** Only include starred (priority) leads. */
  onlyStarred?: boolean;
}

export function contactsToCsv(leads: Lead[], opts: CsvOptions = {}): string {
  const rows: string[] = [CONTACT_HEADERS.join(",")];
  for (const lead of leads) {
    if (opts.onlyStarred && !lead.starred) continue;
    const opp = computeScores(lead).opportunity;
    const ind = industryLabel(lead.industry);
    const a = lead.address;
    const cts = opts.onlyWithEmail ? lead.contacts.filter((c) => c.email) : lead.contacts;

    if (cts.length === 0) {
      // Keep the organization in the export even with no contacts yet.
      if (!opts.onlyWithEmail) {
        rows.push(
          [lead.name, "", "", "", lead.phone ?? "", "", "", ind, a.city ?? "", a.region, a.country, lead.website ?? "", opp, lead.stage]
            .map(esc).join(","),
        );
      }
      continue;
    }

    for (const c of cts) {
      rows.push(
        [
          lead.name, c.name, c.role, c.email ?? "", c.phone ?? lead.phone ?? "",
          c.linkedin ?? "", c.isDecisionMaker ? "yes" : "no", ind,
          a.city ?? "", a.region, a.country, lead.website ?? "", opp, lead.stage,
        ].map(esc).join(","),
      );
    }
  }
  return rows.join("\n");
}
