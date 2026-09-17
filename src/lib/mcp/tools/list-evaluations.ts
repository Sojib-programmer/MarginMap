import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_deal_evaluations",
  title: "List deal evaluations",
  description:
    "List saved deal evaluations in one MarginMap workspace with their expected resale range, profit, ROI and confidence.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace id from list_workspaces."),
    limit: z.number().int().optional().describe("How many rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated.");
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("deal_evaluations")
      .select(
        "id, label, expected_sale_low, expected_sale_mid, expected_sale_high, net_proceeds, profit, roi_pct, days_to_sell_estimate, score, confidence, created_at",
      )
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return jsonResult({
      evaluations: data ?? [],
      note: "MarginMap economics are computed from curated sample marketplace data, not a live feed.",
    });
  },
});
