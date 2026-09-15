import { describe, expect, it } from "vitest";

import {
  entitlementForPrice,
  PRICE_ENTITLEMENTS,
  PRICE_IDS,
  subscriptionHasAccess,
} from "@/lib/billing";

describe("payment catalog mapping", () => {
  it("maps every paid tier and interval to a stable lookup key", () => {
    expect(PRICE_IDS).toEqual({
      pro: { monthly: "pro_monthly", annual: "pro_annual" },
      business: { monthly: "business_monthly", annual: "business_annual" },
    });
    expect(Object.keys(PRICE_ENTITLEMENTS)).toHaveLength(4);
  });

  it("derives entitlements only from known server-side prices", () => {
    expect(entitlementForPrice("pro_annual")).toEqual({ plan: "pro", interval: "annual" });
    expect(entitlementForPrice("business_monthly")).toEqual({
      plan: "business",
      interval: "monthly",
    });
    expect(entitlementForPrice("enterprise_free_override")).toBeNull();
  });
});

describe("subscription access", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it.each(["active", "trialing", "past_due", "canceled"])(
    "keeps %s access through the paid period",
    (status) => {
      expect(subscriptionHasAccess({ status, current_period_end: future })).toBe(true);
    },
  );

  it("revokes expired and terminal subscriptions", () => {
    expect(subscriptionHasAccess({ status: "canceled", current_period_end: past })).toBe(false);
    expect(subscriptionHasAccess({ status: "unpaid", current_period_end: future })).toBe(false);
    expect(subscriptionHasAccess({ status: "incomplete", current_period_end: null })).toBe(false);
  });
});
