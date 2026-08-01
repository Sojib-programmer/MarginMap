import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { marketStats, type CompLike, type MarketStats, type OfferLike } from "./scoring";

export type Offer = {
  id: string;
  data_source_id: string;
  variant_id: string | null;
  title: string;
  condition_grade: string;
  condition_notes: string | null;
  item_price: number;
  shipping_price: number;
  estimated_tax: number;
  currency_code: string;
  seller_name: string | null;
  seller_rating: number | null;
  availability: string;
  location_text: string | null;
  listing_url: string | null;
  listed_at: string | null;
  retrieved_at: string;
  match_confidence: number;
  is_active: boolean;
} & OfferLike;

export type Comp = {
  id: string;
  variant_id: string | null;
  title: string;
  sold_price: number;
  shipping_paid: number;
  sold_at: string;
  condition_grade: string;
  match_confidence: number;
  is_verified_completed_sale: boolean;
  sale_url: string | null;
  data_source_id: string;
} & CompLike;

export type Snapshot = {
  variant_id: string;
  active_listing_count: number;
  completed_sale_count: number;
  median_sold_price: number | null;
  low_sold_price: number | null;
  high_sold_price: number | null;
  days_to_sell_estimate: number | null;
  data_confidence: number;
  computed_at: string;
  period_start: string;
  period_end: string;
};

export type DataSource = {
  id: string;
  name: string;
  source_type: string;
  terms_url: string | null;
  attribution_text: string | null;
  base_url: string | null;
  refresh_policy: string | null;
  active: boolean;
};

export type VariantIntel = {
  variantId: string;
  variantTitle: string;
  canonicalKey: string;
  attributes: Record<string, unknown>;
  gtin: string | null;
  sku: string | null;
  productId: string;
  productName: string;
  slug: string;
  description: string | null;
  specs: Record<string, unknown>;
  identityConfidence: number;
  brand: string;
  category: string;
  categorySlug: string;
  offers: Offer[];
  comps: Comp[];
  snapshot: Snapshot | null;
  stats: MarketStats;
};

export type CatalogData = {
  variants: VariantIntel[];
  sources: DataSource[];
};

async function loadCatalog(): Promise<CatalogData> {
  const [variantsRes, offersRes, compsRes, snapsRes, sourcesRes] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id,title,canonical_key,attributes,gtin,sku_or_mpn,product_id,products(id,canonical_name,slug,description,specs,identity_confidence,brands(name),categories(name,slug))",
      ),
    supabase.from("offers").select("*").eq("is_active", true),
    supabase.from("sale_comps").select("*"),
    supabase.from("market_snapshots").select("*"),
    supabase.from("data_sources").select("*"),
  ]);

  const err =
    variantsRes.error || offersRes.error || compsRes.error || snapsRes.error || sourcesRes.error;
  if (err) throw new Error(err.message);

  const offers = (offersRes.data ?? []) as unknown as Offer[];
  const comps = (compsRes.data ?? []) as unknown as Comp[];
  const snaps = (snapsRes.data ?? []) as unknown as Snapshot[];

  const variants: VariantIntel[] = (variantsRes.data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      title: string;
      canonical_key: string;
      attributes: Record<string, unknown>;
      gtin: string | null;
      sku_or_mpn: string | null;
      product_id: string;
      products: {
        id: string;
        canonical_name: string;
        slug: string;
        description: string | null;
        specs: Record<string, unknown>;
        identity_confidence: number;
        brands: { name: string } | null;
        categories: { name: string; slug: string } | null;
      } | null;
    };
    const variantComps = comps.filter((c) => c.variant_id === r.id);
    return {
      variantId: r.id,
      variantTitle: r.title,
      canonicalKey: r.canonical_key,
      attributes: r.attributes ?? {},
      gtin: r.gtin,
      sku: r.sku_or_mpn,
      productId: r.product_id,
      productName: r.products?.canonical_name ?? "Unknown product",
      slug: r.products?.slug ?? "unknown",
      description: r.products?.description ?? null,
      specs: r.products?.specs ?? {},
      identityConfidence: Number(r.products?.identity_confidence ?? 0.8),
      brand: r.products?.brands?.name ?? "Unbranded",
      category: r.products?.categories?.name ?? "Uncategorized",
      categorySlug: r.products?.categories?.slug ?? "uncategorized",
      offers: offers
        .filter((o) => o.variant_id === r.id)
        .sort((a, b) => Number(a.item_price) - Number(b.item_price)),
      comps: variantComps.sort((a, b) => +new Date(b.sold_at) - +new Date(a.sold_at)),
      snapshot: snaps.find((s) => s.variant_id === r.id) ?? null,
      stats: marketStats(variantComps),
    };
  });

  return { variants, sources: (sourcesRes.data ?? []) as unknown as DataSource[] };
}

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: loadCatalog,
  staleTime: 60_000,
});

export function liquidityOf(v: VariantIntel) {
  return {
    activeListings: v.snapshot?.active_listing_count ?? Math.max(1, v.offers.length * 6),
    completedSales: v.snapshot?.completed_sale_count ?? v.comps.length,
    daysToSell: v.snapshot?.days_to_sell_estimate ?? 30,
  };
}
