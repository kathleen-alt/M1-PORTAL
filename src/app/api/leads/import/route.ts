import { NextResponse } from "next/server";
import { parseImport, rowsToLeads } from "@/lib/sources/importer";
import { addLeads } from "@/lib/store";
import type { Country } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/import
 * Body: { text, region?, country?, commit? }
 * Without commit, returns a classified preview. With commit:true, adds the
 * leads (deduped) to the CRM.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    text?: string;
    region?: string;
    country?: Country;
    commit?: boolean;
  };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const rows = parseImport(body.text, { region: body.region, country: body.country });

  if (!body.commit) {
    return NextResponse.json({ preview: rows, parsed: rows.length });
  }

  const leads = rowsToLeads(rows);
  const result = addLeads(leads);
  return NextResponse.json({
    parsed: rows.length,
    added: result.added,
    skipped: result.skipped,
    needsRegion: rows.filter((r) => !r.region).length,
  });
}
