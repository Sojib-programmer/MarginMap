import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Plan entitlements. These constants MIRROR `private.tier_limits()` in the
 * database — the database is the boundary, this table only lets the UI explain
 * a refusal before the round trip. Keep the two in sync.
 */
export type PlanTier = "free" | "pro" | "business" | "enterprise";

export const PLAN_TIERS: PlanTier[] = ["free", "pro", "business", "enterprise"];

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

export type Limits = {
  searchesPerDay: number;
  watchlists: number;
  alerts: number;
  seats: number;
  apiCallsPerMonth: number;
  marketplaces: number;
  historyDays: number;
  resellerMode: boolean;
  csvExport: boolean;
  pdfExport: boolean;
};

const UNLIMITED = -1;

export const LIMITS: Record<PlanTier, Limits> = {
  free: {
    searchesPerDay: 5,
    watchlists: 3,
    alerts: 0,
    seats: 1,
    apiCallsPerMonth: 0,
    marketplaces: 2,
    historyDays: 0,
    resellerMode: false,
    csvExport: false,
    pdfExport: false,
  },
  pro: {
    searchesPerDay: UNLIMITED,
    watchlists: 50,
    alerts: 10,
    seats: 1,
    apiCallsPerMonth: 0,
    marketplaces: 3,
    historyDays: 30,
    resellerMode: true,
    csvExport: true,
    pdfExport: false,
  },
  business: {
    searchesPerDay: UNLIMITED,
    watchlists: UNLIMITED,
    alerts: UNLIMITED,
    seats: 5,
    apiCallsPerMonth: 1000,
    marketplaces: 3,
    historyDays: 90,
    resellerMode: true,
    csvExport: true,
    pdfExport: true,
  },
  enterprise: {
    searchesPerDay: UNLIMITED,
    watchlists: UNLIMITED,
    alerts: UNLIMITED,
    seats: UNLIMITED,
    apiCallsPerMonth: UNLIMITED,
    marketplaces: 3,
    historyDays: UNLIMITED,
    resellerMode: true,
    csvExport: true,
    pdfExport: true,
  },
};

export const isUnlimited = (n: number) => n < 0;
export const formatLimit = (n: number) => (isUnlimited(n) ? "Unlimited" : String(n));

export function limitsFor(tier: PlanTier | null | undefined): Limits {
  return LIMITS[tier ?? "free"];
}

export function atLeast(tier: PlanTier | null | undefined, required: PlanTier) {
  return PLAN_RANK[tier ?? "free"] >= PLAN_RANK[required];
}

/** Marketplaces a Free workspace is allowed to see, in priority order. */
export const FREE_MARKETPLACES = ["ebay", "amazon"];

export function allowedMarketplaces(tier: PlanTier | null | undefined, available: string[]) {
  const cap = limitsFor(tier).marketplaces;
  if (available.length <= cap) return available;
  const preferred = FREE_MARKETPLACES.filter((m) => available.includes(m));
  const rest = available.filter((m) => !preferred.includes(m));
  return [...preferred, ...rest].slice(0, cap);
}

// ---------------------------------------------------------------- pricing

