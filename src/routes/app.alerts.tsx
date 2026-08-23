import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Disclaimer } from "@/components/primitives";
import { RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlertHits } from "@/hooks/use-alert-hits";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { money, relativeTime } from "@/lib/format";
import { alertsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/alerts")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const alerts = useQuery(alertsQuery);
  const catalog = useQuery(catalogQuery);
  const { rows: hitRows } = useAlertHits();
  const [variantId, setVariantId] = useState("");
  const [threshold, setThreshold] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["alerts"] });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      if (!variantId) throw new Error("Pick a product first");
      const { error } = await supabase.from("alerts").insert({
        user_id: auth.user.id,
        variant_id: variantId,
        rule_type: "landed_cost_below",
        rule_config: { threshold: Number(threshold) || 0 } as never,
        channel: "in_app",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Alert created");
      setThreshold("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("alerts").update({ enabled }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const variants = catalog.data?.variants ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="label-meta">Alerts</p>
        <h1 className="text-2xl font-semibold tracking-tight">Landed-cost triggers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alerts evaluate against landed cost from registered sources; they never place orders.
        </p>
      </header>

      <section className="panel grid gap-3 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <div>
          <Label className="label-meta">Product</Label>
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Choose a product" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.variantId} value={v.variantId}>
                  {v.productName} — {v.variantTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="label-meta">Landed cost below</Label>
          <Input
            className="num mt-1 h-9"
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
          Create alert
        </Button>
      </section>

      <ul className="space-y-2">
        {(alerts.data ?? []).map((a) => {
          const v = variants.find((x) => x.variantId === a.variant_id);
          const threshold = Number((a.rule_config as { threshold?: number })?.threshold ?? 0);
          const hitRow = hitRows.find((r) => r.alert.id === a.id);
          return (
            <li key={a.id} className="panel flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{v?.productName ?? "Unknown product"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip className="num">below {money(threshold)}</Chip>
                  <Chip>{a.channel.replace("_", " ")}</Chip>
                  {hitRow?.bestLanded != null ? (
                    <Chip className="num">best landed {money(hitRow.bestLanded)}</Chip>
                  ) : (
                    <Chip>no live offer</Chip>
                  )}
                  {hitRow?.hit ? <Chip tone="verified">target hit</Chip> : null}
                  {a.last_triggered_at ? (
                    <Chip tone="verified">triggered {relativeTime(a.last_triggered_at)}</Chip>
                  ) : null}
                </div>
              </div>
              <Switch
                checked={a.enabled}
                onCheckedChange={(enabled) => toggle.mutate({ id: a.id, enabled })}
                aria-label="Enable alert"
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-destructive"
                onClick={() => remove.mutate(a.id)}
              >
                Delete
              </Button>
            </li>
          );
        })}
        {(alerts.data ?? []).length === 0 ? (
          <li className="panel p-6 text-sm text-muted-foreground">No alerts yet.</li>
        ) : null}
      </ul>

      <Disclaimer />
    </div>
  );
}
