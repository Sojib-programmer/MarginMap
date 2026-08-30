import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { myInvitationsQuery } from "@/lib/invitations";
import { ROLE_LABEL, useMembership } from "@/lib/membership";

/**
 * Shows workspace invitations addressed to the signed-in user's verified email.
 * Accept/decline run as security-definer database functions that re-check the
 * email, expiry and role server-side.
 */
export function InvitationBanner() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { setActiveWorkspace } = useMembership();
  const invites = useQuery(myInvitationsQuery(user?.email ?? undefined));

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { data, error } = accept
        ? await supabase.rpc("accept_workspace_invitation", { _invitation_id: id })
        : await supabase.rpc("decline_workspace_invitation", { _invitation_id: id });
      if (error) throw new Error(error.message);
      return (data as string | null) ?? null;
    },
    onSuccess: (workspaceId, vars) => {
      void qc.invalidateQueries();
      if (vars.accept && workspaceId) {
        setActiveWorkspace(workspaceId);
        toast.success("Invitation accepted — you're now a member.");
      } else {
        toast.success("Invitation declined");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = invites.data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-border bg-primary/5 px-4 py-3">
      {rows.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
          <p>
            You've been invited to <span className="font-semibold">{i.workspace_name}</span> as{" "}
            <span className="font-semibold">{ROLE_LABEL[i.role]}</span>.
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: i.id, accept: true })}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: i.id, accept: false })}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
