/**
 * MarginMap scoring engine — v1, deterministic and fully explainable.
 * Every score is 0-100, weighted from named factors, and returned with the
 * raw factor values so the UI can render a drill-down instead of a black box.
 */

export const SCORE_VERSION = "score-2026.08.1";

export type ConditionGrade =
  | "new_sealed"
  | "open_box"
  | "refurbished"
  | "used_excellent"
  | "used_good"
  | "used_fair"
  | "for_parts";

export const CONDITION_LABEL: Record<string, string> = {
  new_sealed: "New / sealed",
  open_box: "Open box",
  refurbished: "Refurbished",
  used_excellent: "Used — excellent",
  used_good: "Used — good",
  used_fair: "Used — fair",
  for_parts: "For parts",
};

const CONDITION_QUALITY: Record<string, number> = {
  new_sealed: 1,
  open_box: 0.92,
  refurbished: 0.85,
  used_excellent: 0.8,
  used_good: 0.62,
  used_fair: 0.4,
  for_parts: 0.12,
};

export type OfferLike = {
  item_price: number;
  shipping_price: number;
  estimated_tax: number;
  condition_grade: string;
  match_confidence: number;
  seller_rating: number | null;
  availability: string;
  retrieved_at: string;
};

export type CompLike = {
  sold_price: number;
  shipping_paid: number;
  sold_at: string;
  condition_grade: string;
  match_confidence: number;
};

export type Factor = {
  key: string;
  label: string;
  weight: number;
  /** 0-1 normalized factor value. */
  value: number;
  detail: string;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  factors: Factor[];
  version: string;
};

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function landedCost(offer: {
  item_price: number;
  shipping_price: number;
  estimated_tax: number;
}) {
  return Number(offer.item_price) + Number(offer.shipping_price) + Number(offer.estimated_tax);
}

function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/** Median with an IQR outlier filter; excluded rows are reported, never hidden. */
export function robustStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { median: 0, low: 0, high: 0, kept: [] as number[], excluded: [] as number[] };
  }
  const q = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const lowBound = q1 - 1.5 * iqr;
  const highBound = q3 + 1.5 * iqr;
  const kept = sorted.filter((v) => v >= lowBound && v <= highBound);
  const excluded = sorted.filter((v) => v < lowBound || v > highBound);
  const base = kept.length ? kept : sorted;
  const mid = Math.floor(base.length / 2);
  const median = base.length % 2 ? base[mid]! : (base[mid - 1]! + base[mid]!) / 2;
  return { median, low: base[0] ?? 0, high: base[base.length - 1] ?? 0, kept, excluded };
}

/** Recency-weighted median: comps decay with a ~60 day half-life. */
export function recencyWeightedMedian(comps: CompLike[]) {
  if (comps.length === 0) return 0;
  const weighted = comps
    .map((c) => ({
      price: Number(c.sold_price) + Number(c.shipping_paid),
      weight: Math.pow(0.5, daysSince(c.sold_at) / 60) * Number(c.match_confidence),
    }))
    .sort((a, b) => a.price - b.price);
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let acc = 0;
  for (const w of weighted) {
    acc += w.weight;
    if (acc >= total / 2) return w.price;
  }
  return weighted[weighted.length - 1]!.price;
}

export type MarketStats = {
  sampleSize: number;
  medianSold: number;
  lowSold: number;
  highSold: number;
  medianAgeDays: number;
  dispersion: number;
  excludedCount: number;
  confidence: number;
};

export function marketStats(comps: CompLike[]): MarketStats {
  if (comps.length === 0) {
    return {
      sampleSize: 0,
      medianSold: 0,
      lowSold: 0,
      highSold: 0,
      medianAgeDays: 0,
      dispersion: 1,
      excludedCount: 0,
      confidence: 0,
    };
  }
  const totals = comps.map((c) => Number(c.sold_price) + Number(c.shipping_paid));
  const { low, high, excluded } = robustStats(totals);
  const median = recencyWeightedMedian(comps);
  const ages = comps.map((c) => daysSince(c.sold_at)).sort((a, b) => a - b);
  const medianAgeDays = ages[Math.floor(ages.length / 2)] ?? 0;
  const dispersion = median > 0 ? (high - low) / median : 1;
  const avgMatch = comps.reduce((s, c) => s + Number(c.match_confidence), 0) / comps.length;

  const confidence = clamp01(
    0.35 * clamp01(comps.length / 12) +
      0.25 * clamp01(1 - medianAgeDays / 120) +
      0.25 * avgMatch +
      0.15 * clamp01(1 - dispersion),
  );

  return {
    sampleSize: comps.length,
    medianSold: median,
    lowSold: low,
    highSold: high,
    medianAgeDays,
    dispersion,
    excludedCount: excluded.length,
    confidence,
  };
}

