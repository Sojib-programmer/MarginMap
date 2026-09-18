import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createWatchlistTool from "./tools/create-watchlist";
import listEvaluationsTool from "./tools/list-evaluations";
import listPipelineTool from "./tools/list-pipeline";
import listWatchlistsTool from "./tools/list-watchlists";
import listWorkspacesTool from "./tools/list-workspaces";

// The issuer must be the direct Supabase host; the project ref is the only
// Supabase value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "marginmap",
  title: "marginMap",
  version: "0.1.0",
  instructions:
    "Tools for MarginMap, a product-intelligence workspace. Start with `list_workspaces` to get a workspace id, then read watchlists, the sourcing pipeline and saved deal evaluations, or create a watchlist. All data is scoped to the signed-in user's workspace memberships. Catalog economics come from curated sample marketplace data, not a live feed.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listWorkspacesTool,
    listWatchlistsTool,
    listPipelineTool,
    listEvaluationsTool,
    createWatchlistTool,
  ],
});
