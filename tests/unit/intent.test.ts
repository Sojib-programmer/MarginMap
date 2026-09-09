import { describe, expect, it } from "vitest";

import { parseIntent } from "@/lib/intent";
import type { VariantIntel } from "@/lib/catalog";

const catalog = [
  { brand: "Sony", category: "Cameras", categorySlug: "cameras" },
  { brand: "Apple", category: "Laptops", categorySlug: "laptops" },
] as unknown as VariantIntel[];

describe("parseIntent", () => {
  it("reads a budget ceiling in several phrasings", () => {
    expect(parseIntent("sony camera under $800", catalog).priceCeiling).toBe(800);
    expect(parseIntent("laptop up to 1,200", catalog).priceCeiling).toBe(1200);
    expect(parseIntent("camera less than $99.50", catalog).priceCeiling).toBe(99.5);
  });

  it("reads a floor separately from a ceiling", () => {
    const i = parseIntent("camera over $200 under $900", catalog);
    expect(i.priceFloor).toBe(200);
    expect(i.priceCeiling).toBe(900);
  });

  it("detects condition preferences", () => {
    expect(parseIntent("sealed sony camera", catalog).conditions).toContain("new_sealed");
    expect(parseIntent("refurbished apple laptop", catalog).conditions).toContain("refurbished");
    expect(parseIntent("camera for parts", catalog).conditions).toContain("for_parts");
  });

  it("matches brand and category from the catalog", () => {
    const i = parseIntent("apple laptop under 900", catalog);
    expect(i.brand).toBe("Apple");
    expect(i.categorySlug).toBe("laptops");
  });

  it("drops stopwords and bare numbers from keywords", () => {
    const { keywords } = parseIntent("find me the best deal on a sony camera under 500", catalog);
    expect(keywords).toContain("sony");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("500");
  });

  it("handles an empty query without throwing", () => {
    const i = parseIntent("   ", catalog);
    expect(i.priceCeiling).toBeNull();
    expect(i.brand).toBeNull();
  });
});
