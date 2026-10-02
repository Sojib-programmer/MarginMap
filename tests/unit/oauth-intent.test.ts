import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The OAuth attribution marker decides whether a Google Ads conversion is
 * reported. A stale marker must never be consumed, or an unrelated later
 * sign-in emits a false conversion.
 */
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function mod() {
  return await import("@/lib/consent");
}

describe("oauth intent", () => {
  it("returns the provider inside the TTL and consumes the marker", async () => {
    const { markOAuthIntent, consumeOAuthIntent, OAUTH_INTENT_KEY } = await mod();
    markOAuthIntent("apple");
    expect(consumeOAuthIntent()).toBe("apple");
    expect(store.has(OAUTH_INTENT_KEY)).toBe(false);
    expect(consumeOAuthIntent()).toBeNull();
  });

  it("discards a marker older than the TTL", async () => {
    const { markOAuthIntent, consumeOAuthIntent, OAUTH_INTENT_TTL_MS, OAUTH_INTENT_KEY } =
      await mod();
    markOAuthIntent("google");
    store.set(
      OAUTH_INTENT_KEY,
      JSON.stringify({ provider: "google", at: Date.now() - OAUTH_INTENT_TTL_MS - 1 }),
    );
    expect(consumeOAuthIntent()).toBeNull();
  });

  it("clearOAuthIntent removes an abandoned attempt", async () => {
    const { markOAuthIntent, clearOAuthIntent, consumeOAuthIntent } = await mod();
    markOAuthIntent("google");
    clearOAuthIntent();
    expect(consumeOAuthIntent()).toBeNull();
  });

  it("ignores a corrupt or timestamp-less marker", async () => {
    const { consumeOAuthIntent, OAUTH_INTENT_KEY } = await mod();
    store.set(OAUTH_INTENT_KEY, "not json");
    expect(consumeOAuthIntent()).toBeNull();
    store.set(OAUTH_INTENT_KEY, JSON.stringify({ provider: "google" }));
    expect(consumeOAuthIntent()).toBeNull();
  });
});

describe("purgeStaleOAuthIntent", () => {
  it("removes an expired marker but keeps a live one", async () => {
    const { markOAuthIntent, purgeStaleOAuthIntent, OAUTH_INTENT_KEY, OAUTH_INTENT_TTL_MS } =
      await mod();
    markOAuthIntent("google");
    purgeStaleOAuthIntent();
    expect(store.has(OAUTH_INTENT_KEY)).toBe(true);
    store.set(
      OAUTH_INTENT_KEY,
      JSON.stringify({ provider: "google", at: Date.now() - OAUTH_INTENT_TTL_MS - 1 }),
    );
    purgeStaleOAuthIntent();
    expect(store.has(OAUTH_INTENT_KEY)).toBe(false);
  });
});
