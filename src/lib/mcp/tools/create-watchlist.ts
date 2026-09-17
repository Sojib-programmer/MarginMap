import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_watchlist",
  title: "Create a watchlist",
  description:
    "Create a new watchlist in one MarginMap workspace. Requires write access in that workspace; auditors are rejected by the database.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace id from list_workspaces."),
    name: z.string().trim().describe("Watchlist name as the user would read it."),
    role_mode: z
      .enum(["buyer", "reseller"])
      .optional()
      .describe("Buyer or reseller lens for this list. Defaults to buyer."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ workspace_id, name, role_mode }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated.");
    const clean = name.slice(0, 80);
    if (!clean) return errorResult("A watchlist name is required.");

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("watchlists")
      .insert({
        workspace_id,
        user_id: ctx.getUserId() ?? "",
        name: clean,
        role_mode: role_mode ?? "buyer",
      })
      .select("id, name, role_mode, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ watchlist: data });
  },
});
