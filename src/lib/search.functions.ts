import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chargeQuota, enforceRateLimit, requireWorkspace } from "@/lib/quota.server";

const Input = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().trim().min(1).max(400),
  roleMode: z.enum(["buyer", "reseller"]),
  intent: z.record(z.string(), z.unknown()).optional(),
});

/**
 * The only path that records a search. The daily quota is charged here, before
 * the row is written; the `searches` INSERT policy additionally refuses any row
 * whose workspace has no charge recorded today, so the meter cannot be skipped
 * by talking to PostgREST directly.
 */
export const recordSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const ws = await requireWorkspace(context.supabase, context.userId, data.workspaceId, {
      write: true,
      ...(data.roleMode === "reseller" ? { minPlan: "pro" as const } : {}),
    });

    await enforceRateLimit(
      context.supabase,
      `search:${context.userId}`,
      30,
      60,
      "Too many searches in a short period. Wait a minute and try again.",
    );

    await chargeQuota(context.supabase, ws.workspaceId, "searches");

    const { data: row, error } = await context.supabase
      .from("searches")
      .insert({
        user_id: context.userId,
        workspace_id: ws.workspaceId,
        raw_query: data.query,
        role_mode: data.roleMode,
        parsed_intent: (data.intent ?? {}) as never,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.rpc("log_activity", {
      _workspace_id: ws.workspaceId,
      _action: "search.saved",
      _target_type: "search",
      _target_id: row.id,
      _metadata: { query: data.query, analysis_mode: data.roleMode } as never,
    });

    return { id: row.id as string };
  });
