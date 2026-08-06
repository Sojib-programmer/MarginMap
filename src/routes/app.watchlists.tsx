import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Disclaimer, ValueCell } from "@/components/primitives";
import { EmptyState, PanelSkeleton, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWatchlist } from "@/hooks/use-workspace-actions";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { money, relativeTime } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import { landedCost } from "@/lib/scoring";
import { watchlistItemsQuery, watchlistsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/watchlists")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: WatchlistsPage,
});

function WatchlistsPage() {
  const { mode } = useRoleMode();
  const qc = useQueryClient();
  const lists = useQuery(watchlistsQuery);
  const items = useQuery(watchlistItemsQuery);
  const catalog = useQuery(catalogQuery);
  const [name, setName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["watchlists"] });
    qc.invalidateQueries({ queryKey: ["watchlist_items"] });
  };

  const createList = useCreateWatchlist();

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlists").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Watchlist deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const variantById = (id: string | null) =>
    catalog.data?.variants.find((v) => v.variantId === id) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="label-meta">Watchlists</p>
        <h1 className="text-2xl font-semibold tracking-tight">Tracked products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Target prices are compared against the current best landed cost, not the sticker price.
        </p>
      </header>

      <div className="panel flex flex-wrap items-center gap-2 p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New watchlist name"
          className="h-9 max-w-xs"
          aria-label="New watchlist name"
        />
        <Button
          size="sm"
          disabled={createList.isPending}
          onClick={() =>
            createList.mutate({ name, mode }, { onSuccess: () => setName("") })
          }
        >
          Create list
        </Button>
      </div>

      <QueryBoundary
        isLoading={lists.isLoading || items.isLoading}
        error={lists.error ?? items.error}
        isEmpty={(lists.data ?? []).length === 0}
        skeleton={<PanelSkeleton rows={4} />}
        empty={
          <EmptyState
            title="No watchlists yet"
            body="Create a list above, then add offers from search, compare or any product intel page."
            action={
              <Button asChild size="sm">
                <Link to="/app/search" search={{ q: "" }}>
                  Find something to track
                </Link>
              </Button>
            }
          />
        }
      >
        <div className="space-y-5">
          {(lists.data ?? []).map((list) => {
            const listItems = (items.data ?? []).filter((i) => i.watchlist_id === list.id);
            return (
              <section key={list.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">{list.name}</h2>
                    <p className="label-meta">
                      {list.role_mode} · {listItems.length} items · created{" "}
                      {relativeTime(list.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteList.mutate(list.id)}
                    className="text-xs text-destructive"
                  >
                    Delete list
                  </Button>
                </div>

                <ul className="mt-3 divide-y divide-border">
                  {listItems.map((item) => {
                    const v = variantById(item.variant_id);
                    const best = v?.offers.length
                      ? Math.min(...v.offers.map((o) => landedCost(o)))
                      : null;
                    const hit = item.target_price != null && best != null && best <= item.target_price;
                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          {v ? (
                            <Link
                              to="/app/variant/$id"
                              params={{ id: v.variantId }}
                              className="text-sm font-medium hover:underline"
                            >
                              {v.productName}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium">Unknown product</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="label-meta">best landed</span>
                            <ValueCell
                              value={best != null ? money(best) : ""}
                              state={best != null ? "sourced" : "missing"}
                              note="No active offer for this product right now"
                            />
                            {item.target_price != null ? (
                              <Chip className="num" tone={hit ? "verified" : "neutral"}>
                                target {money(item.target_price)}
                                {hit ? " · hit" : ""}
                              </Chip>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => removeItem.mutate(item.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    );
                  })}
                  {listItems.length === 0 ? (
                    <li className="py-3 text-sm text-muted-foreground">
                      No items in this list yet — add one from search or compare.
                    </li>
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