export type TierPricing = {
  id: PlanTier;
  name: string;
  monthly: number | null;
  annual: number | null;
  annualSavingsPct: number | null;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

export const PRICING: TierPricing[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    annualSavingsPct: null,
    tagline: "Forever free. Check whether a single listing is a fair trade.",
    features: [
      "5 searches per day",
      "Up to 3 watchlists",
      "2 of 3 marketplace sources",
      "Buyer mode",
      "Evidence drawer on every number",
      "Community support",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 9.99,
    annual: 99,
    annualSavingsPct: 17,
    tagline: "Margin-accurate sourcing for people buying to sell.",
    features: [
      "Unlimited searches",
      "All 3 marketplace sources",
      "Buyer + Reseller modes",
      "Deal calculator and sourcing pipeline",
      "Up to 50 watchlists, 10 price alerts",
      "CSV export and 30-day price history",
      "Email support (24h)",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    monthly: 49.99,
    annual: 449,
    annualSavingsPct: 25,
    tagline: "Shared sourcing operations with an audit trail.",
    features: [
      "Everything in Pro",
      "Up to 5 team seats with roles",
      "Unlimited watchlists and alerts",
      "Bulk CSV price checker",
      "API access — 1,000 calls/month",
      "90-day history and margin benchmarking",
      "PDF reports and priority support (2h)",
    ],
    cta: "Upgrade to Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: null,
    annual: null,
    annualSavingsPct: null,
    tagline: "Custom scale, custom controls.",
    features: [
      "Everything in Business",
      "Unlimited seats and API calls",
      "Dedicated account manager",
      "Custom integrations and webhooks",
      "SSO / SAML where required",
      "99.9% uptime SLA",
      "Custom onboarding and training",
    ],
    cta: "Talk to sales",
  },
];

export const PRICING_BY_TIER = Object.fromEntries(PRICING.map((t) => [t.id, t])) as Record<
  PlanTier,
  TierPricing
>;

export function priceLabel(tier: TierPricing, interval: "monthly" | "annual") {
  if (tier.monthly === null) return "Custom";
  if (tier.monthly === 0) return "$0";
  return interval === "annual" ? `$${tier.annual}` : `$${tier.monthly}`;
}

export function cadenceLabel(tier: TierPricing, interval: "monthly" | "annual") {
  if (tier.monthly === null) return "contact sales";
  if (tier.monthly === 0) return "forever";
  return interval === "annual" ? "per seat / year" : "per seat / month";
}

// ---------------------------------------------------------------- usage

export type UsageSnapshot = { searchesUsed: number; apiCallsUsed: number };

export function usageQuery(workspaceId: string | null) {
  return queryOptions({
    queryKey: ["usage", workspaceId],
    enabled: !!workspaceId,
    staleTime: 15_000,
    queryFn: async (): Promise<UsageSnapshot> => {
      if (!workspaceId) return { searchesUsed: 0, apiCallsUsed: 0 };
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";
      const { data, error } = await supabase
        .from("usage_counters")
        .select("metric,used,period_start")
        .eq("workspace_id", workspaceId)
        .in("period_start", [today, monthStart]);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      return {
        searchesUsed:
          rows.find((r) => r.metric === "searches" && r.period_start === today)?.used ?? 0,
        apiCallsUsed:
          rows.find((r) => r.metric === "api_calls" && r.period_start === monthStart)?.used ?? 0,
      };
    },
  });
}

/**
 * Charges one unit against a workspace quota. The database raises when the tier
 * allowance is exhausted; we translate that into a readable upgrade prompt.
 */
export async function consumeQuota(
  workspaceId: string,
  metric: "searches" | "api_calls",
  amount = 1,
) {
  const { data, error } = await supabase.rpc("consume_quota", {
    _workspace_id: workspaceId,
    _metric: metric,
    _amount: amount,
  });
  if (error) {
    const parsed = parsePlanError(error.message);
    throw new Error(parsed ?? error.message);
  }
  return data as unknown as { metric: string; used: number; cap: number; period_start: string };
}

/**
 * Turns the structured `QUOTA_EXCEEDED:` / `PLAN_LIMIT:` errors raised by the
 * database into upgrade copy. Returns null when the message is unrelated.
 */
export function parsePlanError(message: string): string | null {
  const quota = /QUOTA_EXCEEDED:(\w+):(\d+):(-?\d+)/.exec(message);
  if (quota) {
    const [, metric, , cap] = quota;
    if (metric === "searches") {
      return `You've used all ${cap} searches on the Free plan today. Upgrade to Pro for unlimited searches.`;
    }
    return `Your monthly API allowance of ${cap} calls is exhausted. Upgrade for a higher limit.`;
  }
  const limit = /PLAN_LIMIT:(\w+):(\d+):(-?\d+)/.exec(message);
  if (limit) {
    const [, what, , cap] = limit;
    const noun =
      what === "watchlists" ? "watchlists" : what === "alerts" ? "price alerts" : "team seats";
    if (cap === "0") return `Price alerts are not available on the Free plan. Upgrade to Pro.`;
    return `Your plan allows ${cap} ${noun}. Upgrade to raise the limit.`;
  }
  return null;
}
