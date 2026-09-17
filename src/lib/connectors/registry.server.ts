/**
 * Live source connector registry.
 *
 * Each adapter knows how to pull current offers for one marketplace and hand
 * back normalized rows. Adapters are registered here by the `marketplace` value
 * on `data_sources`, and an adapter reports itself unavailable (rather than
 * inventing data) when its credentials are absent. A source only flips to
 * `is_live` after a real run succeeds.
 */

export type NormalizedOffer = {
  external_url: string;
  title: string;
  condition_grade: string;
  item_price: number;
  shipping_price: number;
  estimated_tax: number;
  currency_code: string;
  seller_name: string | null;
  availability: string;
  listing_url: string;
  match_confidence: number;
};

export type AdapterContext = {
  /** Canonical keys / titles of variants the workspace tracks. */
  queries: string[];
  limit: number;
};

export type SourceAdapter = {
  marketplace: string;
  label: string;
  /** Env var names that must be present before the adapter can run. */
  requiredSecrets: string[];
  fetchOffers: (ctx: AdapterContext) => Promise<NormalizedOffer[]>;
};

export class AdapterUnavailableError extends Error {
  constructor(public readonly missing: string[]) {
    super(
      `Connector credentials missing: ${missing.join(", ")}. Add them as project secrets, then run the refresh again.`,
    );
    this.name = "AdapterUnavailableError";
  }
}

/**
 * Bounded upstream call with retry/backoff. A hung marketplace API must not hold
 * a worker open, and a transient 5xx/429 must not fail the whole refresh.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 10_000, attempts = 3 } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status === 429 || res.status >= 500) {
        if (attempt === attempts) return res;
        throw new Error(`retryable status ${res.status}`);
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt === attempts) break;
      await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 500));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function requireSecrets(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const n of names) {
    const v = process.env[n];
    if (!v) missing.push(n);
    else out[n] = v;
  }
  if (missing.length) throw new AdapterUnavailableError(missing);
  return out;
}

/**
 * eBay Browse API adapter. Wired end to end except for credentials: without
 * EBAY_CLIENT_ID / EBAY_CLIENT_SECRET it refuses to run and the refresh is
 * recorded as a skipped run — it never fabricates listings.
 */
const ebayAdapter: SourceAdapter = {
  marketplace: "ebay",
  label: "eBay Browse API",
  requiredSecrets: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],
  async fetchOffers({ queries, limit }) {
    const secrets = requireSecrets(ebayAdapter.requiredSecrets);

    const basic = Buffer.from(
      `${secrets["EBAY_CLIENT_ID"]}:${secrets["EBAY_CLIENT_SECRET"]}`,
    ).toString("base64");
    const tokenRes = await fetchWithRetry("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });
    if (!tokenRes.ok) {
      // Status only: upstream bodies can echo credentials back.
      throw new Error(`eBay token request failed [${tokenRes.status}]`);
    }
    const token = ((await tokenRes.json()) as { access_token: string }).access_token;

    const rows: NormalizedOffer[] = [];
    for (const q of queries.slice(0, 20)) {
      const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        throw new Error(`eBay search failed [${res.status}]`);
      }
      const body = (await res.json()) as {
        itemSummaries?: {
          itemId: string;
          title: string;
          condition?: string;
          price?: { value: string; currency: string };
          shippingOptions?: { shippingCost?: { value: string } }[];
          seller?: { username?: string };
          itemWebUrl: string;
        }[];
      };
      for (const it of body.itemSummaries ?? []) {
        rows.push({
          external_url: it.itemWebUrl,
          title: it.title,
          condition_grade: (it.condition ?? "used").toLowerCase(),
          item_price: Number(it.price?.value ?? 0),
          shipping_price: Number(it.shippingOptions?.[0]?.shippingCost?.value ?? 0),
          estimated_tax: 0,
          currency_code: it.price?.currency ?? "USD",
          seller_name: it.seller?.username ?? null,
          availability: "in_stock",
          listing_url: it.itemWebUrl,
          match_confidence: 0.6,
        });
      }
    }
    return rows;
  },
};

const ADAPTERS: SourceAdapter[] = [ebayAdapter];

export function adapterFor(marketplace: string | null | undefined): SourceAdapter | null {
  if (!marketplace) return null;
  return ADAPTERS.find((a) => a.marketplace === marketplace) ?? null;
}

export function adapterStatus(marketplace: string | null | undefined) {
  const adapter = adapterFor(marketplace);
  if (!adapter) return { registered: false, ready: false, missing: [] as string[] };
  const missing = adapter.requiredSecrets.filter((n) => !process.env[n]);
  return { registered: true, ready: missing.length === 0, missing };
}
