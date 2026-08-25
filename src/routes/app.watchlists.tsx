import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, DataAsOf, Disclaimer, ValueCell } from "@/components/primitives";
import { EmptyState, PanelSkeleton, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWatchlistHits } from "@/hooks/use-alert-hits";
import { useCreateWatchlist } from "@/hooks/use-workspace-actions";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, latestRetrievedAt } from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
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
  const hits = useWatchlistHits();
  const [name, setName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["watchlists"] });
    qc.invalidateQueries({ queryKey: ["watchlist_items"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  const createList = useCreateWatchlist();

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const ws = requireWrite();
      const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "watchlist.item_removed", {
        type: "watchlist_item",
        id,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Writes the target price and keeps a matching landed-cost alert in sync. */
  const setTarget = useMutation({
    mutationFn: async ({
      id,
      variantId,
      target,
    }: {
      id: string;
      variantId: string | null;
      target: number | null;
    }) => {
      const ws = requireWrite();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("watchlist_items")
        .update({ target_price: target })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "watchlist.target_price_changed", {
        type: "watchlist_item",
        id,
        metadata: { target_price: target },
      });

      if (!variantId) return;
      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("variant_id", variantId)
        .eq("rule_type", "landed_cost_below")
        .limit(1);

      if (target == null) {
        if (existing?.[0]) await supabase.from("alerts").delete().eq("id", existing[0].id);
        return;
      }
      if (existing?.[0]) {
        const { error: upErr } = await supabase
          .from("alerts")
          .update({ rule_config: { threshold: target } as never, enabled: true })
          .eq("id", existing[0].id);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { error: insErr } = await supabase.from("alerts").insert({
          user_id: auth.user.id,
          workspace_id: ws.workspaceId,
          variant_id: variantId,
          rule_type: "landed_cost_below",
          rule_config: { threshold: target } as never,
          channel: "in_app",
        });
        if (insErr) throw new Error(insErr.message);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Target price saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const ws = requireWrite();
      const { error } = await supabase.from("watchlists").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "watchlist.deleted", { type: "watchlist", id });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Watchlist deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const variantById = (id: string | null) =>
    catalog.data?.variants.find((v) => v.variantId === id) ?? null;

  const exportCsv = () => {
    const listName = new Map((lists.data ?? []).map((l) => [l.id, l.name]));
    const rows = (items.data ?? []).map((item) => {
      const v = variantById(item.variant_id);
      const hit = hits.get(item.id);
      return [
        listName.get(item.watchlist_id) ?? "",
        v?.productName ?? "Unknown product",
        v?.variantTitle ?? "",
        v?.brand ?? "",
        v?.category ?? "",
        hit?.best ?? "",
        item.target_price ?? "",
        hit?.hit ? "yes" : "no",
        item.note ?? "",
        item.created_at,
      ];
    });
    downloadCsv(
      "watchlists",
      [
        "List",
        "Product",
        "Variant",
        "Brand",
        "Category",
        "Best landed cost",
        "Target price",
        "Target hit",
        "Note",
        "Added at",
      ],
      rows,
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="label-meta">Watchlists</p>
            <DataAsOf iso={latestRetrievedAt(catalog.data?.variants ?? [])} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracked products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Target prices are compared against the current best landed cost, not the sticker price.
            Saving a target also creates a matching landed-cost alert.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={(items.data ?? []).length === 0}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
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
          onClick={() => createList.mutate({ name, mode }, { onSuccess: () => setName("") })}
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
                    const hit =
                      item.target_price != null && best != null && best <= item.target_price;
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
                            {hit ? (
                              <Chip className="num" tone="verified">
                                target hit
                              </Chip>
                            ) : null}
                          </div>
                        </div>
                        <TargetPriceEditor
                          value={item.target_price}
                          busy={setTarget.isPending}
                          onSave={(target) =>
                            setTarget.mutate({ id: item.id, variantId: item.variant_id, target })
                          }
                        />
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

function TargetPriceEditor({
  value,
  busy,
  onSave,
}: {
  value: number | null;
  busy: boolean;
  onSave: (target: number | null) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  return (
    <div className="flex items-center gap-1.5">
      <Input
        className="num h-8 w-24"
        inputMode="decimal"
        placeholder="target"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Target price"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={busy}
        onClick={() => onSave(draft.trim() === "" ? null : Number(draft))}
      >
        Save
      </Button>
    </div>
  );
}
