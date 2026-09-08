import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, forbidden, requireWorkspace } from "@/lib/quota.server";

/** Adapter readiness, safe to show in the UI: names of missing secrets only. */
export const getConnectorStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { adapterStatus } = await import("@/lib/connectors/registry.server");
  const marketplaces = ["amazon", "ebay", "shopify", "manual", "other", "comps"];
  return marketplaces.map((m) => ({ marketplace: m, ...adapterStatus(m) }));
});

/**
 * Runs a source refresh on demand.
 *
 * `data_sources` rows are global, so authorization is scoped to the workspace
 * the caller names: they must be an owner or admin *of that workspace*, and the
 * workspace must be on a plan that includes connector control. A per-source
 * rate limit protects the upstream marketplace API from repeated triggering,
 * and every attempt — including refusals — lands in the activity log.
 */
export const refreshSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ workspaceId: z.string().uuid(), sourceId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const ws = await requireWorkspace(context.supabase, context.userId, data.workspaceId, {
      write: true,
      minPlan: "business",
    });

    if (ws.role !== "owner" && ws.role !== "admin") {
      throw forbidden("Only workspace owners and admins can trigger a source refresh.");
    }

    const { data: source, error: sourceErr } = await context.supabase
      .from("data_sources")
      .select("id, name, active")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (sourceErr) throw new Error(sourceErr.message);
    if (!source) throw forbidden("Unknown data source.");
    if (!source.active) throw forbidden("This data source is not active.");

    await enforceRateLimit(
      context.supabase,
      `refresh:${data.sourceId}`,
      4,
      3600,
      "This source was refreshed recently. Connector refreshes are limited to 4 per hour.",
    );

    await context.supabase.rpc("log_activity", {
      _workspace_id: ws.workspaceId,
      _action: "source.refresh_requested",
      _target_type: "data_source",
      _target_id: data.sourceId,
      _metadata: { source: source.name } as never,
    });

    const { runSourceRefresh } = await import("@/lib/connectors/run.server");
    const result = await runSourceRefresh(data.sourceId);

    await context.supabase.rpc("log_activity", {
      _workspace_id: ws.workspaceId,
      _action: "source.refresh_completed",
      _target_type: "data_source",
      _target_id: data.sourceId,
      _metadata: { source: source.name, status: result.status } as never,
    });

    return result;
  });
