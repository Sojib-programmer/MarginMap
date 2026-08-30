import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { FreshnessChip } from "@/components/freshness";
import { Chip, Disclaimer } from "@/components/primitives";
import { PanelSkeleton, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { intervalLabel } from "@/lib/freshness";
import { relativeTime } from "@/lib/format";
import { canManageMembers, useMembership } from "@/lib/membership";
import { getConnectorStatus, refreshSource } from "@/lib/sources.functions";

export const Route = createFileRoute("/app/data-sources")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: DataSourcesPage,
});


type SourceRow = {
  id: string;
  name: string;
  source_type: string;
  marketplace: string | null;
  active: boolean;
  is_live: boolean;
  terms_url: string | null;
  attribution_text: string | null;
  refresh_interval_minutes: number | null;
  last_refreshed_at: string | null;
  last_error_at: string | null;
  last_error_text: string | null;
  snapshot_date: string | null;
};

type RunRow = {
  id: string;
  data_source_id: string;
  status: string;
  rows_upserted: number;
  error_text: string | null;
  started_at: string;
  finished_at: string | null;
};

function DataSourcesPage() {
  const qc = useQueryClient();
  const { membership } = useMembership();
  const canRefresh = canManageMembers(membership);
  const runRefresh = useServerFn(refreshSource);
  const connectorStatus = useServerFn(getConnectorStatus);

  const sources = useQuery({
    queryKey: ["data_sources_detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select(
          "id,name,source_type,marketplace,active,is_live,terms_url,attribution_text,refresh_interval_minutes,last_refreshed_at,last_error_at,last_error_text,snapshot_date",
        )
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as SourceRow[];
    },
  });

  const runs = useQuery({
    queryKey: ["source_refresh_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_refresh_runs")
        .select("id,data_source_id,status,rows_upserted,error_text,started_at,finished_at")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as RunRow[];
    },
  });

  const connectors = useQuery({
    queryKey: ["connector_status"],
    staleTime: 60_000,
    queryFn: () => connectorStatus(),
  });

  const refresh = useMutation({
    mutationFn: (sourceId: string) => runRefresh({ data: { sourceId } }),
    onSuccess: (res) => {
      if (res.status === "success") toast.success(res.message);
      else if (res.status === "skipped") toast.warning(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["data_sources_detail"] });
      void qc.invalidateQueries({ queryKey: ["source_refresh_runs"] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sources.isLoading) return <PanelSkeleton rows={6} />;
  if (sources.error) return <RouteError error={sources.error as Error} />;

  const rows = sources.data ?? [];
  const statusFor = (marketplace: string | null) =>
    (connectors.data ?? []).find((c) => c.marketplace === (marketplace ?? "other"));
  const runsFor = (id: string) => (runs.data ?? []).filter((r) => r.data_source_id === id);


  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="label-meta">Data sources</p>
        <h1 className="text-2xl font-semibold tracking-tight">Provenance & freshness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every number in this workspace traces to one of these registered sources. Live sources
          refresh on a stated cadence; sample sources are a frozen curated snapshot and are labeled
          as such everywhere they appear.
        </p>
      </header>

      <section className="panel divide-y divide-border">
        {rows.map((s) => (
          <article key={s.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{s.name}</h2>
                <Chip tone={s.is_live ? "verified" : "caution"}>
                  {s.is_live ? "live feed" : "sample snapshot"}
                </Chip>
                <Chip tone={s.active ? "neutral" : "destructive"}>
                  {s.active ? "active" : "paused"}
                </Chip>
                {s.marketplace ? <Chip tone="neutral">{s.marketplace}</Chip> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.source_type.replace(/_/g, " ")}
                {s.is_live
                  ? ` · refresh ${intervalLabel(s.refresh_interval_minutes)}`
                  : " · no automatic refresh (frozen snapshot)"}
                {s.snapshot_date ? ` · snapshot dated ${s.snapshot_date}` : ""}
                {s.last_refreshed_at
                  ? ` · last refreshed ${relativeTime(s.last_refreshed_at)}`
                  : ""}
              </p>
              {s.attribution_text ? (
                <p className="text-xs text-muted-foreground">{s.attribution_text}</p>
              ) : null}
              {s.last_error_text ? (
                <p className="text-xs text-destructive">
                  Last error {s.last_error_at ? relativeTime(s.last_error_at) : ""}:{" "}
                  {s.last_error_text}
                </p>
              ) : null}
              {s.terms_url ? (
                <a
                  href={s.terms_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-primary underline underline-offset-2"
                >
                  Source terms of use
                </a>
              ) : null}

              {(() => {
                const st = statusFor(s.marketplace);
                if (!st) return null;
                if (!st.registered)
                  return (
                    <p className="text-xs text-muted-foreground">
                      No live connector registered — snapshot only.
                    </p>
                  );
                return st.ready ? (
                  <p className="text-xs text-verified">
                    Connector registered and credentialed — refresh will pull live listings.
                  </p>
                ) : (
                  <p className="text-xs text-caution">
                    Connector registered, credentials missing ({st.missing.join(", ")}). Refresh
                    records a skipped run and changes no data.
                  </p>
                );
              })()}

              {runsFor(s.id).length > 0 ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Refresh history</summary>
                  <ul className="mt-1 space-y-1">
                    {runsFor(s.id)
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.id}>
                          {relativeTime(r.started_at)} · {r.status} · {r.rows_upserted} rows
                          {r.error_text ? ` · ${r.error_text}` : ""}
                        </li>
                      ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <div className="sm:text-right">
              <p className="num text-[11px] text-muted-foreground">
                {s.last_refreshed_at
                  ? new Date(s.last_refreshed_at).toLocaleString()
                  : (s.snapshot_date ?? "no retrieval timestamp")}
              </p>
              <FreshnessChip iso={s.last_refreshed_at ?? s.snapshot_date} className="mt-2" />
              {canRefresh ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-8 text-xs"
                  disabled={refresh.isPending}
                  onClick={() => refresh.mutate(s.id)}
                >
                  {refresh.isPending && refresh.variables === s.id ? "Refreshing…" : "Refresh now"}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </section>


      <p className="text-xs text-muted-foreground">
        Recommendations on evidence older than 7 days are automatically downgraded from Buy to
        Watch. That rule is enforced in the scoring engine, not by labeling alone.
      </p>

      <Disclaimer />
    </div>
  );
}
