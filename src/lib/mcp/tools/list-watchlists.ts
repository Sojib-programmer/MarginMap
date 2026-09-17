import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_watchlists",
  title: "List watchlists",
  description:
    "List the watchlists in one MarginMap workspace, including how many items each holds.",
  inputSchema: {
    workspace_id: z.string().uuid().describe("Workspace id from list_workspaces."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workspace_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated.");
    const supabase = supabaseForUser(ctx);

    const [lists, items] = await Promise.all([
      supabase
        .from("watchlists")
        .select("id, name, role_mode, created_at")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false }),
      supabase.from("watchlist_items").select("id, watchlist_id").eq("workspace_id", workspace_id),
    ]);
    if (lists.error) return errorResult(lists.error.message);
    if (items.error) return errorResult(items.error.message);

    const counts = new Map<string, number>();
    for (const it of items.data ?? []) {
      counts.set(it.watchlist_id, (counts.get(it.watchlist_id) ?? 0) + 1);
    }

    return jsonResult({
      watchlists: (lists.data ?? []).map((l) => ({ ...l, item_count: counts.get(l.id) ?? 0 })),
    });
  },
});
