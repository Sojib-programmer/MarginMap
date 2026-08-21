import { describe, expect, it } from "vitest";

import { matchVariants, parseIntent, type ParsedIntent } from "../intent";
import type { VariantIntel } from "../catalog";

// ─── minimal VariantIntel stub ────────────────────────────────────────────────

function makeVariant(overrides: Partial<VariantIntel> = {}): VariantIntel {
  return {
    variantId: "var-1",
    variantTitle: "128 GB Black",
    canonicalKey: "sony-wh1000xm5-black-128gb",
    attributes: { color: "black", storage: "128 GB" },
    gtin: null,
    sku: null,
    productId: "prod-1",
    productName: "Sony WH-1000XM5",
    slug: "sony-wh1000xm5",
    description: null,
    specs: {},
    identityConfidence: 0.95,
    brand: "Sony",
    brandId: "brand-1",
    category: "Headphones",
    categoryId: "cat-1",
    categorySlug: "headphones",
    offers: [],
    comps: [],
    stats: {
      sampleSize: 0,
      medianSold: 0,
      lowSold: 0,
      highSold: 0,
      medianAgeDays: 0,
      dispersion: 1,
      excludedCount: 0,
      confidence: 0,
    },
    ...overrides,
  } as VariantIntel;
}

// ─── parseIntent ─────────────────────────────────────────────────────────────

describe("parseIntent", () => {
  it("returns empty keywords for empty query", () => {
    const intent = parseIntent("", []);
    expect(intent.keywords).toHaveLength(0);
    expect(intent.priceCeiling).toBeNull();
    expect(intent.priceFloor).toBeNull();
    expect(intent.brand).toBeNull();
    expect(intent.categorySlug).toBeNull();
  });

  it("extracts price ceiling from 'under $200'", () => {
    const intent = parseIntent("under $200", []);
    expect(intent.priceCeiling).toBe(200);
  });

  it("extracts price ceiling from 'below 150'", () => {
    expect(parseIntent("below 150", []).priceCeiling).toBe(150);
  });

  it("extracts price ceiling from '$300 or less'", () => {
    expect(parseIntent("$300 or less", []).priceCeiling).toBe(300);
  });

  it("extracts price floor from 'over $50'", () => {
    expect(parseIntent("over $50", []).priceFloor).toBe(50);
  });

  it("extracts price floor from 'at least 75'", () => {
    expect(parseIntent("at least 75", []).priceFloor).toBe(75);
  });

  it("detects new_sealed condition", () => {
    const { conditions } = parseIntent("brand new sealed headphones", []);
    expect(conditions).toContain("new_sealed");
  });

  it("detects refurbished condition", () => {
    expect(parseIntent("refurb laptop", []).conditions).toContain("refurbished");
  });

  it("detects used_good condition from 'good'", () => {
    expect(parseIntent("good condition guitar", []).conditions).toContain("used_good");
  });

  it("detects for_parts condition", () => {
    expect(parseIntent("for parts only", []).conditions).toContain("for_parts");
  });

  it("strips stopwords from keywords", () => {
    const { keywords } = parseIntent("the best deal for me", []);
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("for");
    expect(keywords).not.toContain("me");
  });

  it("does not include pure numeric tokens in keywords", () => {
    const { keywords } = parseIntent("canon 5d 2023", []);
    expect(keywords).not.toContain("2023");
  });

  it("matches brand from catalog", () => {
    const catalog = [makeVariant({ brand: "Sony" })];
    const intent = parseIntent("Sony headphones", catalog);
    expect(intent.brand).toBe("Sony");
  });

  it("returns null brand when no catalog match", () => {
    expect(parseIntent("headphones", [makeVariant({ brand: "Sony" })]).brand).toBeNull();
  });

  it("matches category slug from catalog (singular form)", () => {
    const catalog = [makeVariant({ category: "Headphones", categorySlug: "headphones" })];
    const intent = parseIntent("headphone under $300", catalog);
    expect(intent.categorySlug).toBe("headphones");
  });

  it("preserves raw query", () => {
    const raw = "Sony headphones under $200";
    expect(parseIntent(raw, []).raw).toBe(raw);
  });

  it("both ceiling and floor can be parsed together", () => {
    const intent = parseIntent("over $50 under $200 laptop", []);
    expect(intent.priceFloor).toBe(50);
    expect(intent.priceCeiling).toBe(200);
  });
});

// ─── matchVariants ────────────────────────────────────────────────────────────