function weighted(factors: Factor[]) {
  const score = factors.reduce((s, f) => s + f.weight * clamp01(f.value), 0);
  return Math.round(clamp01(score) * 100);
}

/* ------------------------------ Buyer ------------------------------ */

export type BuyerVerdict =
  "Best value" | "Lowest landed cost" | "Safer purchase" | "Best fit" | "Watch / wait";

export function buyerScore(offer: OfferLike, stats: MarketStats): ScoreResult {
  const cost = landedCost(offer);
  const fair = stats.medianSold || cost;
  const priceValue = clamp01(0.5 + (fair - cost) / (fair * 0.4));

  const factors: Factor[] = [
    {
      key: "price_value",
      label: "Price value",
      weight: 0.35,
      value: priceValue,
      detail: `Landed ${cost.toFixed(0)} vs fair market ${fair.toFixed(0)}`,
    },
    {
      key: "fit",
      label: "Fit certainty",
      weight: 0.2,
      value: Number(offer.match_confidence),
      detail: `Variant match confidence ${(Number(offer.match_confidence) * 100).toFixed(0)}%`,
    },
    {
      key: "condition",
      label: "Condition quality",
      weight: 0.15,
      value: CONDITION_QUALITY[offer.condition_grade] ?? 0.5,
      detail: CONDITION_LABEL[offer.condition_grade] ?? offer.condition_grade,
    },
    {
      key: "trust",
      label: "Seller / source trust",
      weight: 0.1,
      value: offer.seller_rating == null ? 0.5 : clamp01((Number(offer.seller_rating) - 0.8) / 0.2),
      detail:
        offer.seller_rating == null
          ? "No provider trust signal"
          : `Provider rating ${(Number(offer.seller_rating) * 100).toFixed(1)}%`,
    },
    {
      key: "fulfillment",
      label: "Fulfillment",
      weight: 0.1,
      value:
        (offer.availability === "in_stock"
          ? 0.75
          : offer.availability === "low_stock"
            ? 0.5
            : 0.25) + (Number(offer.shipping_price) === 0 ? 0.25 : 0),
      detail: `${offer.availability.replace("_", " ")}, shipping ${Number(offer.shipping_price).toFixed(2)}`,
    },
    {
      key: "data",
      label: "Data confidence & freshness",
      weight: 0.1,
      value: clamp01(
        stats.confidence * 0.7 + clamp01(1 - daysSince(offer.retrieved_at) / 14) * 0.3,
      ),
      detail: `${stats.sampleSize} comps, offer retrieved ${daysSince(offer.retrieved_at).toFixed(1)}d ago`,
    },
  ];

  return {
    score: weighted(factors),
    confidence: clamp01(stats.confidence * 0.6 + Number(offer.match_confidence) * 0.4),
    factors,
    version: SCORE_VERSION,
  };
}

export function buyerVerdict(score: number, confidence: number): BuyerVerdict {
  if (confidence < 0.35) return "Watch / wait";
  if (score >= 80) return "Best value";
  if (score >= 68) return "Safer purchase";
  if (score >= 55) return "Best fit";
  if (score >= 40) return "Lowest landed cost";
  return "Watch / wait";
}

/* ---------------------------- Reseller ---------------------------- */

export type FeeSchedule = {
  marketplace: string;
  marketplaceFeePct: number;
  paymentFeePct: number;
  paymentFeeFlat: number;
  effectiveFrom: string;
};

