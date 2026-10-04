import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/usage")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-gateway.server")).preflight(),
      GET: async ({ request }) => {
        const { withApiKey } = await import("@/lib/api-gateway.server");
        return withApiKey(request, "GET /v1/usage", async ({ gw }) => ({
          workspace_id: gw.workspace_id,
          plan: gw.plan,
          burst_limit_per_minute: gw.burst_limit,
          monthly_limit: gw.monthly_limit < 0 ? null : gw.monthly_limit,
          used_this_month: gw.used,
        }));
      },
    },
  },
});
