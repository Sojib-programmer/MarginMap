import { useQuery } from "@tanstack/react-query";

import { bestLandedCost, catalogQuery, type VariantIntel } from "@/lib/catalog";
import { alertsQuery, watchlistItemsQuery, type AlertRow } from "@/lib/workspace";

export type AlertHit = {
  alert: AlertRow;
  variant: VariantIntel | null;
  threshold: number;
  bestLanded: number | null;
  hit: boolean;
};

function thresholdOf(alert: AlertRow) {
  const raw = (alert.rule_config as { threshold?: unknown } | null)?.threshold;
  return Number(raw ?? 0);
}

/**
 * In-app price alert evaluation: compares each enabled alert's target against
 * the current best landed cost for its variant. Pure client computation over
 * data already loaded — no server job, no email.
 */
export function useAlertHits() {
  const catalog = useQuery(catalogQuery);
  const alerts = useQuery(alertsQuery);

  const variants = catalog.data?.variants ?? [];
  const rows: AlertHit[] = (alerts.data ?? []).map((alert) => {
    const variant = variants.find((v) => v.variantId === alert.variant_id) ?? null;
    const threshold = thresholdOf(alert);
    const bestLanded = bestLandedCost(variant);
    return {
      alert,
      variant,
      threshold,
      bestLanded,
      hit:
        alert.enabled &&
        threshold > 0 &&
        bestLanded != null &&
        alert.rule_type === "landed_cost_below" &&
        bestLanded <= threshold,
    };
  });

  return {
    rows,
    hits: rows.filter((r) => r.hit),
    isLoading: catalog.isLoading || alerts.isLoading,
  };
}

/** Target-price hits for watchlist items, evaluated against best landed cost. */
export function useWatchlistHits() {
  const catalog = useQuery(catalogQuery);
  const items = useQuery(watchlistItemsQuery);
  const variants = catalog.data?.variants ?? [];

  const map = new Map<string, { best: number | null; hit: boolean }>();
  for (const item of items.data ?? []) {
    const variant = variants.find((v) => v.variantId === item.variant_id) ?? null;
    const best = bestLandedCost(variant);
    map.set(item.id, {
      best,
      hit: item.target_price != null && best != null && best <= Number(item.target_price),
    });
  }
  return map;
}
