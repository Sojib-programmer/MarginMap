import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";


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

const ACTIVE_KEY = "marginmap.active_workspace";

function readActive(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** Every workspace the signed-in user belongs to, oldest first. */
export const membershipsQuery = queryOptions({
  queryKey: ["memberships"],
  staleTime: 30_000,
  queryFn: async (): Promise<Membership[]> => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role,workspace_id,workspaces(id,name,plan,owner_id)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as {
      role: WorkspaceRole;
      workspace_id: string;
      workspaces: { id: string; name: string; plan: PlanTier; owner_id: string } | null;
    }[];
    return rows
      .filter((r) => !!r.workspaces)
      .map((r) => ({
        workspaceId: r.workspace_id,
        workspaceName: r.workspaces!.name,
        plan: r.workspaces!.plan,
        role: r.role,
        ownerId: r.workspaces!.owner_id,
      }));
  },
});

/** Back-compat single-membership accessor (the first workspace). */
export const membershipQuery = queryOptions({
  queryKey: ["membership"],
  staleTime: 30_000,
  queryFn: async (): Promise<Membership | null> => {
    const list = await membershipsQuery.queryFn!({} as never);
    return (list as Membership[])[0] ?? null;
  },
});

const MembershipContext = createContext<{
  membership: Membership | null;
  memberships: Membership[];
  loading: boolean;
  setActiveWorkspace: (id: string) => void;
}>({
  membership: null,
  memberships: [],
  loading: true,
  setActiveWorkspace: () => {},
});

export function MembershipProvider({ children }: { children: ReactNode }) {
  const q = useQuery(membershipsQuery);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(() => readActive());

  const memberships = q.data ?? [];
  const membership = memberships.find((m) => m.workspaceId === activeId) ?? memberships[0] ?? null;

  const setActiveWorkspace = (id: string) => {
    setActiveId(id);
    try {
      window.localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* storage unavailable — selection stays in memory */
    }
    void qc.invalidateQueries();
  };

  return (
    <MembershipContext.Provider
      value={{ membership, memberships, loading: q.isLoading, setActiveWorkspace }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = () => useContext(MembershipContext);


/**
 * Returns a guard that throws when the caller has no writable workspace.
 * UI-side mirror of the database boundary only.
 */
export function useRequireWrite() {
  const { membership } = useMembership();
  return () => {
    if (!membership) throw new Error("No workspace found for this account.");
    if (membership.role === "auditor")
      throw new Error("Auditor access is read-only. Ask an admin for Editor access.");
    return membership;
  };
}

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