describe("matchVariants", () => {
  function makeIntent(overrides: Partial<ParsedIntent> = {}): ParsedIntent {
    return {
      keywords: [],
      priceCeiling: null,
      priceFloor: null,
      conditions: [],
      categorySlug: null,
      brand: null,
      raw: "",
      ...overrides,
    };
  }

  it("returns empty array for empty catalog", () => {
    const intent = makeIntent({ keywords: ["sony"] });
    expect(matchVariants(intent, [])).toHaveLength(0);
  });

  it("filters out variants with relevance <= 0.12", () => {
    const catalog = [makeVariant({ productName: "Completely unrelated item xyz" })];
    const intent = makeIntent({ keywords: ["guitar"] });
    const results = matchVariants(intent, catalog);
    expect(results).toHaveLength(0);
  });

  it("includes variant when keyword matches product name", () => {
    const catalog = [makeVariant({ productName: "Sony WH-1000XM5" })];
    const intent = makeIntent({ keywords: ["wh1000xm5"] });
    const results = matchVariants(intent, catalog);
    expect(results.length).toBeGreaterThan(0);
  });

  it("boosts relevance for brand match", () => {
    // Use a partial keyword hit (hits 1 of 3 keywords = 0.33 base) so brand boost is visible
    const catalog = [
      makeVariant({ variantId: "v1", productName: "WH Speakers", brand: "Sony" }),
      makeVariant({ variantId: "v2", productName: "WH Speakers", brand: "Panasonic" }),
    ];
    const intent = makeIntent({ keywords: ["wh", "xtra", "zz99"], brand: "Sony" });
    const results = matchVariants(intent, catalog);
    const sonyResult = results.find((r) => r.variant.variantId === "v1");
    const otherResult = results.find((r) => r.variant.variantId === "v2");
    expect(sonyResult?.relevance ?? 0).toBeGreaterThan(otherResult?.relevance ?? 0);
  });

  it("boosts relevance for category match", () => {
    // Same: partial keyword hit so category boost is visible
    const catalog = [
      makeVariant({ variantId: "v1", productName: "Model Xtra", categorySlug: "guitars" }),
      makeVariant({ variantId: "v2", productName: "Model Xtra", categorySlug: "electronics" }),
    ];
    const intent = makeIntent({ keywords: ["model", "zzz1", "zzz2"], categorySlug: "guitars" });
    const results = matchVariants(intent, catalog);
    const guitarResult = results.find((r) => r.variant.variantId === "v1");
    const otherResult = results.find((r) => r.variant.variantId === "v2");
    expect(guitarResult?.relevance ?? 0).toBeGreaterThan(otherResult?.relevance ?? 0);
  });

  it("sorts results by descending relevance", () => {
    const catalog = [
      makeVariant({
        variantId: "v1",
        productName: "Sony WH-1000XM5 Headphones",
        brand: "Sony",
        categorySlug: "headphones",
      }),
      makeVariant({ variantId: "v2", productName: "Generic Headphones" }),
    ];
    const intent = makeIntent({
      keywords: ["sony", "wh1000xm5", "headphones"],
      brand: "Sony",
    });
    const results = matchVariants(intent, catalog);
    const relevances = results.map((r) => r.relevance);
    for (let i = 1; i < relevances.length; i++) {
      expect(relevances[i - 1]!).toBeGreaterThanOrEqual(relevances[i]!);
    }
  });

  it("penalises variants whose cheapest offer exceeds price ceiling", () => {
    const cheapOffer = {
      id: "o1",
      data_source_id: "ds1",
      variant_id: "v1",
      title: "Cheap offer",
      condition_grade: "used_good",
      condition_notes: null,
      item_price: 50,
      shipping_price: 5,
      estimated_tax: 0,
      currency_code: "USD",
      seller_name: null,
      seller_rating: null,
      availability: "in_stock",
      location_text: null,
      listing_url: null,
      listed_at: null,
      retrieved_at: new Date().toISOString(),
      match_confidence: 0.9,
      is_active: true,
    };
    const expensiveOffer = { ...cheapOffer, id: "o2", item_price: 400 };

    const catalog = [
      makeVariant({ variantId: "v1", productName: "Camera A", offers: [cheapOffer] as never }),
      makeVariant({ variantId: "v2", productName: "Camera A", offers: [expensiveOffer] as never }),
    ];

    const intent = makeIntent({ keywords: ["camera"], priceCeiling: 100 });
    const results = matchVariants(intent, catalog);

    const affordable = results.find((r) => r.variant.variantId === "v1");
    const tooExpensive = results.find((r) => r.variant.variantId === "v2");
    expect(affordable?.relevance ?? 0).toBeGreaterThan(tooExpensive?.relevance ?? 0);
  });

  it("explanation is always a non-empty string", () => {
    const catalog = [makeVariant({ productName: "Sony XM5" })];
    const intent = makeIntent({ keywords: ["sony", "xm5"] });
    const results = matchVariants(intent, catalog);
    for (const r of results) {
      expect(r.explanation.length).toBeGreaterThan(0);
    }
  });
});
