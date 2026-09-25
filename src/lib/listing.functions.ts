import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adapterStatus, fetchWithRetry } from "@/lib/connectors/registry.server";
import { enforceRateLimit, requireWorkspace } from "@/lib/quota.server";

const Input = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().trim().min(8).max(2000).url(),
});

export type ResolvedListing = {
  /** Marketplace inferred from the hostname, or null when unrecognised. */
  marketplace: string | null;
  marketplaceLabel: string;
  itemId: string | null;
  /** True when the listing's own numbers were retrieved from the marketplace. */
  resolved: boolean;
  /** Plain-language explanation shown when `resolved` is false. */
  reason: string | null;
  title: string | null;
  itemPrice: number | null;
  shippingPrice: number | null;
  currencyCode: string | null;
  conditionGrade: string | null;
  sellerName: string | null;
  listingUrl: string;
  retrievedAt: string | null;
};

const MARKETPLACE_BY_HOST: { match: RegExp; marketplace: string; label: string }[] = [
  { match: /(^|\.)ebay\./i, marketplace: "ebay", label: "eBay" },
  { match: /(^|\.)amazon\./i, marketplace: "amazon", label: "Amazon" },
  { match: /(^|\.)myshopify\.com$/i, marketplace: "shopify", label: "Shopify store" },
  { match: /(^|\.)mercari\./i, marketplace: "mercari", label: "Mercari" },
  { match: /(^|\.)etsy\./i, marketplace: "etsy", label: "Etsy" },
];

/** eBay item pages carry the numeric legacy id as the last long digit run. */
function ebayItemId(url: URL): string | null {
  const fromPath = url.pathname.match(/(\d{9,15})(?:\D|$)/);
  if (fromPath?.[1]) return fromPath[1];
  const fromQuery = url.searchParams.get("item");
  return fromQuery && /^\d{9,15}$/.test(fromQuery) ? fromQuery : null;
}

function ebayConditionGrade(condition: string | undefined): string {
  const c = (condition ?? "").toLowerCase();
  if (c.includes("new") && c.includes("other")) return "open_box";
  if (c.includes("sealed") || c === "new") return "new_sealed";
  if (c.includes("open box")) return "open_box";
  if (c.includes("refurb")) return "refurbished";
  if (c.includes("parts")) return "for_parts";
  if (c.includes("very good") || c.includes("excellent")) return "used_excellent";
  if (c.includes("good")) return "used_good";
  if (c.includes("acceptable") || c.includes("fair")) return "used_fair";
  return "used_good";
}

async function ebayAccessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env["EBAY_CLIENT_ID"]}:${process.env["EBAY_CLIENT_SECRET"]}`,
  ).toString("base64");
  const res = await fetchWithRetry("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  // Status only: upstream bodies can echo credentials back.
  if (!res.ok) throw new Error(`eBay token request failed [${res.status}]`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Resolves a pasted marketplace listing into the numbers the deal calculator
 * needs. When the marketplace cannot be queried (no credentials, unsupported
 * site, or an item id we cannot parse) it says so plainly and returns nulls —
 * it never guesses a price.
 */
export const resolveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<ResolvedListing> => {
    await requireWorkspace(context.supabase, context.userId, data.workspaceId);
    await enforceRateLimit(
      context.supabase,
      `listing:${context.userId}`,
      20,
      60,
      "Too many listing lookups in a short period. Wait a minute and try again.",
    );

    let url: URL;
    try {
      url = new URL(data.url);
    } catch {
      throw new Error("That does not look like a listing address.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("That does not look like a listing address.");
    }

    const hit = MARKETPLACE_BY_HOST.find((m) => m.match.test(url.hostname));
    const base: ResolvedListing = {
      marketplace: hit?.marketplace ?? null,
      marketplaceLabel: hit?.label ?? url.hostname.replace(/^www\./, ""),
      itemId: null,
      resolved: false,
      reason: null,
      title: null,
      itemPrice: null,
      shippingPrice: null,
      currencyCode: null,
      conditionGrade: null,
      sellerName: null,
      listingUrl: url.toString(),
      retrievedAt: null,
    };

    const { extractListingWithFirecrawl, captureServerEvent, firecrawlConfigured } =
      await import("@/lib/integrations.server");

    const viaFirecrawl = async (itemId: string | null, fallbackReason: string) => {
      if (!firecrawlConfigured()) return { ...base, itemId, reason: fallbackReason };
      try {
        const x = await extractListingWithFirecrawl(url.toString());
        if (!x) {
          void captureServerEvent(context.userId, "listing_lookup", {
            marketplace: base.marketplace,
            via: "firecrawl",
            resolved: false,
          });
          return {
            ...base,
            itemId,
            reason: `Could not read a price from that ${base.marketplaceLabel} page. Enter the price and shipping below.`,
          };
        }
        void captureServerEvent(context.userId, "listing_lookup", {
          marketplace: base.marketplace,
          via: "firecrawl",
          resolved: true,
        });
        return {
          ...base,
          itemId,
          resolved: true,
          title: x.title,
          itemPrice: x.itemPrice,
          shippingPrice: x.shippingPrice,
          currencyCode: x.currencyCode,
          conditionGrade: ebayConditionGrade(x.condition ?? undefined),
          sellerName: x.sellerName,
          retrievedAt: new Date().toISOString(),
          reason: "Read from the public listing page — check the numbers before you commit.",
        };
      } catch {
        return { ...base, itemId, reason: fallbackReason };
      }
    };

    if (hit?.marketplace !== "ebay") {
      return viaFirecrawl(
        null,
        `Automatic lookup is not available for ${base.marketplaceLabel} yet. Enter the price and shipping below and the evaluation runs the same way.`,
      );
    }

    const itemId = ebayItemId(url);
    if (!itemId) {
      return viaFirecrawl(
        null,
        "Could not read an item number from that eBay address. Enter the price and shipping below.",
      );
    }

    const status = adapterStatus("ebay");
    if (!status.ready) {
      return viaFirecrawl(
        itemId,
        "Live eBay lookup is not switched on for this project yet. Enter the price and shipping below and the evaluation runs the same way.",
      );
    }

    try {
      const token = await ebayAccessToken();
      const res = await fetchWithRetry(
        `https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(itemId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        return {
          ...base,
          itemId,
          reason: `eBay did not return that listing [${res.status}]. Enter the price and shipping below.`,
        };
      }
      const body = (await res.json()) as {
        title?: string;
        condition?: string;
        price?: { value?: string; currency?: string };
        shippingOptions?: { shippingCost?: { value?: string } }[];
        seller?: { username?: string };
        itemWebUrl?: string;
      };
      return {
        ...base,
        itemId,
        resolved: true,
        title: body.title ?? null,
        itemPrice: Number(body.price?.value ?? 0) || null,
        shippingPrice: Number(body.shippingOptions?.[0]?.shippingCost?.value ?? 0),
        currencyCode: body.price?.currency ?? "USD",
        conditionGrade: ebayConditionGrade(body.condition),
        sellerName: body.seller?.username ?? null,
        listingUrl: body.itemWebUrl ?? url.toString(),
        retrievedAt: new Date().toISOString(),
      };
    } catch {
      return {
        ...base,
        itemId,
        reason: "The eBay lookup did not answer in time. Enter the price and shipping below.",
      };
    }
  });
