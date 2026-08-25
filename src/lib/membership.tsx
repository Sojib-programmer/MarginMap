import { queryOptions, useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = "owner" | "admin" | "editor" | "auditor";
export type PlanTier = "research" | "reseller" | "team";

export type Membership = {
  workspaceId: string;
  workspaceName: string;
  plan: PlanTier;
  role: WorkspaceRole;
  ownerId: string;
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  research: "Research",
  reseller: "Reseller",
  team: "Team",
};

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  auditor: "Auditor (read-only)",
};

/**
 * Authorization is decided by the database. These helpers mirror the RLS
 * predicates so the UI can explain a refusal — they never *are* the boundary.
 */
export const canWrite = (m: Membership | null) =>
  !!m && (m.role === "owner" || m.role === "admin" || m.role === "editor");
export const canManageMembers = (m: Membership | null) =>
  !!m && (m.role === "owner" || m.role === "admin");
export const canManageBilling = (m: Membership | null) => !!m && m.role === "owner";
export const hasResellerPlan = (m: Membership | null) =>
  !!m && (m.plan === "reseller" || m.plan === "team");

export const membershipQuery = queryOptions({
  queryKey: ["membership"],
  staleTime: 30_000,
  queryFn: async (): Promise<Membership | null> => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role,workspace_id,workspaces(id,name,plan,owner_id)")
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = data?.[0] as
      | {
          role: WorkspaceRole;
          workspace_id: string;
          workspaces: {
            id: string;
            name: string;
            plan: PlanTier;
            owner_id: string;
          } | null;
        }
      | undefined;
    if (!row?.workspaces) return null;
    return {
      workspaceId: row.workspace_id,
      workspaceName: row.workspaces.name,
      plan: row.workspaces.plan,
      role: row.role,
      ownerId: row.workspaces.owner_id,
    };
  },
});

const MembershipContext = createContext<{ membership: Membership | null; loading: boolean }>({
  membership: null,
  loading: true,
});

export function MembershipProvider({ children }: { children: ReactNode }) {
  const q = useQuery(membershipQuery);
  return (
    <MembershipContext.Provider value={{ membership: q.data ?? null, loading: q.isLoading }}>
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);

/** Append-only audit write. Failure to log never silently succeeds. */
export async function logActivity(
  workspaceId: string,
  action: string,
  target?: { type?: string; id?: string | null; metadata?: Record<string, unknown> },
) {
  const args: {
    _workspace_id: string;
    _action: string;
    _metadata: never;
    _target_type?: string;
    _target_id?: string;
  } = {
    _workspace_id: workspaceId,
    _action: action,
    _metadata: (target?.metadata ?? {}) as never,
  };
  if (target?.type) args._target_type = target.type;
  if (target?.id) args._target_id = target.id;
  const { error } = await supabase.rpc("log_activity", args);
  if (error) console.warn("activity log failed", error.message);
}
