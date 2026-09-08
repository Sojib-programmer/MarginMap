import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { parsePlanError, type PlanTier } from "@/lib/entitlements";

type Client = SupabaseClient<Database>;

/** Error codes the UI maps onto 402 / 403 / 429 semantics. */
export const ERR = {
  forbidden: "FORBIDDEN",
  payment: "PAYMENT_REQUIRED",
  rate: "TOO_MANY_REQUESTS",
} as const;

export function forbidden(message: string) {
  return new Error(`${ERR.forbidden}: ${message}`);
}
export function paymentRequired(message: string) {
  return new Error(`${ERR.payment}: ${message}`);
}
export function rateLimited(message: string) {
  return new Error(`${ERR.rate}: ${message}`);
}

export type WorkspaceContext = {
  workspaceId: string;
  role: Database["public"]["Enums"]["workspace_role"];
  plan: PlanTier;
};

/**
 * Resolves the caller's membership in one specific workspace. Every mutating
 * server function goes through this: the workspace id arrives from the client,
 * so it must be proven, never trusted.
 */
export async function requireWorkspace(
  supabase: Client,
  userId: string,
  workspaceId: string,
  opts: { write?: boolean; minPlan?: PlanTier } = {},
): Promise<WorkspaceContext> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(plan)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw forbidden("You are not a member of this workspace.");

  const role = data.role;
  if (opts.write && role === "auditor") {
    throw forbidden("Auditor access is read-only. Ask an admin for Editor access.");
  }

  const plan = ((data.workspaces as { plan?: string } | null)?.plan ?? "free") as PlanTier;

  if (opts.minPlan) {
    const rank = { free: 0, pro: 1, business: 2, enterprise: 3 } as const;
    if (rank[plan] < rank[opts.minPlan]) {
      throw paymentRequired(`This feature requires the ${opts.minPlan} plan.`);
    }
  }

  return { workspaceId, role, plan };
}

/** Fixed-window limiter backed by public.rate_limits. Fails closed. */
export async function enforceRateLimit(
  supabase: Client,
  key: string,
  limit: number,
  windowSeconds: number,
  message: string,
) {
  const { data, error } = await supabase.rpc("hit_rate_limit", {
    _key: key,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  if (data === false) throw rateLimited(message);
}

/** Charges a metered unit; translates database plan errors into upgrade copy. */
export async function chargeQuota(
  supabase: Client,
  workspaceId: string,
  metric: "searches" | "api_calls",
  amount = 1,
) {
  const { error } = await supabase.rpc("consume_quota", {
    _workspace_id: workspaceId,
    _metric: metric,
    _amount: amount,
  });
  if (error) {
    const readable = parsePlanError(error.message);
    if (readable) throw paymentRequired(readable);
    throw new Error(error.message);
  }
}
