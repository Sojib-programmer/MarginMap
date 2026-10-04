import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/watchlists")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-gateway.server")).preflight(),
      GET: async ({ request }) => {
        const { withApiKey } = await import("@/lib/api-gateway.server");
        return withApiKey(request, "GET /v1/watchlists", async ({ client, token }) => {
          const { data, error } = await client.rpc("api_list_watchlists", { _token: token });
          if (error) throw new Error(error.message);
          return data;
        });
      },
    },
  },
});
