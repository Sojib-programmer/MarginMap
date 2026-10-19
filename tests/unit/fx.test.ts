import { describe, expect, it } from "vitest";

import { convertToUsd, normalizeCurrency } from "@/lib/fx";

describe("fx conversion to USD", () => {
  it("converts EUR 30.89 at 1.08 to 33.36 USD", () => {
    expect(convertToUsd(30.89, 1.08)).toBe(33.36);
  });
  it("keeps null amounts null", () => {
    expect(convertToUsd(null, 1.08)).toBeNull();
  });
  it("rejects a non-positive rate instead of guessing", () => {
    expect(() => convertToUsd(10, 0)).toThrow();
  });
  it("normalizes currency codes and defaults junk to USD", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
    expect(normalizeCurrency("€")).toBe("USD");
  });
});