export const FEE_SCHEDULES: FeeSchedule[] = [
  {
    marketplace: "Generic marketplace",
    marketplaceFeePct: 0.13,
    paymentFeePct: 0.029,
    paymentFeeFlat: 0.3,
    effectiveFrom: "2026-01-01",
  },
  {
    marketplace: "Auction marketplace",
    marketplaceFeePct: 0.1325,
    paymentFeePct: 0.0,
    paymentFeeFlat: 0.4,
    effectiveFrom: "2026-01-01",
  },
  {
    marketplace: "Niche gear marketplace",
    marketplaceFeePct: 0.05,
    paymentFeePct: 0.029,
    paymentFeeFlat: 0.49,
    effectiveFrom: "2026-01-01",
  },
  {
    marketplace: "Local / cash sale",
    marketplaceFeePct: 0,
    paymentFeePct: 0,
    paymentFeeFlat: 0,
    effectiveFrom: "2026-01-01",
  },
];

export type DealInput = {
  purchasePrice: number;
  inboundShipping: number;
  tax: number;
  repairPrep: number;
  otherCosts: number;
  outboundShipping: number;
  packaging: number;
  returnsReservePct: number;
  marketplace: string;
  conditionGrade: string;
  targetHoldDays: number;
  desiredProfit: number;
};

export const DEFAULT_DEAL_INPUT: DealInput = {
  purchasePrice: 0,
  inboundShipping: 0,
  tax: 0,
  repairPrep: 0,
  otherCosts: 0,
  outboundShipping: 18,
  packaging: 4,
  returnsReservePct: 0.03,
  marketplace: "Generic marketplace",
  conditionGrade: "used_good",
  targetHoldDays: 30,
  desiredProfit: 100,
};

export type DealOutput = {
  expectedGrossSale: number;
  expectedLow: number;
  expectedHigh: number;
  marketplaceFee: number;
  paymentFee: number;
  returnsReserve: number;
  netProceeds: number;
  allInCost: number;
  expectedProfit: number;
  roiPct: number;
  breakEvenPurchasePrice: number;
  daysToSell: number;
  score: ScoreResult;
  flags: string[];
  verdict: "Source now" | "Worth researching" | "Thin edge" | "Pass / watch only" | "Speculative";
};

