import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/format";
import {
  INVITABLE_ROLES,
  invitationState,
  workspaceInvitationsQuery,
  workspaceMembersQuery,
} from "@/lib/invitations";
import {
  canManageMembers,
  logActivity,
  ROLE_LABEL,
  useMembership,
  type WorkspaceRole,
} from "@/lib/membership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Workspace membership management. Every action here is also enforced by RLS —
 * admins cannot grant ownership, and auditors cannot reach these mutations at all.
 */
export function MembersPanel() {
  const { membership } = useMembership();
  const { user } = useSession();
  const qc = useQueryClient();
  const manage = canManageMembers(membership);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");

  const members = useQuery(workspaceMembersQuery(membership?.workspaceId));
  const invitations = useQuery(workspaceInvitationsQuery(membership?.workspaceId));

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["workspace_members_list"] });
    void qc.invalidateQueries({ queryKey: ["workspace_invitations"] });
    void qc.invalidateQueries({ queryKey: ["activity"] });
  };

  const invite = useMutation({
    mutationFn: async () => {
      if (!membership || !user) throw new Error("No workspace");
      const addr = email.trim().toLowerCase();
      if (!EMAIL_RE.test(addr)) throw new Error("Enter a valid email address");
      const { data, error } = await supabase
        .from("workspace_invitations")
        .insert({
          workspace_id: membership.workspaceId,
          email: addr,
          role,
          invited_by: user.id,
        })
        .select("id")
        .single();
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "There is already a pending invitation for that email."
            : error.message,
        );
      }
      await logActivity(membership.workspaceId, "invitation.sent", {
        type: "workspace_invitation",
        id: data.id,
        metadata: { email: addr, role },
      });
    },
    onSuccess: () => {
      setEmail("");
      toast.success("Invitation created. The invitee sees it when they sign in.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      if (!membership) throw new Error("No workspace");
      const { error } = await supabase
        .from("workspace_invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(membership.workspaceId, "invitation.revoked", {
        type: "workspace_invitation",
        id,
      });
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: WorkspaceRole }) => {
      if (!membership) throw new Error("No workspace");
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: next })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(membership.workspaceId, "member.role_changed", {
        type: "workspace_member",
        id,
        metadata: { role: next },
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      if (!membership) throw new Error("No workspace");
      const { error } = await supabase.from("workspace_members").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(membership.workspaceId, "member.removed", {
        type: "workspace_member",
        id,
      });
    },
    onSuccess: () => {
      toast.success("Member removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!membership) return null;

  const pending = (invitations.data ?? []).filter((i) => invitationState(i) === "pending");
  const history = (invitations.data ?? []).filter((i) => invitationState(i) !== "pending");

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Members of {membership.workspaceName}</h2>
        <Chip tone="neutral">{ROLE_LABEL[membership.role]}</Chip>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Invitations are in-app: the invitee sees a banner the next time they sign in with the
        invited email. No email is sent and no invite link is generated.
      </p>

      <ul className="mt-3 divide-y divide-border">
        {(members.data ?? []).map((m) => {
          const self = m.user_id === user?.id;
          const locked = m.role === "owner" || self || !manage;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-medium">
                {m.display_name ?? "Member"}
                {self ? " (you)" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                joined {relativeTime(m.created_at)}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {locked ? (
                  <Chip tone="neutral">{ROLE_LABEL[m.role]}</Chip>
                ) : (
                  <>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        changeRole.mutate({ id: m.id, next: v as WorkspaceRole })
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {ROLE_LABEL[r.value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => removeMember.mutate(m.id)}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {manage ? (
        <div className="mt-4 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
          <div>
            <Label className="label-meta">Invite by email</Label>
            <Input
              className="mt-1 h-9"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="label-meta">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {ROLE_LABEL[r.value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => invite.mutate()} disabled={invite.isPending}>
            Send invitation
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {INVITABLE_ROLES.find((r) => r.value === role)?.help} Ownership can never be granted by
            invitation.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Only owners and admins can invite or change roles.
        </p>
      )}

      {pending.length > 0 ? (
        <div className="mt-4">
          <h3 className="label-meta">Pending invitations</h3>
          <ul className="mt-1 divide-y divide-border">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="font-medium">{i.email}</span>
                <Chip tone="caution">{ROLE_LABEL[i.role]}</Chip>
                <span className="text-xs text-muted-foreground">
                  invited {relativeTime(i.created_at)} · expires {relativeTime(i.expires_at)}
                </span>
                {manage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-8 text-xs"
                    onClick={() => revoke.mutate(i.id)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4">
          <h3 className="label-meta">Invitation history</h3>
          <ul className="mt-1 space-y-1">
            {history.slice(0, 8).map((i) => (
              <li key={i.id} className="text-xs text-muted-foreground">
                {i.email} · {ROLE_LABEL[i.role]} · {invitationState(i)}{" "}
                {relativeTime(i.accepted_at ?? i.revoked_at ?? i.expires_at)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
