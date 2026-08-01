import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Disclaimer } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { money, relativeTime } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import { landedCost } from "@/lib/scoring";
import { watchlistItemsQuery, watchlistsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/watchlists")({
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

  const createList = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("watchlists")
        .insert({ user_id: auth.user.id, name: name.trim() || "Untitled list", role_mode: mode });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlists").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
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
        <Button size="sm" onClick={() => createList.mutate()} disabled={createList.isPending}>
          Create list
        </Button>
      </div>

      {(lists.data ?? []).length === 0 ? (
        <div className="panel p-6 text-sm text-muted-foreground">
          No watchlists yet. Create one above, then add products from any intel page.
        </div>
      ) : null}

      {(lists.data ?? []).map((list) => {
        const listItems = (items.data ?? []).filter((i) => i.watchlist_id === list.id);
        return (
          <section key={list.id} className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{list.name}</h2>
                <p className="label-meta">
                  {list.role_mode} · {listItems.length} items · created {relativeTime(list.created_at)}
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
                const best = v?.offers[0] ? landedCost(v.offers[0]) : null;
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
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Chip className="num">
                          best landed {best != null ? money(best) : "n/a"}
                        </Chip>
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
                <li className="py-3 text-sm text-muted-foreground">No items in this list.</li>
              ) : null}
            </ul>
          </section>
        );
      })}

      <Disclaimer />
    </div>
  );
}
