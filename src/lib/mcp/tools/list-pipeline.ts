import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { PIPELINE_STATUSES } from "@/lib/workspace";

import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pipeline",
  title: "List sourcing pipeline",
  description:
    "List inventory / sourcing pipeline items in one MarginMap workspace, optionally filtered by status (watch, researching, source_now, acquired, listed, sold, passed).",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace id from list_workspaces."),
    status: z.enum(PIPELINE_STATUSES).optional().describe("Optional pipeline status filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated.");
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("inventory_items")
      .select(
        "id, title, status, quantity, cost_basis, listed_price, sold_price, actual_profit, condition_grade, created_at",
      )
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ items: data ?? [] });
  },
});
