export function money(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyRange(low: number, high: number): string {
  return `${money(low)}–${money(high)}`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-orca-300";
  if (score >= 40) return "text-amber-400";
  return "text-rose-400";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-orca-400";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function categoryBadge(category: "Hot" | "Warm" | "Cold"): string {
  switch (category) {
    case "Hot":
      return "bg-rose-500/20 text-rose-300 border border-rose-500/40";
    case "Warm":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    case "Cold":
      return "bg-orca-500/20 text-orca-200 border border-orca-500/40";
  }
}