export function evaluateDeal(
  input: DealInput,
  stats: MarketStats,
  liquidity: { activeListings: number; completedSales: number; daysToSell: number },
): DealOutput {
  const fees = FEE_SCHEDULES.find((f) => f.marketplace === input.marketplace) ?? FEE_SCHEDULES[0]!;

  const conditionFactor = (CONDITION_QUALITY[input.conditionGrade] ?? 0.62) / 0.62;
  const expectedGrossSale = (stats.medianSold || 0) * Math.min(1.12, conditionFactor);
  const expectedLow = stats.lowSold * Math.min(1.1, conditionFactor);
  const expectedHigh = stats.highSold * Math.min(1.15, conditionFactor);

  const marketplaceFee = expectedGrossSale * fees.marketplaceFeePct;
  const paymentFee = expectedGrossSale * fees.paymentFeePct + fees.paymentFeeFlat;
  const returnsReserve = expectedGrossSale * input.returnsReservePct;

  const netProceeds =
    expectedGrossSale -
    marketplaceFee -
    paymentFee -
    input.outboundShipping -
    input.packaging -
    returnsReserve;

  const allInCost =
    input.purchasePrice + input.inboundShipping + input.tax + input.repairPrep + input.otherCosts;

  const expectedProfit = netProceeds - allInCost;
  const roiPct = allInCost > 0 ? (expectedProfit / allInCost) * 100 : 0;
  const breakEvenPurchasePrice = netProceeds - input.desiredProfit;

  const supply = Math.max(1, liquidity.activeListings);
  const sellThrough = liquidity.completedSales / supply;
  const daysToSell = liquidity.daysToSell || 30;

  const conservativeComp = stats.lowSold + (stats.medianSold - stats.lowSold) * 0.35;

  const factors: Factor[] = [
    {
      key: "margin",
      label: "Net-margin quality",
      weight: 0.35,
      value: clamp01(roiPct / 45),
      detail: `Profit ${expectedProfit.toFixed(0)} at ${roiPct.toFixed(1)}% ROI`,
    },
    {
      key: "liquidity",
      label: "Liquidity",
      weight: 0.2,
      value: clamp01(sellThrough / 2) * 0.6 + clamp01(1 - daysToSell / 60) * 0.4,
      detail: `${liquidity.completedSales} sold vs ${liquidity.activeListings} active, ~${daysToSell}d to sell`,
    },
    {
      key: "acquisition",
      label: "Acquisition edge",
      weight: 0.15,
      value:
        conservativeComp > 0
          ? clamp01((conservativeComp - allInCost) / (conservativeComp * 0.35))
          : 0,
      detail: `All-in ${allInCost.toFixed(0)} vs conservative comp ${conservativeComp.toFixed(0)}`,
    },
    {
      key: "condition_risk",
      label: "Condition / repair risk",
      weight: 0.1,
      value: CONDITION_QUALITY[input.conditionGrade] ?? 0.5,
      detail: CONDITION_LABEL[input.conditionGrade] ?? input.conditionGrade,
    },
    {
      key: "capital",
      label: "Capital efficiency",
      weight: 0.1,
      value:
        allInCost > 0
          ? clamp01((expectedProfit / allInCost) * (30 / Math.max(7, input.targetHoldDays)) * 2.5)
          : 0,
      detail: `Target hold ${input.targetHoldDays}d`,
    },
    {
      key: "data",
      label: "Data confidence",
      weight: 0.1,
      value: stats.confidence,
      detail: `${stats.sampleSize} comps, median age ${stats.medianAgeDays.toFixed(0)}d`,
    },
  ];

  const flags: string[] = [];
  if (stats.sampleSize < 5) flags.push("Insufficient completed comps");
  if (stats.medianAgeDays > 90) flags.push("Comp data is older than 90 days");
  if (sellThrough < 0.25) flags.push("Thin liquidity relative to active supply");
  if (expectedProfit < input.desiredProfit) flags.push("Profit below your target");
  if (input.tax === 0 && input.purchasePrice > 0)
    flags.push("No tax entered — landed cost may be understated");
  if (stats.confidence < 0.4) flags.push("Low data confidence — treat estimates as speculative");

  const score = {
    score: weighted(factors),
    confidence: stats.confidence,
    factors,
    version: SCORE_VERSION,
  };

  let verdict: DealOutput["verdict"];
  if (stats.confidence < 0.4 && score.score >= 60) verdict = "Speculative";
  else if (score.score >= 80) verdict = "Source now";
  else if (score.score >= 60) verdict = "Worth researching";
  else if (score.score >= 40) verdict = "Thin edge";
  else verdict = "Pass / watch only";

  return {
    expectedGrossSale,
    expectedLow,
    expectedHigh,
    marketplaceFee,
    paymentFee,
    returnsReserve,
    netProceeds,
    allInCost,
    expectedProfit,
    roiPct,
    breakEvenPurchasePrice,
    daysToSell,
    score,
    flags,
    verdict,
  };
}

export function scoreBand(score: number) {
  if (score >= 80) return { label: "Strong", tone: "verified" as const };
  if (score >= 60) return { label: "Good", tone: "primary" as const };
  if (score >= 40) return { label: "Mixed", tone: "caution" as const };
  return { label: "Avoid", tone: "destructive" as const };
}

/* ------------------- Unified per-offer economics ------------------- */

/**
 * One calculation path shared by search, compare, offer tables and the
 * evaluator, so every surface shows the same numbers for the same offer.
 */
export type OfferEconomics = {
  itemPrice: number;
  shipping: number;
  tax: number;
  /** False when the source returned no tax — never silently treated as zero. */
  taxProvided: boolean;
  /** Acquisition cost: item + shipping + tax. */
  landedCost: number;
  /** Marketplace + payment fees charged on the expected resale. */
  resaleFees: number;
  /** Landed cost plus the fees a resale would incur — full round-trip cost. */
  landedCostWithFees: number;
  medianSold: number;
  lowSold: number;
  highSold: number;
  expectedResale: number;
  netProceeds: number;
  expectedProfit: number;
  roiPct: number;
  daysToSell: number;
  sampleSize: number;
  confidence: number;
  buyer: ScoreResult;
  deal: DealOutput;
  flags: string[];
};

