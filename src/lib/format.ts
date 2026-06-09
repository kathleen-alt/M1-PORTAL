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

/**
 * Coarse value bracket for a single figure. Every Orca Coast playground is
 * custom-scoped, so we never present a precise dollar amount as fact — only an
 * indicative band derived from category + facility size.
 */
export function valueBand(n: number): string {
  if (n < 75_000) return "Under $75K";
  if (n < 150_000) return "$75K–$150K";
  if (n < 300_000) return "$150K–$300K";
  if (n < 500_000) return "$300K–$500K";
  return "$500K+";
}

/** Standard caveat shown wherever value figures appear. */
export const VALUE_CAVEAT =
  "Indicative range only — every Orca Coast playground is custom-scoped.";

/** Ensure a website string is a clickable absolute URL. */
export function normalizeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
}

/**
 * A Google Maps link for vetting a lead/project's real-world location. Uses
 * exact coordinates when available (e.g. OSM-sourced leads), otherwise a
 * name + city + region search.
 */
export function mapsUrl(opts: {
  name?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
}): string {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  const q = [opts.name, opts.city, opts.region, opts.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** A short human label for an address. */
export function locationLabel(addr: {
  line1?: string;
  city?: string;
  region: string;
  country?: string;
}): string {
  return [addr.line1, addr.city, addr.region, addr.country].filter(Boolean).join(", ");
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
