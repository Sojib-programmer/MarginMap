import { describe, expect, it } from "vitest";

import { redactError } from "@/lib/connectors/run.server";

describe("redactError", () => {
  it("strips bearer and basic credentials", () => {
    expect(redactError(new Error("failed Authorization: Bearer abc.def-123"))).toContain(
      "Bearer [redacted]",
    );
    expect(redactError("Basic aGVsbG86d29ybGQ=")).toBe("Basic [redacted]");
  });

  it("strips tokens from query strings", () => {
    expect(redactError("https://api.example.com/x?access_token=secret&q=1")).toBe(
      "https://api.example.com/x?access_token=[redacted]&q=1",
    );
  });

  it("strips jwt-shaped values and caps length", () => {
    const jwt = `eyJ${"a".repeat(40)}`;
    expect(redactError(jwt)).toBe("[redacted-token]");
    expect(redactError("x".repeat(900)).length).toBe(500);
  });
});
