import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Query = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const Route = createFileRoute("/api/public/v1/products")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-gateway.server")).preflight(),
      GET: async ({ request }) => {
        const { withApiKey } = await import("@/lib/api-gateway.server");
        const url = new URL(request.url);
        const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json({ title: "Invalid query", status: 400 }, { status: 400 });
        }
        return withApiKey(request, "GET /v1/products", async ({ client }) => {
          let query = client
            .from("products")
            .select("id, slug, canonical_name, description, identity_confidence")
            .limit(parsed.data.limit);
          if (parsed.data.q) {
            const safe = parsed.data.q.replace(/[%_,()]/g, " ");
            query = query.ilike("canonical_name", `%${safe}%`);
          }
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          return { sample_data: true, products: data };
        });
      },
    },
  },
});
