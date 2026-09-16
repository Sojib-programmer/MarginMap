import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AdapterUnavailableError, adapterFor } from "@/lib/connectors/registry.server";

export type RefreshResult = {
  status: "success" | "skipped" | "error";
  rowsUpserted: number;
  deactivated: number;
  message: string;
};

/** Upstream errors can echo back credentials or signed URLs — never store them raw. */
export function redactError(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input);
  return raw
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/([?&](?:access_token|token|key|api[_-]?key|signature)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[redacted-token]")
    .slice(0, 500);
}

/** Offers not seen in this run are retired rather than left to rot as "current". */
const STALE_AFTER_HOURS = 24;

/**
 * Executes one refresh for a data source and records the attempt.
 *
 * Guarantees: at most one in-flight run per source, idempotent writes keyed on
 * (data_source_id, external_url), bounded runtime, stale-offer deactivation and
 * redacted error text. A source is only marked live after a run returns rows.
 */
export async function runSourceRefresh(sourceId: string): Promise<RefreshResult> {
  const { data: source, error: srcErr } = await supabaseAdmin
    .from("data_sources")
    .select("id,name,marketplace,active")
    .eq("id", sourceId)
    .maybeSingle();
  if (srcErr) throw new Error(srcErr.message);
  if (!source) throw new Error("Unknown data source");

  // Concurrency guard: a run started in the last 10 minutes and never finished
  // is treated as still in flight, so a retrying scheduler cannot double-write.
  const { data: inFlight } = await supabaseAdmin
    .from("source_refresh_runs")
    .select("id,started_at")
    .eq("data_source_id", sourceId)
    .is("finished_at", null)
    .gte("started_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(1);
  if (inFlight && inFlight.length > 0) {
    return {
      status: "skipped",
      rowsUpserted: 0,
      deactivated: 0,
      message: "A refresh for this source is already running.",
    };
  }

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
      deactivated: 0,
      message: `No live connector is registered for ${source.name}. This source remains a frozen snapshot.`,
    });
  }

  const startedAt = new Date().toISOString();

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

    // Idempotent write: the unique (data_source_id, external_url) index makes a
    // replayed run update the same rows instead of duplicating the catalog.
    const seen = new Set<string>();
    const payloads = rows
      .filter((r) => r.external_url && !seen.has(r.external_url) && seen.add(r.external_url))
      .map((r) => ({
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
      }));

    let upserted = 0;
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error: writeErr } = await supabaseAdmin
        .from("offers")
        .upsert(chunk, { onConflict: "data_source_id,external_url" });
      if (writeErr) throw new Error(writeErr.message);
      upserted += chunk.length;
    }

    // Retire listings this source stopped returning.
    let deactivated = 0;
    if (upserted > 0) {
      const cutoff = new Date(Date.now() - STALE_AFTER_HOURS * 3_600_000).toISOString();
      const { data: stale, error: staleErr } = await supabaseAdmin
        .from("offers")
        .update({ is_active: false })
        .eq("data_source_id", sourceId)
        .eq("is_active", true)
        .lt("retrieved_at", cutoff)
        .select("id");
      if (staleErr) throw new Error(staleErr.message);
      deactivated = stale?.length ?? 0;
    }

    await supabaseAdmin
      .from("data_sources")
      .update({
        last_refreshed_at: startedAt,
        last_error_at: null,
        last_error_text: null,
        is_live: upserted > 0,
      })
      .eq("id", sourceId);

    return finish({
      status: "success",
      rowsUpserted: upserted,
      deactivated,
      message: `${adapter.label}: ${upserted} offers refreshed${deactivated ? `, ${deactivated} retired` : ""}.`,
    });
  } catch (e) {
    const message = redactError(e);
    await supabaseAdmin
      .from("data_sources")
      .update({ last_error_at: new Date().toISOString(), last_error_text: message })
      .eq("id", sourceId);
    return finish({
      status: e instanceof AdapterUnavailableError ? "skipped" : "error",
      rowsUpserted: 0,
      deactivated: 0,
      message,
    });
  }
}
