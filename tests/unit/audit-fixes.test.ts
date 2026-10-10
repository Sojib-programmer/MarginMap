import { afterEach, describe, expect, it } from "vitest";

import { titleMatchConfidence } from "@/lib/connectors/registry.server";
import { assertSafeReturnUrl, serverPaymentEnv } from "@/lib/payments.server";

describe("titleMatchConfidence", () => {
  it("scores full overlap as 1 and unrelated titles as 0", () => {
    expect(titleMatchConfidence("Sony WH-1000XM5", "Sony WH 1000XM5 headphones black")).toBe(1);
    expect(titleMatchConfidence("Sony WH-1000XM5", "Nintendo Switch OLED")).toBe(0);
  });
});

describe("assertSafeReturnUrl", () => {
  it("accepts app origins and keeps the Stripe placeholder", () => {
    const out = assertSafeReturnUrl(
      "https://marginmap.assistant.bd/app/billing?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(out).toContain("{CHECKOUT_SESSION_ID}");
    expect(() => assertSafeReturnUrl("https://x.lovable.app/app")).not.toThrow();
  });
  it("rejects foreign origins and plain http", () => {
    expect(() => assertSafeReturnUrl("https://evil.example/app")).toThrow();
    expect(() => assertSafeReturnUrl("https://marginmap.assistant.bd.evil.example")).toThrow();
    expect(() => assertSafeReturnUrl("http://marginmap.assistant.bd/app")).toThrow();
  });
});

describe("serverPaymentEnv", () => {
  const prev = process.env["STRIPE_LIVE_API_KEY"];
  afterEach(() => {
    if (prev === undefined) delete process.env["STRIPE_LIVE_API_KEY"];
    else process.env["STRIPE_LIVE_API_KEY"] = prev;
  });
  it("is live whenever live keys exist, so sandbox checkout is refused", () => {
    process.env["STRIPE_LIVE_API_KEY"] = "x";
    expect(serverPaymentEnv()).toBe("live");
    delete process.env["STRIPE_LIVE_API_KEY"];
    expect(serverPaymentEnv()).toBe("sandbox");
  });
});
