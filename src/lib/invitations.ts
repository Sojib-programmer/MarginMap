import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceRole } from "@/lib/membership";

export type InvitationRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export type MemberRow = {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  display_name: string | null;
};

const INVITE_COLS =
  "id,workspace_id,email,role,invited_by,created_at,expires_at,accepted_at,revoked_at";

/** Invitations issued inside a workspace (members can read them). */
export function workspaceInvitationsQuery(workspaceId: string | undefined) {
  return queryOptions({
    queryKey: ["workspace_invitations", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<InvitationRow[]> => {
      const { data, error } = await supabase
        .from("workspace_invitations")
        .select(INVITE_COLS)
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as InvitationRow[];
    },
  });
}

/**
 * Invitations addressed to the signed-in user's own email. RLS matches on the
 * verified JWT email, so this cannot be widened from the client.
 */
export function myInvitationsQuery(email: string | undefined) {
  return queryOptions({
    queryKey: ["my_invitations", email?.toLowerCase()],
    enabled: !!email,
    staleTime: 30_000,
    queryFn: async (): Promise<(InvitationRow & { workspace_name: string })[]> => {
      const { data, error } = await supabase
        .from("workspace_invitations")
        .select(`${INVITE_COLS},workspaces(name)`)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as (InvitationRow & { workspaces: { name: string } | null })[])
        .filter((r) => r.email.toLowerCase() === email!.toLowerCase())
        .map((r) => ({ ...r, workspace_name: r.workspaces?.name ?? "Workspace" }));
    },
  });
}

export function workspaceMembersQuery(workspaceId: string | undefined) {
  return queryOptions({
    queryKey: ["workspace_members_list", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id,user_id,role,created_at,profiles(display_name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as (Omit<MemberRow, "display_name"> & {
        profiles: { display_name: string | null } | null;
      })[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        created_at: r.created_at,
        display_name: r.profiles?.display_name ?? null,
      }));
    },
  });
}

export const INVITABLE_ROLES: { value: WorkspaceRole; help: string }[] = [
  { value: "admin", help: "Manages members and workspace settings." },
  { value: "editor", help: "Creates and edits workspace data." },
  { value: "auditor", help: "Read-only across the workspace." },
];

export function invitationState(inv: InvitationRow): "pending" | "accepted" | "revoked" | "expired" {
  if (inv.accepted_at) return "accepted";
  if (inv.revoked_at) return "revoked";
  if (+new Date(inv.expires_at) < Date.now()) return "expired";
  return "pending";
}
