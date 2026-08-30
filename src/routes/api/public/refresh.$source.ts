import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Scheduled refresh endpoint. Called by pg_cron or an external scheduler with a
 * shared secret header; rejects everything else. The heavy lifting lives in the
 * connector runner so the manual in-app refresh and the scheduled run share one
 * code path and one audit record.
 */
export const Route = createFileRoute("/api/public/refresh/$source")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const secret = process.env["SOURCE_REFRESH_SECRET"];
        if (!secret) {
          return Response.json(
            { error: "Scheduled refresh is not configured (SOURCE_REFRESH_SECRET missing)." },
            { status: 503 },
          );
        }
        const provided = request.headers.get("x-refresh-secret") ?? "";
        const a = createHash("sha256").update(provided).digest();
        const b = createHash("sha256").update(secret).digest();
        if (!timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const sourceId = params.source;
        if (!/^[0-9a-f-]{36}$/i.test(sourceId)) {
          return Response.json({ error: "Invalid source id" }, { status: 400 });
        }

        try {
          const { runSourceRefresh } = await import("@/lib/connectors/run.server");
          const result = await runSourceRefresh(sourceId);
          return Response.json(result, { status: result.status === "error" ? 502 : 200 });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("scheduled refresh failed", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
