"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOURCE_CATEGORIES } from "@/lib/sources/overpass";

type Tab = "import" | "live";

export default function SourcingPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("import");

  return (
    <div className="card mb-6">
      <div className="mb-4 flex gap-2">
        <button
          className={tab === "import" ? "btn" : "btn-ghost"}
          onClick={() => setTab("import")}
        >
          📋 Import a list
        </button>
        <button className={tab === "live" ? "btn" : "btn-ghost"} onClick={() => setTab("live")}>
          🌐 Source live (OpenStreetMap)
        </button>
      </div>
      {tab === "import" ? <ImportTab onDone={() => router.refresh()} /> : <LiveTab onDone={() => router.refresh()} />}
    </div>
  );
}

function ImportTab({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [region, setRegion] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(commit: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, region: region || undefined, commit }),
      });
      const data = await res.json();
      if (commit) {
        setMsg(`Added ${data.added} lead(s), skipped ${data.skipped} duplicate(s).`);
        setPreview(null);
        setText("");
        onDone();
      } else {
        setPreview(data.preview);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-orca-300">
        Paste organizations — one per line. Flexible format:{" "}
        <code className="text-orca-200">Name, City, REGION, website, phone</code>. Works with
        directory exports, spreadsheets, or Google searches. Each line is auto-classified into
        the prospect taxonomy and scored.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"YMCA of Greater Vancouver, Vancouver, BC, ymcavan.org\nWoodlands Family Church, Plano, TX\nLittle Sprouts Daycare, Calgary, AB, 403-555-0199"}
        className="w-full rounded-lg border border-orca-700 bg-orca-950 p-3 font-mono text-xs text-white"
      />
      <div className="mt-3 flex items-center gap-3">
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Default region (e.g. BC)"
          className="w-44 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white"
        />
        <button className="btn-ghost" disabled={busy || !text.trim()} onClick={() => run(false)}>
          Preview
        </button>
        <button className="btn" disabled={busy || !text.trim()} onClick={() => run(true)}>
          {busy ? "Working…" : "Add to CRM"}
        </button>
        {msg && <span className="text-sm text-kelp-300">{msg}</span>}
      </div>

      {preview && (
        <div className="mt-4 overflow-hidden rounded-lg border border-orca-800">
          <table className="w-full text-sm">
            <thead className="bg-orca-900/80 text-left text-xs uppercase text-orca-300">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Classified As</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t border-orca-800">
                  <td className="px-3 py-2 text-white">{r.name}</td>
                  <td className="px-3 py-2 text-orca-200">{r.industry}</td>
                  <td className="px-3 py-2 text-orca-200">{r.tier}</td>
                  <td className="px-3 py-2 text-orca-200">{r.region ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-amber-300">{r.warning ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiveTab({ onDone }: { onDone: () => void }) {
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("CA");
  const [cats, setCats] = useState<string[]>(["recreation", "church"]);
  const [res, setRes] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(k: string) {
    setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  }

  async function run(commit: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/discovery/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, region, country, categories: cats, commit }),
      });
      const data = await r.json();
      setRes(data);
      if (commit) onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-orca-300">
        Pull <strong>real organizations</strong> from OpenStreetMap for a city and target
        categories — no API key needed. (Requires outbound network at runtime.)
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (e.g. Kelowna)" className="w-48 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white" />
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region (e.g. BC)" className="w-32 rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-orca-700 bg-orca-950 px-3 py-2 text-sm text-white">
          <option value="CA">Canada</option>
          <option value="US">United States</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SOURCE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => toggle(c.key)}
            className={`pill border ${cats.includes(c.key) ? "border-kelp-500 bg-kelp-600/30 text-white" : "border-orca-700 bg-orca-800 text-orca-200"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn-ghost" disabled={busy || !city || !region} onClick={() => run(false)}>
          Search
        </button>
        <button className="btn" disabled={busy || !city || !region} onClick={() => run(true)}>
          {busy ? "Sourcing…" : "Source & add to CRM"}
        </button>
      </div>

      {res && (
        <div className="mt-4">
          <p className="text-sm text-orca-300">{res.note}</p>
          {res.added > 0 && <p className="text-sm text-kelp-300">Added {res.added}, skipped {res.skipped} duplicate(s).</p>}
          {res.scored?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {res.scored.map((s: any, i: number) => (
                <span key={i} className="pill border border-orca-700 bg-orca-800 text-orca-100">
                  {s.name} · {s.opportunity}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
