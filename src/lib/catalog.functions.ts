import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { allowedMarketplaces } from "@/lib/entitlements";
import { requireWorkspace } from "@/lib/quota.server";

const input = z.object({ workspaceId: z.string().uuid() });

type Json = Record<string, unknown>;

export type RawCatalog = {
  variants: Json[];
  offers: Json[];
  comps: Json[];
  snapshots: Json[];
  sources: Json[];
};

/**
 * Server-side catalog read. The plan's marketplace allowance is applied here,
 * not in the browser: a Free workspace never receives offers from marketplaces
 * it is not entitled to see, and paused sources are excluded entirely.
 */
export const loadWorkspaceCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }): Promise<RawCatalog> => {
    const { supabase, userId } = context;
    const ws = await requireWorkspace(supabase, userId, data.workspaceId);

    const [variantsRes, offersRes, compsRes, snapsRes, sourcesRes] = await Promise.all([
      supabase
        .from("product_variants")
        .select(
          "id,title,canonical_key,attributes,gtin,sku_or_mpn,product_id,products(id,canonical_name,slug,description,specs,identity_confidence,brands(name),categories(name,slug))",
        ),
      supabase.from("offers").select("*").eq("is_active", true),
      supabase.from("sale_comps").select("*"),
      supabase.from("market_snapshots").select("*"),
      supabase.from("data_sources").select("*").eq("active", true),
    ]);

    const err =
      variantsRes.error || offersRes.error || compsRes.error || snapsRes.error || sourcesRes.error;
    if (err) throw new Error(err.message);

    const sources = (sourcesRes.data ?? []) as { id: string; marketplace: string | null }[];
    const available = [...new Set(sources.map((s) => s.marketplace ?? "other"))].sort();
    const allowed = new Set(allowedMarketplaces(ws.plan, available));

    const allowedSourceIds = new Set(
      sources.filter((s) => allowed.has(s.marketplace ?? "other")).map((s) => s.id),
    );

    const offers = ((offersRes.data ?? []) as { data_source_id: string }[]).filter((o) =>
      allowedSourceIds.has(o.data_source_id),
    );
    const comps = ((compsRes.data ?? []) as { data_source_id: string }[]).filter((c) =>
      allowedSourceIds.has(c.data_source_id),
    );

    return {
      variants: (variantsRes.data ?? []) as unknown as Json[],
      offers: offers as unknown as Json[],
      comps: comps as unknown as Json[],
      snapshots: (snapsRes.data ?? []) as unknown as Json[],
      sources: sources.filter((s) => allowed.has(s.marketplace ?? "other")) as unknown as Json[],
    };
  });
