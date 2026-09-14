import type { PlanTier } from "@/lib/entitlements";

export type BillingInterval = "monthly" | "annual";
export type PaidPlan = Extract<PlanTier, "pro" | "business">;

export const PRICE_IDS: Record<PaidPlan, Record<BillingInterval, string>> = {
  pro: { monthly: "pro_monthly", annual: "pro_annual" },
  business: { monthly: "business_monthly", annual: "business_annual" },
};

export const PRICE_ENTITLEMENTS: Record<string, { plan: PaidPlan; interval: BillingInterval }> = {
  pro_monthly: { plan: "pro", interval: "monthly" },
  pro_annual: { plan: "pro", interval: "annual" },
  business_monthly: { plan: "business", interval: "monthly" },
  business_annual: { plan: "business", interval: "annual" },
};

export function entitlementForPrice(priceId: string) {
  return PRICE_ENTITLEMENTS[priceId] ?? null;
}

export function subscriptionHasAccess(subscription: {
  status: string;
  current_period_end: string | null;
}) {
  const periodIsCurrent =
    subscription.current_period_end === null ||
    new Date(subscription.current_period_end).getTime() > Date.now();
  return (
    periodIsCurrent && ["active", "trialing", "past_due", "canceled"].includes(subscription.status)
  );
}
