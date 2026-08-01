import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Chip, ConfidenceMeter, Disclaimer, FreshnessBadge } from "@/components/primitives";
import { catalogQuery, liquidityOf, type VariantIntel } from "@/lib/catalog";
import { money, money2 } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import {
  buyerScore,
  DEFAULT_DEAL_INPUT,
  evaluateDeal,
  landedCost,
} from "@/lib/scoring";
import { searchesQuery, watchlistItemsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function bestOffer(v: VariantIntel) {
  return v.offers.length ? v.offers.reduce((a, b) => (landedCost(a) <= landedCost(b) ? a : b)) : null;
}

function Overview() {
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);
  const searches = useQuery(searchesQuery);
  const watched = useQuery(watchlistItemsQuery);

  const variants = catalog.data?.variants ?? [];

  const ranked = variants
    .map((v) => {
      const offer = bestOffer(v);
      if (!offer) return null;
      const liquidity = liquidityOf(v);
      const buyer = buyerScore(offer, v.stats);
      const deal = evaluateDeal(
        {
          ...DEFAULT_DEAL_INPUT,
          purchasePrice: Number(offer.item_price),
          inboundShipping: Number(offer.shipping_price),
          tax: Number(offer.estimated_tax),
          conditionGrade: offer.condition_grade,
        },
        v.stats,
        liquidity,
      );
      return { v, offer, buyer, deal, liquidity };
    })
    .filter(Boolean)
    .sort((a, b) =>
      mode === "buyer" ? b!.buyer.score - a!.buyer.score : b!.deal.score.score - a!.deal.score.score,
    )
    .slice(0, 6) as Array<{
    v: VariantIntel;
    offer: NonNullable<ReturnType<typeof bestOffer>>;
    buyer: ReturnType<typeof buyerScore>;
    deal: ReturnType<typeof evaluateDeal>;
  }>;

  const totalOffers = variants.reduce((s, v) => s + v.offers.length, 0);
  const totalComps = variants.reduce((s, v) => s + v.comps.length, 0);
  const avgConfidence =
    variants.length ? variants.reduce((s, v) => s + v.stats.confidence, 0) / variants.length : 0;

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

        {catalog.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {ranked.map(({ v, offer, buyer, deal }) => (
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
                    <Chip className="num">landed {money(landedCost(offer))}</Chip>
                    <Chip className="num" tone="neutral">
                      comp median {money(v.stats.medianSold)}
                    </Chip>
                    <FreshnessBadge iso={offer.retrieved_at} />
                  </div>
                </div>
                <div className="text-right">
                  {mode === "buyer" ? (
                    <>
                      <p className="num text-lg font-semibold text-primary">{buyer.score}</p>
                      <p className="label-meta">buyer score</p>
                    </>
                  ) : (
                    <>
                      <p
                        className={`num text-lg font-semibold ${deal.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                      >
                        {money2(deal.expectedProfit)}
                      </p>
                      <p className="label-meta">{deal.roiPct.toFixed(1)}% ROI · {deal.verdict}</p>
                    </>
                  )}
                </div>
              </li>
            ))}
            {ranked.length === 0 ? (
              <li className="py-3 text-sm text-muted-foreground">No offers in the catalog yet.</li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Recent searches</h2>
          <ul className="mt-2 space-y-1.5">
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
            {(searches.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">Nothing searched yet.</li>
            ) : null}
          </ul>
        </div>
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Watchlist</h2>
          <p className="num mt-2 text-2xl font-semibold">{(watched.data ?? []).length}</p>
          <p className="text-xs text-muted-foreground">items tracked</p>
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
