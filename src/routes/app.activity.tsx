import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Chip, Disclaimer } from "@/components/primitives";
import { EmptyState, PanelSkeleton, RouteError } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/format";
import { useMembership } from "@/lib/membership";

export const Route = createFileRoute("/app/activity")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: ActivityPage,
});

type ActivityRow = {
  id: string;
  action: string;
  target_type: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function ActivityPage() {
  const { membership } = useMembership();

  const log = useQuery({
    queryKey: ["activity", membership?.workspaceId],
    enabled: !!membership,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id,action,target_type,actor_id,metadata,created_at")
        .eq("workspace_id", membership!.workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as ActivityRow[];
    },
  });

  const profiles = useQuery({
    queryKey: ["workspace_profiles", membership?.workspaceId],
    enabled: !!membership,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id,profiles(display_name)")
        .eq("workspace_id", membership!.workspaceId);
      if (error) throw new Error(error.message);
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        const r = row as unknown as {
          user_id: string;
          profiles: { display_name: string | null } | null;
        };
        map.set(r.user_id, r.profiles?.display_name ?? "Unknown member");
      }
      return map;
    },
  });

  if (log.isLoading) return <PanelSkeleton rows={8} />;
  if (log.error) return <RouteError error={log.error as Error} />;

  const rows = log.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="label-meta">Activity</p>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace audit trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only record of workspace actions with per-member attribution. Entries cannot be
          edited or deleted — the database rejects both.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Actions like saving searches, editing watchlists and changing pipeline status appear here with the member who performed them."
        />
      ) : (
        <section className="panel divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <Chip tone="neutral" className="font-mono text-[11px]">
                {row.action}
              </Chip>
              <p className="min-w-0 flex-1 truncate text-sm">
                {typeof row.metadata?.["label"] === "string"
                  ? (row.metadata["label"] as string)
                  : null}
                {typeof row.metadata?.["query"] === "string"
                  ? (row.metadata["query"] as string)
                  : null}
                {row.target_type ? (
                  <span className="text-muted-foreground"> · {row.target_type}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.actor_id ? (profiles.data?.get(row.actor_id) ?? "Former member") : "System"}
              </p>
              <p className="num text-xs text-muted-foreground">{relativeTime(row.created_at)}</p>
            </div>
          ))}
        </section>
      )}

      <Disclaimer />
    </div>
  );
}