export function offerEconomics(
  offer: OfferLike,
  stats: MarketStats,
  liquidity: { activeListings: number; completedSales: number; daysToSell: number },
  marketplace: string = DEFAULT_DEAL_INPUT.marketplace,
): OfferEconomics {
  const itemPrice = Number(offer.item_price);
  const shipping = Number(offer.shipping_price);
  const tax = Number(offer.estimated_tax);

  const deal = evaluateDeal(
    {
      ...DEFAULT_DEAL_INPUT,
      marketplace,
      purchasePrice: itemPrice,
      inboundShipping: shipping,
      tax,
      conditionGrade: offer.condition_grade,
    },
    stats,
    liquidity,
  );
  const buyer = buyerScore(offer, stats);
  const resaleFees = deal.marketplaceFee + deal.paymentFee;
  const landed = itemPrice + shipping + tax;

  return {
    itemPrice,
    shipping,
    tax,
    taxProvided: tax > 0,
    landedCost: landed,
    resaleFees,
    landedCostWithFees: landed + resaleFees,
    medianSold: stats.medianSold,
    lowSold: stats.lowSold,
    highSold: stats.highSold,
    expectedResale: deal.expectedGrossSale,
    netProceeds: deal.netProceeds,
    expectedProfit: deal.expectedProfit,
    roiPct: deal.roiPct,
    daysToSell: deal.daysToSell,
    sampleSize: stats.sampleSize,
    confidence: stats.confidence,
    buyer,
    deal,
    flags: deal.flags,
  };
}

/* -------------------- Buy / Watch / Pass verdict -------------------- */

export type RecommendationAction = "Buy" | "Watch" | "Pass";

export type Recommendation = {
  action: RecommendationAction;
  tone: "verified" | "caution" | "destructive";
  reason: string;
};

const TONE: Record<RecommendationAction, Recommendation["tone"]> = {
  Buy: "verified",
  Watch: "caution",
  Pass: "destructive",
};

/** Single normalized verdict for both roles, derived from the same economics. */
export function recommend(mode: "buyer" | "reseller", e: OfferEconomics): Recommendation {
  const say = (action: RecommendationAction, reason: string): Recommendation => ({
    action,
    tone: TONE[action],
    reason,
  });

  if (e.sampleSize === 0) {
    return say("Watch", "No completed sales on record — nothing to price against yet.");
  }

  if (mode === "buyer") {
    const score = e.buyer.score;
    const vsMarket = e.medianSold > 0 ? (e.medianSold - e.landedCost) / e.medianSold : 0;
    if (e.confidence < 0.35) {
      return say("Watch", `Only ${e.sampleSize} usable comps — evidence too thin to act on.`);
    }
    if (score >= 70 && vsMarket > 0) {
      return say(
        "Buy",
        `Landed cost is ${(vsMarket * 100).toFixed(0)}% under the comp median at a ${score} value score.`,
      );
    }
    if (score >= 45) {
      return say(
        "Watch",
        vsMarket > 0
          ? `Only ${(vsMarket * 100).toFixed(0)}% below comps — wait for a better listing.`
          : "Priced at or above what buyers actually paid.",
      );
    }
    return say("Pass", "Landed cost is above the comp median for this condition.");
  }

  if (e.confidence < 0.4) {
    return say("Watch", "Comp confidence is too low to commit capital.");
  }
  if (e.expectedProfit <= 0) {
    return say(
      "Pass",
      `Expected net leaves ${e.expectedProfit.toFixed(0)} after fees and shipping.`,
    );
  }
  if (e.roiPct >= 25 && e.deal.score.score >= 60) {
    return say(
      "Buy",
      `${e.roiPct.toFixed(0)}% ROI on ${e.landedCost.toFixed(0)} all-in, ~${e.daysToSell}d to sell.`,
    );
  }
  if (e.roiPct >= 10) {
    return say("Watch", `Thin ${e.roiPct.toFixed(0)}% ROI — acceptable only at a lower buy price.`);
  }
  return say("Pass", `${e.roiPct.toFixed(0)}% ROI does not cover the risk on this hold.`);
}
