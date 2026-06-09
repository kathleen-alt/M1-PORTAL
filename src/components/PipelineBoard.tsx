"use client";

import { useState } from "react";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

export interface PipelineCard {
  id: string;
  name: string;
  industry: string;
  city: string;
  region: string;
  estValueHigh: number;
  opportunity: number;
  stage: PipelineStage;
}

function money(n: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PipelineBoard({ initial }: { initial: PipelineCard[] }) {
  const [cards, setCards] = useState<PipelineCard[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  async function moveTo(id: string, stage: PipelineStage) {
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)));
    try {
      const res = await fetch(`/api/leads/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setCards(prev); // revert on failure
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageCards = cards.filter((c) => c.stage === stage);
        const total = stageCards.reduce((s, c) => s + c.estValueHigh, 0);
        return (
          <div
            key={stage}
            className={`flex w-64 flex-shrink-0 flex-col rounded-xl border bg-orca-900/40 ${
              overStage === stage ? "border-orca-400" : "border-orca-800"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={() => {
              if (dragId) moveTo(dragId, stage);
              setDragId(null);
              setOverStage(null);
            }}
          >
            <div className="border-b border-orca-800 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{stage}</span>
                <span className="pill bg-orca-800 text-orca-200">{stageCards.length}</span>
              </div>
              <div className="text-xs text-orca-400">{money(total)} potential</div>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {stageCards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  className="cursor-grab rounded-lg border border-orca-700 bg-orca-800/70 p-3 active:cursor-grabbing"
                >
                  <div className="text-sm font-medium text-white">{c.name}</div>
                  <div className="text-xs text-orca-300">
                    {c.city}, {c.region}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-orca-200">{money(c.estValueHigh)}</span>
                    <span
                      className={`font-semibold ${
                        c.opportunity >= 80
                          ? "text-emerald-400"
                          : c.opportunity >= 60
                            ? "text-orca-300"
                            : "text-amber-400"
                      }`}
                    >
                      {c.opportunity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
