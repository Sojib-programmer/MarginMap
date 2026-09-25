/**
 * Server-only integration helpers (Firecrawl extraction, PostHog capture).
 * Env is read inside each call — never at module scope (Worker runtime).
 */
import { fetchWithRetry } from "@/lib/connectors/registry.server";

export type ExtractedListing = {
  title: string | null;
  itemPrice: number | null;
  shippingPrice: number | null;
  currencyCode: string | null;
  condition: string | null;
  sellerName: string | null;
};

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number", description: "Current purchase price of the item, number only" },
    shipping_price: { type: "number", description: "Shipping cost, 0 if free" },
    currency: { type: "string", description: "ISO 4217 currency code" },
    condition: { type: "string" },
    seller: { type: "string" },
  },
  required: ["title", "price"],
};

export function firecrawlConfigured() {
  return Boolean(process.env["FIRECRAWL_API_KEY"]);
}

/** Structured extraction of a listing page. Returns null on any failure — never guesses. */
export async function extractListingWithFirecrawl(url: string): Promise<ExtractedListing | null> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) return null;
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const direct = key.startsWith("fc-") || !lovableKey;
  const endpoint = direct
    ? "https://api.firecrawl.dev/v2/scrape"
    : "https://connector-gateway.lovable.dev/firecrawl/v2/scrape";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (direct) headers["Authorization"] = `Bearer ${key}`;
  else {
    headers["Authorization"] = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = key;
  }

  const res = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        formats: [{ type: "json", schema: LISTING_SCHEMA }],
      }),
    },
    { timeoutMs: 25_000, attempts: 2 },
  );
  if (!res.ok) {
    console.error(`Firecrawl scrape failed [${res.status}]`);
    return null;
  }
  const body = (await res.json()) as {
    data?: { json?: Record<string, unknown> };
  };
  const j = body.data?.json;
  if (!j) return null;
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const price = num(j["price"]);
  if (!price) return null;
  return {
    title: typeof j["title"] === "string" ? j["title"].slice(0, 300) : null,
    itemPrice: price,
    shippingPrice: num(j["shipping_price"]) ?? 0,
    currencyCode:
      typeof j["currency"] === "string" && /^[A-Z]{3}$/.test(j["currency"])
        ? j["currency"]
        : "USD",
    condition: typeof j["condition"] === "string" ? j["condition"].slice(0, 80) : null,
    sellerName: typeof j["seller"] === "string" ? j["seller"].slice(0, 120) : null,
  };
}

/** Fire-and-forget product event. Distinct id is the opaque auth UUID; no PII. */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
) {
  const token = process.env["POSTHOG_API_KEY"];
  if (!token) return;
  const host =
    process.env["POSTHOG_REGION"] === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: token, event, distinct_id: distinctId, properties }),
    });
    if (!res.ok) console.error(`PostHog capture failed [${res.status}]`);
  } catch (e) {
    console.error("PostHog capture error", e instanceof Error ? e.message : e);
  }
}
