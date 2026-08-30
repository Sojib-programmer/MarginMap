import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Adapter readiness, safe to show in the UI: names of missing secrets only. */
export const getConnectorStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { adapterStatus } = await import("@/lib/connectors/registry.server");
  const marketplaces = ["amazon", "ebay", "shopify", "manual", "other", "comps"];
  return marketplaces.map((m) => ({ marketplace: m, ...adapterStatus(m) }));
});

/**
 * Runs a source refresh on demand. Only owners/admins of a workspace may trigger
 * it; the run is always recorded, including skipped and failed attempts.
 */
export const refreshSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sourceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleErr } = await context.supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["owner", "admin"]);
    if (roleErr) throw new Error(roleErr.message);
    if (!roles || roles.length === 0) {
      throw new Error("Only workspace owners and admins can trigger a source refresh.");
    }

    const { runSourceRefresh } = await import("@/lib/connectors/run.server");
    return runSourceRefresh(data.sourceId);
  });
