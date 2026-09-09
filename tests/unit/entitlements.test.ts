import { describe, expect, it } from "vitest";

import {
  allowedMarketplaces,
  atLeast,
  formatLimit,
  isUnlimited,
  limitsFor,
  parsePlanError,
  PRICING_BY_TIER,
  priceLabel,
} from "@/lib/entitlements";

describe("plan limits", () => {
  it("defaults an unknown plan to Free", () => {
    expect(limitsFor(null).searchesPerDay).toBe(5);
    expect(limitsFor(undefined).resellerMode).toBe(false);
  });

  it("gates reseller mode behind Pro", () => {
    expect(limitsFor("free").resellerMode).toBe(false);
    expect(limitsFor("pro").resellerMode).toBe(true);
    expect(limitsFor("business").resellerMode).toBe(true);
  });

  it("ranks tiers in order", () => {
    expect(atLeast("free", "pro")).toBe(false);
    expect(atLeast("pro", "pro")).toBe(true);
    expect(atLeast("enterprise", "business")).toBe(true);
  });

  it("marks negative limits as unlimited", () => {
    expect(isUnlimited(limitsFor("pro").searchesPerDay)).toBe(true);
    expect(formatLimit(-1)).toBe("Unlimited");
    expect(formatLimit(5)).toBe("5");
  });

  it("caps the marketplaces a Free workspace sees", () => {
    const all = ["ebay", "amazon", "shopify"];
    expect(allowedMarketplaces("free", all)).toHaveLength(2);
    expect(allowedMarketplaces("free", all)).not.toContain("shopify");
    expect(allowedMarketplaces("pro", all)).toHaveLength(3);
  });
});

describe("plan error translation", () => {
  it("explains an exhausted search quota as an upgrade prompt", () => {
    const msg = parsePlanError("QUOTA_EXCEEDED:searches:5:5");
    expect(msg).toMatch(/Upgrade to Pro/);
  });

  it("explains a hard plan cap", () => {
    expect(parsePlanError("PLAN_LIMIT:watchlists:3:3")).toMatch(/watchlists/);
    expect(parsePlanError("PLAN_LIMIT:alerts:0:0")).toMatch(/Free plan/);
  });

  it("leaves unrelated errors alone", () => {
    expect(parsePlanError("connection reset")).toBeNull();
  });
});

describe("pricing table", () => {
  it("advertises only the four current tiers", () => {
    expect(Object.keys(PRICING_BY_TIER).sort()).toEqual([
      "business",
      "enterprise",
      "free",
      "pro",
    ]);
  });

  it("prices Pro at 9.99 monthly and 99 annually", () => {
    expect(priceLabel(PRICING_BY_TIER.pro, "monthly")).toBe("$9.99");
    expect(priceLabel(PRICING_BY_TIER.pro, "annual")).toBe("$99");
    expect(priceLabel(PRICING_BY_TIER.enterprise, "monthly")).toBe("Custom");
  });
});
