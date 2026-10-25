import type { JsonValueInput, ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  return (globalThis as RuntimeGlobals).process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ]);
  if (direct) return direct;
  throw new Error("SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY is required");
}

/**
 * Forwards the verified OAuth bearer token so every MCP query runs under the
 * caller's own row-level security context — an assistant can never read or
 * write a workspace its user is not a member of.
 */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("This tool requires an authenticated MarginMap user.");
  return createClient<Database>(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Explicit membership check: RLS alone would return an empty set for a foreign
 * workspace, which agents misread as "empty". Returns a 403 result or null.
 */
export async function forbidUnlessMember(
  supabase: ReturnType<typeof supabaseForUser>,
  ctx: ToolContext,
  workspaceId: string,
) {
  const userId = ctx.getUserId();
  if (!userId) return errorResult("401 Unauthorized: no verified user on this token.");
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return errorResult(error.message);
  if (!data) {
    return errorResult(
      `403 Forbidden: you are not a member of workspace ${workspaceId}. Call list_workspaces for valid ids.`,
    );
  }
  return null;
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export function jsonResult(payload: JsonValueInput) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
