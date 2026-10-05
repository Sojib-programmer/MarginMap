import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type Client = ReturnType<typeof createClient<Database>>;

export type GatewayOk = {
  status: 200;
  workspace_id: string;
  key_id: string;
  plan: "business" | "enterprise";
  burst_limit: number;
  monthly_limit: number;
  used: number;
};
type GatewayFail = {
  status: 401 | 403 | 429;
  error: string;
  retry_after?: number;
  burst_limit?: number;
  monthly_limit?: number;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** Publishable-key client: the gateway RPCs authenticate by API key, not session. */
export function publicClient(): Client {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function problem(status: number, title: string, extra: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    ...CORS,
    "content-type": "application/problem+json",
    "cache-control": "no-store",
  };
  if (typeof extra["retry_after"] === "number")
    headers["Retry-After"] = String(extra["retry_after"]);
  return new Response(JSON.stringify({ type: "about:blank", title, status, ...extra }), {
    status,
    headers,
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });

/**
 * Wraps a v1 endpoint: bearer key → gateway (auth, plan, burst, monthly quota)
 * → handler → request log. Handlers receive the verified workspace only.
 */
export async function withApiKey(
  request: Request,
  endpoint: string,
  handler: (ctx: { client: Client; token: string; gw: GatewayOk }) => Promise<unknown>,
): Promise<Response> {
  const started = Date.now();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return problem(401, "Missing bearer API key");

  const client = publicClient();
  const { data, error } = await client.rpc("api_gateway", { _token: token, _endpoint: endpoint });
  if (error) {
    console.error("api_gateway failed", error.message);
    return problem(503, "API gateway unavailable");
  }
  const gw = data as unknown as GatewayOk | GatewayFail;
  if (gw.status !== 200) {
    const { status, error: title, ...rest } = gw;
    return problem(status, title, rest);
  }

  const rateHeaders = {
    "RateLimit-Policy": `${gw.burst_limit};w=60`,
    "X-Quota-Limit": gw.monthly_limit < 0 ? "unlimited" : String(gw.monthly_limit),
    "X-Quota-Used": String(gw.used),
  };
  let status = 200;
  try {
    const body = await handler({ client, token, gw });
    return new Response(JSON.stringify({ data: body }), {
      status,
      headers: {
        ...CORS,
        ...rateHeaders,
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    status = 500;
    console.error(`api ${endpoint} failed`, e instanceof Error ? e.message : e);
    return problem(500, "Internal error");
  } finally {
    await client.rpc("api_log", {
      _token: token,
      _endpoint: endpoint,
      _status: status,
      _latency: Date.now() - started,
    });
  }
}
