import { describe, expect, it } from "vitest";

import {
  ageInDays,
  ageInHours,
  freshnessLabel,
  freshnessOf,
  intervalLabel,
  stalenessCaveat,
} from "@/lib/freshness";

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

describe("freshness", () => {
  it("treats a missing timestamp as unknown, never as fresh", () => {
    expect(freshnessOf(null)).toBe("unknown");
    expect(freshnessOf(undefined)).toBe("unknown");
    expect(ageInHours(null)).toBeNull();
    expect(ageInDays(null)).toBeNull();
  });

  it("classifies by age", () => {
    expect(freshnessOf(hoursAgo(1))).toBe("fresh");
    expect(freshnessOf(hoursAgo(48))).toBe("aging");
    expect(freshnessOf(hoursAgo(24 * 30))).toBe("stale");
  });

  it("warns only once data is no longer fresh", () => {
    expect(stalenessCaveat(hoursAgo(1))).toBeNull();
    expect(stalenessCaveat(hoursAgo(24 * 30))).toBeTruthy();
  });

  it("produces human labels", () => {
    expect(freshnessLabel(hoursAgo(1))).toBeTruthy();
    expect(intervalLabel(60)).toBeTruthy();
    expect(intervalLabel(null)).toBeTruthy();
  });
});
