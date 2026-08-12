import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Disclaimer } from "@/components/primitives";
import { CardGridSkeleton, EmptyState, QueryBoundary, RouteError } from "@/components/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { money2, relativeTime } from "@/lib/format";
import { inventoryQuery, PIPELINE_STATUSES, STATUS_LABEL } from "@/lib/workspace";

export const Route = createFileRoute("/app/pipeline")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: PipelinePage,
});

function PipelinePage() {
  const qc = useQueryClient();
  const items = useQuery(inventoryQuery);

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ status: status as never })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory_items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory_items"] }),
  });

  const all = items.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="label-meta">Reseller · pipeline</p>
        <h1 className="text-2xl font-semibold tracking-tight">Sourcing to sold</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidates saved from the deal calculator, tracked through acquisition and sale.
        </p>
      </header>

      <QueryBoundary
        isLoading={items.isLoading}
        error={items.error}
        isEmpty={all.length === 0}
        skeleton={<CardGridSkeleton count={4} />}
        empty={
          <EmptyState
            title="Nothing in the pipeline"
            body="Run a deal through the calculator and send it here once the numbers work."
            action={
              <Button asChild size="sm">
                <Link to="/app/evaluate" search={{ offer: undefined }}>Open the deal calculator</Link>
              </Button>
            }
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_STATUSES.map((status) => {
            const group = all.filter((i) => i.status === status);
            return (
              <section key={status} className="panel p-3">
                <h2 className="label-meta">
                  {STATUS_LABEL[status]} · {group.length}
                </h2>
                <ul className="mt-2 space-y-2">
                  {group.map((item) => (
                    <li key={item.id} className="rounded-md border border-border bg-background p-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="num text-xs text-muted-foreground">
                        cost {money2(item.cost_basis ?? 0)}
                        {item.sold_price != null ? ` · sold ${money2(item.sold_price)}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        added {relativeTime(item.created_at)}
                      </p>
                      <Select
                        value={item.status}
                        onValueChange={(v) => update.mutate({ id: item.id, status: v })}
                      >
                        <SelectTrigger className="mt-2 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-7 w-full text-xs text-destructive"
                        onClick={() => remove.mutate(item.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                  {group.length === 0 ? (
                    <li className="text-xs text-muted-foreground">Empty</li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      </QueryBoundary>

      <Disclaimer />
    </div>
  );
}
