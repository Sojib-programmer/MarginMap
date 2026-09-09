import { describe, expect, it } from "vitest";

import {
  buyerVerdict,
  evaluateDeal,
  landedCost,
  marketStats,
  offerEconomics,
  recommend,
  robustStats,
  scoreBand,
  DEFAULT_DEAL_INPUT,
  type CompLike,
  type OfferLike,
} from "@/lib/scoring";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const offer = (over: Partial<OfferLike> = {}): OfferLike => ({
  item_price: 400,
  shipping_price: 20,
  estimated_tax: 30,
  condition_grade: "used_good",
  match_confidence: 0.9,
  seller_rating: 0.98,
  availability: "in_stock",
  retrieved_at: daysAgo(0),
  ...over,
});

const comp = (price: number, ageDays = 10): CompLike => ({
  sold_price: price,
  shipping_paid: 0,
  sold_at: daysAgo(ageDays),
  condition_grade: "used_good",
  match_confidence: 0.9,
});

const liquidity = { activeListings: 20, completedSales: 15, daysToSell: 21 };

describe("landedCost", () => {
  it("is item + shipping + tax", () => {
    expect(landedCost({ item_price: 100, shipping_price: 10, estimated_tax: 8 })).toBe(118);
  });

  it("treats a missing tax as zero only numerically, never as 'tax free'", () => {
    const e = offerEconomics(offer({ estimated_tax: 0 }), marketStats([comp(600)]), liquidity);
    expect(e.landedCost).toBe(420);
    expect(e.taxProvided).toBe(false);
  });
});

describe("robustStats", () => {
  it("returns zeroes for an empty sample rather than NaN", () => {
    expect(robustStats([])).toMatchObject({ median: 0, low: 0, high: 0 });
  });

  it("excludes IQR outliers and reports them", () => {
    const r = robustStats([100, 102, 104, 106, 108, 5000]);
    expect(r.excluded).toContain(5000);
    expect(r.median).toBeLessThan(200);
  });

  it("averages the two middle values on an even sample", () => {
    expect(robustStats([10, 20, 30, 40]).median).toBe(25);
  });
});

describe("marketStats", () => {
  it("reports zero confidence with no comps", () => {
    const s = marketStats([]);
    expect(s.sampleSize).toBe(0);
    expect(s.confidence).toBe(0);
  });

  it("raises confidence with a larger, fresher, tighter sample", () => {
    const thin = marketStats([comp(500, 200), comp(900, 200)]);
    const rich = marketStats(Array.from({ length: 14 }, (_, i) => comp(600 + i, 3)));
    expect(rich.confidence).toBeGreaterThan(thin.confidence);
    expect(rich.confidence).toBeLessThanOrEqual(1);
  });

  it("weights recent sales more heavily than old ones", () => {
    const stats = marketStats([comp(1000, 400), comp(1000, 400), comp(500, 1), comp(500, 1)]);
    expect(stats.medianSold).toBe(500);
  });
});

describe("evaluateDeal", () => {
  it("subtracts fees, shipping and a returns reserve from the gross sale", () => {
    const stats = marketStats([comp(1000, 5), comp(1000, 5), comp(1000, 5)]);
    const out = evaluateDeal({ ...DEFAULT_DEAL_INPUT, purchasePrice: 400 }, stats, liquidity);
    expect(out.netProceeds).toBeLessThan(out.expectedGrossSale);
    expect(out.expectedProfit).toBeCloseTo(out.netProceeds - out.allInCost, 6);
  });

  it("does not divide by zero when nothing was spent", () => {
    const out = evaluateDeal(DEFAULT_DEAL_INPUT, marketStats([comp(500)]), liquidity);
    expect(Number.isFinite(out.roiPct)).toBe(true);
    expect(out.roiPct).toBe(0);
  });

  it("break-even purchase price leaves exactly the desired profit", () => {
    const stats = marketStats([comp(800, 5), comp(820, 5), comp(810, 5)]);
    const out = evaluateDeal(
      { ...DEFAULT_DEAL_INPUT, desiredProfit: 100, purchasePrice: 0 },
      stats,
      liquidity,
    );
    expect(out.breakEvenPurchasePrice).toBeCloseTo(out.netProceeds - 100, 6);
  });
});

describe("recommend", () => {
  const richStats = (price: number) =>
    marketStats(Array.from({ length: 14 }, (_, i) => comp(price + i, 3)));

  it("never says Buy without any completed sales", () => {
    const e = offerEconomics(offer(), marketStats([]), liquidity);
    expect(recommend("buyer", e).action).toBe("Watch");
    expect(recommend("reseller", e).action).toBe("Watch");
  });

  it("says Buy for a buyer well under the comp median", () => {
    const e = offerEconomics(offer({ item_price: 300 }), richStats(900), liquidity);
    expect(recommend("buyer", e).action).toBe("Buy");
  });

  it("says Pass for a buyer paying above the comp median", () => {
    const e = offerEconomics(offer({ item_price: 1400 }), richStats(600), liquidity);
    expect(recommend("buyer", e).action).toBe("Pass");
  });

  it("says Pass for a reseller whose expected net is negative", () => {
    const e = offerEconomics(offer({ item_price: 900 }), richStats(600), liquidity);
    expect(recommend("reseller", e).action).toBe("Pass");
  });

  it("downgrades a Buy to Watch when the evidence is stale", () => {
    const e = offerEconomics(offer({ item_price: 300 }), richStats(900), liquidity);
    const fresh = recommend("buyer", e, { evidenceAgeDays: 1 });
    const stale = recommend("buyer", e, { evidenceAgeDays: 30 });
    expect(fresh.action).toBe("Buy");
    expect(stale.action).toBe("Watch");
    expect(stale.reason).toMatch(/stale/i);
  });
});

describe("verdict bands", () => {
  it("withholds a confident buyer verdict on thin evidence", () => {
    expect(buyerVerdict(95, 0.1)).toBe("Watch / wait");
  });

  it("maps scores onto bands monotonically", () => {
    expect(scoreBand(85).label).toBe("Strong");
    expect(scoreBand(65).label).toBe("Good");
    expect(scoreBand(45).label).toBe("Mixed");
    expect(scoreBand(10).label).toBe("Avoid");
  });
});
