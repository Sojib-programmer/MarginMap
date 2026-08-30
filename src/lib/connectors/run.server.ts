import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AdapterUnavailableError, adapterFor } from "@/lib/connectors/registry.server";

export type RefreshResult = {
  status: "success" | "skipped" | "error";
  rowsUpserted: number;
  message: string;
};

/**
 * Executes one refresh for a data source and records the attempt. A source is
 * only marked live after a run actually returns rows — a missing adapter or
 * missing credentials produces a recorded "skipped" run and changes no data.
 */
export async function runSourceRefresh(sourceId: string): Promise<RefreshResult> {
  const { data: source, error: srcErr } = await supabaseAdmin
    .from("data_sources")
    .select("id,name,marketplace,active")
    .eq("id", sourceId)
    .maybeSingle();
  if (srcErr) throw new Error(srcErr.message);
  if (!source) throw new Error("Unknown data source");

  const { data: run, error: runErr } = await supabaseAdmin
    .from("source_refresh_runs")
    .insert({ data_source_id: sourceId, status: "running" })
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);

  const finish = async (result: RefreshResult) => {
    await supabaseAdmin
      .from("source_refresh_runs")
      .update({
        status: result.status,
        rows_upserted: result.rowsUpserted,
        error_text: result.status === "success" ? null : result.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return result;
  };

  const adapter = adapterFor(source.marketplace);
  if (!adapter) {
    return finish({
      status: "skipped",
      rowsUpserted: 0,
      message: `No live connector is registered for ${source.name}. This source remains a frozen snapshot.`,
    });
  }

  try {
    const { data: variants, error: varErr } = await supabaseAdmin
      .from("product_variants")
      .select("id,title,canonical_key")
      .limit(20);
    if (varErr) throw new Error(varErr.message);

    const rows = await adapter.fetchOffers({
      queries: (variants ?? []).map((v) => v.title),
      limit: 10,
    });

    let upserted = 0;
    for (const r of rows) {
      const { data: existing } = await supabaseAdmin
        .from("offers")
        .select("id")
        .eq("data_source_id", sourceId)
        .eq("external_url", r.external_url)
        .maybeSingle();

      const payload = {
        data_source_id: sourceId,
        external_url: r.external_url,
        title: r.title,
        condition_grade: r.condition_grade,
        item_price: r.item_price,
        shipping_price: r.shipping_price,
        estimated_tax: r.estimated_tax,
        currency_code: r.currency_code,
        seller_name: r.seller_name,
        availability: r.availability,
        listing_url: r.listing_url,
        match_confidence: r.match_confidence,
        retrieved_at: new Date().toISOString(),
        is_active: true,
      };

      const { error: writeErr } = existing
        ? await supabaseAdmin.from("offers").update(payload).eq("id", existing.id)
        : await supabaseAdmin.from("offers").insert(payload);
      if (writeErr) throw new Error(writeErr.message);
      upserted += 1;
    }

    await supabaseAdmin
      .from("data_sources")
      .update({
        last_refreshed_at: new Date().toISOString(),
        last_error_at: null,
        last_error_text: null,
        is_live: upserted > 0,
      })
      .eq("id", sourceId);

    return finish({
      status: "success",
      rowsUpserted: upserted,
      message: `${adapter.label}: ${upserted} offers refreshed.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("data_sources")
      .update({ last_error_at: new Date().toISOString(), last_error_text: message })
      .eq("id", sourceId);
    return finish({
      status: e instanceof AdapterUnavailableError ? "skipped" : "error",
      rowsUpserted: 0,
      message,
    });
  }
}
