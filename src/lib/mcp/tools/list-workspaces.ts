import { defineTool } from "@lovable.dev/mcp-js";

import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_workspaces",
  title: "List workspaces",
  description:
    "List the MarginMap workspaces the signed-in user belongs to, with their role and plan. Workspace ids from here are the input for the other tools.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(name, plan)")
      .eq("user_id", ctx.getUserId() ?? "");
    if (error) return errorResult(error.message);
    return jsonResult({
      workspaces: (data ?? []).map((m) => ({
        workspace_id: m.workspace_id,
        role: m.role,
        name: (m.workspaces as { name?: string } | null)?.name ?? null,
        plan: (m.workspaces as { plan?: string } | null)?.plan ?? null,
      })),
    });
  },
});
