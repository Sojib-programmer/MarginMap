import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Chip,
  ConfidenceMeter,
  Disclaimer,
  FreshnessBadge,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { EmptyState, PanelSkeleton, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { catalogQuery, liquidityOf, type VariantIntel } from "@/lib/catalog";
import { money, money2 } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import { landedCost, offerEconomics, recommend } from "@/lib/scoring";
import { searchesQuery, watchlistItemsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: Overview,
});

function bestOffer(v: VariantIntel) {
  return v.offers.length
    ? v.offers.reduce((a, b) => (landedCost(a) <= landedCost(b) ? a : b))
    : null;
}

function Overview() {
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);
  const searches = useQuery(searchesQuery);
  const watched = useQuery(watchlistItemsQuery);

  const variants = catalog.data?.variants ?? [];

  const ranked = variants
    .flatMap((v) => {
      const offer = bestOffer(v);
      if (!offer) return [];
      const economics = offerEconomics(offer, v.stats, liquidityOf(v));
      return [{ v, offer, economics, recommendation: recommend(mode, economics) }];
    })
    .sort((a, b) =>
      mode === "buyer"
        ? b.economics.buyer.score - a.economics.buyer.score
        : b.economics.expectedProfit - a.economics.expectedProfit,
    )
    .slice(0, 6);

  const totalOffers = variants.reduce((s, v) => s + v.offers.length, 0);
  const totalComps = variants.reduce((s, v) => s + v.comps.length, 0);
  const avgConfidence = variants.length
    ? variants.reduce((s, v) => s + v.stats.confidence, 0) / variants.length
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="label-meta">{mode === "buyer" ? "Buyer mode" : "Reseller mode"}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "buyer"
            ? "Ranked by buyer value: landed cost against completed-sale comps, fit and trust."
            : "Ranked by risk-adjusted resale: net proceeds, ROI, liquidity and data confidence."}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Canonical variants" value={String(variants.length)} />
        <Stat label="Active offers" value={String(totalOffers)} />
        <Stat label="Completed comps" value={String(totalComps)} />
        <div className="panel p-4">
          <p className="label-meta">Avg data confidence</p>
          <div className="mt-2">
            <ConfidenceMeter value={avgConfidence} label="Catalog" />
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">
            {mode === "buyer" ? "Best value right now" : "Best sourcing candidates"}
          </h2>
          <Link to="/app/search" search={{ q: "" }} className="text-xs text-primary underline">
            Open search
          </Link>
        </div>

        <div className="mt-3">
          <QueryBoundary
            isLoading={catalog.isLoading}
            error={catalog.error}
            isEmpty={ranked.length === 0}
            skeleton={<PanelSkeleton rows={5} />}
            empty={
              <EmptyState
                title="No offers in the catalog yet"
                body="Nothing is currently listed against a canonical variant, so there is nothing to rank."
                action={
                  <Button asChild size="sm">
                    <Link to="/app/search" search={{ q: "" }}>
                      Open search
                    </Link>
                  </Button>
                }
              />
            }
          >
            <ul className="divide-y divide-border">
              {ranked.map(({ v, offer, economics: e, recommendation }) => (
                <li key={v.variantId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/app/variant/$id"
                      params={{ id: v.variantId }}
                      className="text-sm font-medium hover:underline"
                    >
                      {v.productName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.variantTitle} · {v.brand} · {v.category}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Chip className="num">landed {money(e.landedCost)}</Chip>
                      <Chip className="num" tone="neutral">
                        {e.sampleSize === 0
                          ? "no comps on record"
                          : `comp median ${money(e.medianSold)}`}
                      </Chip>
                      <FreshnessBadge iso={offer.retrieved_at} />
                    </div>
                  </div>
                  <div className="text-right">
                    {mode === "buyer" ? (
                      <>
                        <p className="num text-lg font-semibold text-primary">{e.buyer.score}</p>
                        <p className="label-meta">buyer score</p>
                      </>
                    ) : (
                      <>
                        <ValueCell
                          value={money2(e.expectedProfit)}
                          state={e.sampleSize === 0 ? "missing" : "estimated"}
                          note="Projected from completed sales after fees"
                          className={`text-lg font-semibold ${e.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                        />
                        <p className="label-meta">{e.roiPct.toFixed(1)}% ROI</p>
                      </>
                    )}
                    <div className="mt-1 flex justify-end">
                      <RecommendationBadge rec={recommendation} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </QueryBoundary>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Recent searches</h2>
          <div className="mt-2">
            <QueryBoundary
              isLoading={searches.isLoading}
              error={searches.error}
              isEmpty={(searches.data ?? []).length === 0}
              skeleton={<PanelSkeleton rows={3} />}
              empty={
                <p className="text-sm text-muted-foreground">
                  Nothing searched yet — run a search and save it to see it here.
                </p>
              }
            >
              <ul className="space-y-1.5">
                {(searches.data ?? []).slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/app/search"
                      search={{ q: s.raw_query }}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {s.raw_query}
                    </Link>
                  </li>
                ))}
              </ul>
            </QueryBoundary>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Watchlist</h2>
          <QueryBoundary
            isLoading={watched.isLoading}
            error={watched.error}
            skeleton={<PanelSkeleton rows={2} />}
          >
            <>
              <p className="num mt-2 text-2xl font-semibold">{(watched.data ?? []).length}</p>
              <p className="text-xs text-muted-foreground">items tracked</p>
            </>
          </QueryBoundary>
          <Link to="/app/watchlists" className="mt-2 inline-block text-xs text-primary underline">
            Manage watchlists
          </Link>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="label-meta">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
