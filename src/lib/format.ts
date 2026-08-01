export const money = (n: number | null | undefined, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const money2 = (n: number | null | undefined, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n ?? 0));

export const pct = (n: number | null | undefined, digits = 0) =>
  `${Number(n ?? 0).toFixed(digits)}%`;

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "unknown";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.round(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function freshnessTone(iso: string | null | undefined) {
  if (!iso) return "stale" as const;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days <= 2) return "fresh" as const;
  if (days <= 7) return "aging" as const;
  return "stale" as const;
}
