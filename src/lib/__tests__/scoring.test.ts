import { describe, expect, it } from "vitest";

import {
  buyerScore,
  clamp01,
  evaluateDeal,
  FEE_SCHEDULES,
  landedCost,
  marketStats,
  recencyWeightedMedian,
  recommend,
  robustStats,
  scoreBand,
  type CompLike,
  type OfferLike,
  type OfferEconomics,
} from "../scoring";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeComp(overrides: Partial<CompLike> = {}): CompLike {
  return {
    sold_price: 200,
    shipping_paid: 0,
    sold_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    condition_grade: "used_good",
    match_confidence: 0.9,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<OfferLike> = {}): OfferLike {
  return {
    item_price: 180,
    shipping_price: 10,
    estimated_tax: 0,
    condition_grade: "used_good",
    match_confidence: 0.9,
    seller_rating: 0.97,
    availability: "in_stock",
    retrieved_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── clamp01 ────────────────────────────────────────────────────────────────

describe("clamp01", () => {
  it("clamps below 0", () => expect(clamp01(-5)).toBe(0));
  it("clamps above 1", () => expect(clamp01(2)).toBe(1));
  it("returns value in range unchanged", () => expect(clamp01(0.5)).toBe(0.5));
  it("handles lower boundary", () => expect(clamp01(0)).toBe(0));
  it("handles upper boundary", () => expect(clamp01(1)).toBe(1));
});

// ─── landedCost ─────────────────────────────────────────────────────────────

describe("landedCost", () => {
  it("sums item, shipping and tax", () =>
    expect(landedCost({ item_price: 100, shipping_price: 15, estimated_tax: 8 })).toBe(123));

  it("is zero when all fields are zero", () =>
    expect(landedCost({ item_price: 0, shipping_price: 0, estimated_tax: 0 })).toBe(0));

  it("coerces numeric strings", () =>
    expect(
      landedCost({
        item_price: "50" as unknown as number,
        shipping_price: "5" as unknown as number,
        estimated_tax: "2.5" as unknown as number,
      }),
    ).toBe(57.5));
});

// ─── robustStats ─────────────────────────────────────────────────────────────

describe("robustStats", () => {
  it("returns zeros for empty array", () => {
    const r = robustStats([]);
    expect(r.median).toBe(0);
    expect(r.kept).toHaveLength(0);
  });

  it("returns single value correctly", () => {
    const r = robustStats([42]);
    expect(r.median).toBe(42);
    expect(r.low).toBe(42);
    expect(r.high).toBe(42);
    expect(r.excluded).toHaveLength(0);
  });

  it("computes correct median for odd-length array", () => {
    expect(robustStats([1, 3, 5]).median).toBe(3);
  });

  it("computes correct median for even-length array", () => {
    expect(robustStats([2, 4]).median).toBe(3);
  });

  it("excludes obvious outliers via IQR filter", () => {
    const r = robustStats([10, 11, 12, 13, 1000]);
    expect(r.excluded).toContain(1000);
    expect(r.kept).not.toContain(1000);
  });

  it("keeps all values when there are no outliers", () => {
    const r = robustStats([100, 110, 120, 130]);
    expect(r.excluded).toHaveLength(0);
    expect(r.kept).toHaveLength(4);
  });
});

// ─── recencyWeightedMedian ───────────────────────────────────────────────────

describe("recencyWeightedMedian", () => {
  it("returns 0 for empty array", () => expect(recencyWeightedMedian([])).toBe(0));

  it("returns single comp price + shipping", () => {
    expect(recencyWeightedMedian([makeComp({ sold_price: 150, shipping_paid: 10 })])).toBe(160);
  });

  it("weighs recent comps more than old ones", () => {
    const recent = makeComp({
      sold_price: 300,
      sold_at: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    });
    const old = makeComp({
      sold_price: 100,
      sold_at: new Date(Date.now() - 180 * 86_400_000).toISOString(),
    });
    expect(recencyWeightedMedian([recent, old])).toBeGreaterThan(200);
  });
});

// ─── marketStats ─────────────────────────────────────────────────────────────

describe("marketStats", () => {
  it("returns zero-confidence stats for empty comps", () => {
    const s = marketStats([]);
    expect(s.sampleSize).toBe(0);
    expect(s.confidence).toBe(0);
  });

  it("reports sampleSize correctly", () => {
    expect(marketStats([makeComp(), makeComp(), makeComp()]).sampleSize).toBe(3);
  });

  it("confidence increases with more comps", () => {
    const few = marketStats([makeComp()]);
    const many = marketStats(Array.from({ length: 15 }, () => makeComp()));
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  it("confidence is always in [0, 1]", () => {
    const s = marketStats(Array.from({ length: 20 }, () => makeComp()));
    expect(s.confidence).toBeGreaterThanOrEqual(0);
    expect(s.confidence).toBeLessThanOrEqual(1);
  });

  it("medianSold is within plausible range", () => {
    const comps = Array.from({ length: 5 }, (_, i) =>
      makeComp({ sold_price: 100 + i * 10, shipping_paid: 0 }),
    );
    const s = marketStats(comps);
    expect(s.medianSold).toBeGreaterThan(90);
    expect(s.medianSold).toBeLessThan(160);
  });
});

// ─── buyerScore ──────────────────────────────────────────────────────────────

describe("buyerScore", () => {
  it("returns score in [0, 100]", () => {
    const stats = marketStats([makeComp(), makeComp(), makeComp()]);
    const { score } = buyerScore(makeOffer(), stats);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("cheaper offer scores higher than expensive offer vs same market", () => {
    const stats = marketStats(Array.from({ length: 8 }, () => makeComp({ sold_price: 250 })));
    const cheap = buyerScore(makeOffer({ item_price: 100 }), stats);
    const expensive = buyerScore(makeOffer({ item_price: 240 }), stats);
    expect(cheap.score).toBeGreaterThan(expensive.score);
  });

  it("includes all 6 expected factor keys", () => {
    const { factors } = buyerScore(makeOffer(), marketStats([makeComp()]));
    const keys = factors.map((f) => f.key);
    expect(keys).toContain("price_value");
    expect(keys).toContain("fit");
    expect(keys).toContain("condition");
    expect(keys).toContain("trust");
    expect(keys).toContain("fulfillment");
    expect(keys).toContain("data");
  });

  it("confidence is in [0, 1]", () => {
    const { confidence } = buyerScore(makeOffer(), marketStats([makeComp()]));
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── scoreBand ───────────────────────────────────────────────────────────────

describe("scoreBand", () => {
  it("returns Strong for score >= 80", () => expect(scoreBand(80).label).toBe("Strong"));
  it("returns Good for score in [60, 79]", () => expect(scoreBand(65).label).toBe("Good"));
  it("returns Mixed for score in [40, 59]", () => expect(scoreBand(45).label).toBe("Mixed"));
  it("returns Avoid for score < 40", () => expect(scoreBand(20).label).toBe("Avoid"));
});

// ─── evaluateDeal ─────────────────────────────────────────────────────────────

describe("evaluateDeal", () => {
  const liquidity = { activeListings: 10, completedSales: 20, daysToSell: 14 };

  function baseInput() {
    return {
      purchasePrice: 150,
      inboundShipping: 10,
      tax: 5,
      repairPrep: 0,
      otherCosts: 0,
      outboundShipping: 18,
      packaging: 4,
      returnsReservePct: 0.03,
      marketplace: "eBay",
      conditionGrade: "used_good",
      targetHoldDays: 30,
      desiredProfit: 50,
    };
  }

  it("returns a numeric profit", () => {
    const stats = marketStats(Array.from({ length: 8 }, () => makeComp({ sold_price: 250 })));
    const out = evaluateDeal(baseInput(), stats, liquidity);
    expect(typeof out.expectedProfit).toBe("number");
  });

  it("roiPct is positive when market value exceeds all-in cost", () => {
    const stats = marketStats(Array.from({ length: 8 }, () => makeComp({ sold_price: 300 })));
    const out = evaluateDeal({ ...baseInput(), purchasePrice: 100 }, stats, liquidity);
    expect(out.roiPct).toBeGreaterThan(0);
  });

  it("breakEven is less than purchasePrice when deal is unprofitable", () => {
    const stats = marketStats(Array.from({ length: 5 }, () => makeComp({ sold_price: 50 })));
    const out = evaluateDeal(baseInput(), stats, liquidity);
    expect(out.breakEvenPurchasePrice).toBeLessThan(baseInput().purchasePrice);
  });

  it("applies fee schedule correctly", () => {
    const input = { ...baseInput(), marketplace: "Generic marketplace" };
    const fees = FEE_SCHEDULES.find((f) => f.marketplace === "Generic marketplace")!;
    const stats = marketStats(Array.from({ length: 8 }, () => makeComp({ sold_price: 200 })));
    const out = evaluateDeal(input, stats, liquidity);
    const expectedFee =
      out.expectedGrossSale * fees.marketplaceFeePct +
      out.expectedGrossSale * fees.paymentFeePct +
      fees.paymentFeeFlat;
    expect(out.marketplaceFee + out.paymentFee).toBeCloseTo(expectedFee, 2);
  });
});

// ─── recommend ───────────────────────────────────────────────────────────────

describe("recommend", () => {
  function stubEconomics(overrides: Partial<OfferEconomics> = {}): OfferEconomics {
    const base: OfferEconomics = {
      itemPrice: 150,
      shipping: 10,
      tax: 5,
      taxProvided: true,
      landedCost: 165,
      resaleFees: 30,
      landedCostWithFees: 195,
      medianSold: 250,
      lowSold: 200,
      highSold: 300,
      expectedResale: 250,
      netProceeds: 200,
      expectedProfit: 35,
      roiPct: 21,
      daysToSell: 14,
      sampleSize: 8,
      confidence: 0.8,
      flags: [],
      buyer: { score: 72, confidence: 0.8, factors: [], version: "score-2026.08.1" },
      deal: {
        expectedGrossSale: 250,
        expectedLow: 200,
        expectedHigh: 300,
        marketplaceFee: 22,
        paymentFee: 8,
        returnsReserve: 7.5,
        netProceeds: 200,
        allInCost: 165,
        expectedProfit: 35,
        roiPct: 21,
        breakEvenPurchasePrice: 130,
        daysToSell: 14,
        score: { score: 72, confidence: 0.8, factors: [], version: "score-2026.08.1" },
        flags: [],
        verdict: "Worth researching",
      },
    };
    return { ...base, ...overrides };
  }

  it("recommends Buy for strong roi and good confidence (reseller mode)", () => {
    const r = recommend("reseller", stubEconomics({ roiPct: 30, expectedProfit: 50 }));
    expect(r.action).toBe("Buy");
  });

  it("recommends Pass for negative expected profit (reseller mode)", () => {
    const r = recommend("reseller", stubEconomics({ expectedProfit: -10 }));
    expect(r.action).toBe("Pass");
  });

  it("returns Watch when sample size is 0", () => {
    const r = recommend("reseller", stubEconomics({ sampleSize: 0 }));
    expect(r.action).toBe("Watch");
  });

  it("returns a non-empty reason string", () => {
    const r = recommend("reseller", stubEconomics());
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it("recommends Buy for buyer mode when score is high and priced below comps", () => {
    const economics = stubEconomics({
      landedCost: 150,
      medianSold: 250,
      buyer: { score: 75, confidence: 0.85, factors: [], version: "score-2026.08.1" },
      confidence: 0.8,
    });
    const r = recommend("buyer", economics);
    expect(r.action).toBe("Buy");
  });
});
