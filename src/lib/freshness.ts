/**
 * Data freshness classification. Every displayed number carries the age of the
 * evidence behind it, so a stale catalog can never masquerade as a live feed.
 */
export type FreshnessLevel = "fresh" | "aging" | "stale" | "unknown";

export const FRESH_MAX_HOURS = 24;
export const AGING_MAX_DAYS = 7;

export function ageInHours(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

export function ageInDays(iso: string | null | undefined): number | null {
  const h = ageInHours(iso);
  return h === null ? null : h / 24;
}

export function freshnessOf(iso: string | null | undefined): FreshnessLevel {
  const h = ageInHours(iso);
  if (h === null) return "unknown";
  if (h < FRESH_MAX_HOURS) return "fresh";
  if (h <= AGING_MAX_DAYS * 24) return "aging";
  return "stale";
}

export const FRESHNESS_TONE: Record<FreshnessLevel, "verified" | "caution" | "destructive"> = {
  fresh: "verified",
  aging: "caution",
  stale: "destructive",
  unknown: "caution",
};

export function freshnessLabel(iso: string | null | undefined): string {
  const level = freshnessOf(iso);
  if (level === "unknown") return "No timestamp";
  const days = Math.floor(ageInDays(iso)!);
  const hours = Math.floor(ageInHours(iso)!);
  if (level === "fresh") return `Fresh · ${hours}h old`;
  return `${level === "aging" ? "Aging" : "Stale"} · ${days}d old`;
}

/** Human sentence used wherever a stale dataset changes what we are willing to claim. */
export function stalenessCaveat(iso: string | null | undefined): string | null {
  const days = ageInDays(iso);
  if (days === null) return "Retrieval timestamp missing — treat this row as unverified.";
  if (days <= AGING_MAX_DAYS) return null;
  return `Pricing evidence is ${Math.floor(days)} days old — verify on the source before acting.`;
}

/** Interval text for a source that states a refresh cadence. */
export function intervalLabel(minutes: number | null | undefined): string {
  if (!minutes) return "on demand";
  if (minutes % 1440 === 0) return `every ${minutes / 1440}d`;
  if (minutes % 60 === 0) return `every ${minutes / 60}h`;
  return `every ${minutes}m`;
}
