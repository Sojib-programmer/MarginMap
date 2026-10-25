import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { ListingLookup } from "@/components/listing-lookup";
import { RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { bestLandedCost, catalogQuery } from "@/lib/catalog";
import { money2 } from "@/lib/format";
import { useMembership } from "@/lib/membership";
import { inventoryQuery, watchlistItemsQuery, type InventoryRow } from "@/lib/workspace";

export const Route = createFileRoute("/app/reseller")({
  head: () => ({
    meta: [{ title: "Reseller dashboard — MarginMap" }, { name: "robots", content: "noindex" }],
  }),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: ResellerDashboard,
});

const STAGES: InventoryRow["status"][] = ["source_now", "acquired", "listed", "sold"];
const STAGE_LABEL: Record<string, string> = {
  source_now: "To buy",
  acquired: "Bought",
  listed: "Listed",
  sold: "Sold",
};

function ResellerDashboard() {
  const navigate = useNavigate();
  const { membership } = useMembership();
  const ws = membership?.workspaceId ?? null;
  const catalog = useQuery(catalogQuery(ws));
  const watched = useQuery(watchlistItemsQuery(ws));
  const inventory = useQuery(inventoryQuery(ws));

  const items = inventory.data ?? [];
  const capital = items
    .filter((i) => i.status === "acquired" || i.status === "listed")
    .reduce((s, i) => s + Number(i.cost_basis ?? 0) * (i.quantity || 1), 0);
  const realised = items
    .filter((i) => i.status === "sold")
    .reduce((s, i) => s + Number(i.actual_profit ?? 0), 0);

  const tracked = (watched.data ?? [])
    .filter((w) => w.variant_id)
    .map((w) => {
      const v = catalog.data?.variants.find((x) => x.variantId === w.variant_id) ?? null;
      const now = bestLandedCost(v);
      const target = w.target_price != null ? Number(w.target_price) : null;
      return { w, v, now, target, hit: now != null && target != null && now <= target };
    });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="label-meta">Reseller · dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Reseller dashboard</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {STAGES.map((s) => (
          <div key={s} className="panel p-4">
            <p className="label-meta">{STAGE_LABEL[s]}</p>
            <p className="font-mono text-2xl">{items.filter((i) => i.status === s).length}</p>
          </div>
        ))}
        <div className="panel p-4 sm:col-span-2">
          <p className="label-meta">Capital in stock (USD)</p>
          <p className="font-mono text-xl">{money2(capital)}</p>
        </div>
        <div className="panel p-4 sm:col-span-2">
          <p className="label-meta">Realised profit (USD)</p>
          <p className="font-mono text-xl">{money2(realised)}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Live listing</h2>
        <p className="text-xs text-muted-foreground">
          Paste any eBay, Amazon, Mercari, Etsy or Shopify link. It is read live, converted to USD
          and handed to the calculator, where "Buy on marketplace" opens checkout and logs it as
          bought.
        </p>
        <ListingLookup
          onResolved={(p) => navigate({ to: "/app/evaluate", search: { url: p.listingUrl } })}
        />
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Price tracking</h2>
          <span className="text-xs text-muted-foreground">Sample data | Updated today</span>
        </div>
        {tracked.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing tracked yet. Add items with a target price in{" "}
            <Link to="/app/watchlists" className="underline">
              Watchlists
            </Link>
            .
          </p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead className="label-meta text-left">
              <tr>
                <th className="py-1">Item</th>
                <th>Best landed</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tracked.map(({ w, v, now, target, hit }) => (
                <tr key={w.id}>
                  <td className="py-1.5">{v?.productName ?? "Unknown item"}</td>
                  <td className="font-mono">{now != null ? money2(now) : "missing"}</td>
                  <td className="font-mono">{target != null ? money2(target) : "—"}</td>
                  <td className={hit ? "text-primary" : "text-muted-foreground"}>
                    {target == null ? "No target" : hit ? "At or below target" : "Above target"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/app/pipeline">Open pipeline</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/evaluate">Open calculator</Link>
        </Button>
      </div>
    </div>
  );
}
