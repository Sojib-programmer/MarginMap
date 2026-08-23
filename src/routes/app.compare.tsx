import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Chip,
  ConditionChip,
  DataAsOf,
  Disclaimer,
  ProvenanceCell,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { CardGridSkeleton, EmptyState, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAddToWatchlist, useSaveEvaluation } from "@/hooks/use-workspace-actions";
import {
  catalogQuery,
  latestRetrievedAt,
  liquidityOf,
  marketplaceOfSource,
  type Offer,
  type VariantIntel,
} from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
import { OFFER_CSV_HEADERS, offerCsvRows } from "@/lib/export-rows";
import { useCompare } from "@/lib/compare-store";
import { money2 } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import { offerEconomics, recommend } from "@/lib/scoring";

export const Route = createFileRoute("/app/compare")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: ComparePage,
});

function ComparePage() {
  const { selected, clear, toggle } = useCompare();
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);
  const addToWatchlist = useAddToWatchlist();
  const saveEvaluation = useSaveEvaluation();

  const sources = catalog.data?.sources ?? [];
  const sourceName = (id: string) =>
    sources.find((s) => s.id === id)?.name ?? "Unregistered source";

  const picks: Array<{ offer: Offer; variant: VariantIntel }> = [];
  for (const v of catalog.data?.variants ?? []) {
    for (const o of v.offers) if (selected.includes(o.id)) picks.push({ offer: o, variant: v });
  }

  const rows = picks.map(({ offer, variant }) => {
    const economics = offerEconomics(offer, variant.stats, liquidityOf(variant));
    return { offer, variant, economics, recommendation: recommend(mode, economics) };
  });

  const cheapest = rows.length ? Math.min(...rows.map((r) => r.economics.landedCost)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-meta">Compare</p>
          <h1 className="text-2xl font-semibold tracking-tight">Side-by-side offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every column runs through the same economics path as search: landed cost, comp baseline,
            fees, profit and verdict.
          </p>
        </div>
        {rows.length ? (
          <div className="flex items-center gap-2">
            <DataAsOf iso={latestRetrievedAt(rows.map((r) => r.variant))} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "compare",
                  OFFER_CSV_HEADERS,
                  offerCsvRows(rows, {
                    sourceName,
                    marketplace: (id) => marketplaceOfSource(sources, id),
                  }),
                )
              }
            >
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={clear}>
              Clear selection
            </Button>
          </div>
        ) : null}
      </header>

      <QueryBoundary
        isLoading={catalog.isLoading}
        error={catalog.error}
        isEmpty={rows.length === 0}
        skeleton={<CardGridSkeleton count={3} />}
        empty={
          <EmptyState
            title="Nothing selected yet"
            body="Tick offers in any offer table to add them here (up to 4). Comparison keeps the same landed-cost and comp baseline across every pick."
            action={
              <Button asChild size="sm">
                <Link to="/app/search" search={{ q: "" }}>
                  Go to search
                </Link>
              </Button>
            }
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map(({ offer, variant, economics: e, recommendation }) => {
            const noComps = e.sampleSize === 0;
            return (
              <article key={offer.id} className="panel space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/app/variant/$id"
                    params={{ id: variant.variantId }}
                    className="text-sm font-semibold hover:underline"
                  >
                    {variant.productName}
                  </Link>
                  <button
                    onClick={() => toggle(offer.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Remove from comparison"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{offer.title}</p>
                <ConditionChip grade={offer.condition_grade} />

                <Row label="Item" cell={<ValueCell value={money2(e.itemPrice)} />} />
                <Row
                  label="Shipping"
                  cell={
                    <ValueCell
                      value={money2(e.shipping)}
                      state={e.shipping > 0 ? "sourced" : "missing"}
                      note="The source listed no shipping charge"
                    />
                  }
                />
                <Row
                  label="Tax"
                  cell={
                    <ValueCell
                      value={money2(e.tax)}
                      state={e.taxProvided ? "sourced" : "missing"}
                      note="This source does not publish tax"
                    />
                  }
                />
                <Row
                  label="Marketplace fees"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" note="Needs comps to project fees" />
                    ) : (
                      <ValueCell
                        value={money2(e.resaleFees)}
                        state="estimated"
                        note="Fee schedule applied to the expected resale price"
                      />
                    )
                  }
                />
                <Row
                  label="Landed cost"
                  strong
                  cell={
                    <ValueCell
                      value={money2(e.landedCost)}
                      state={e.taxProvided ? "sourced" : "estimated"}
                      note={
                        e.taxProvided
                          ? "Item + shipping + tax"
                          : "Excludes tax the source did not provide"
                      }
                    />
                  }
                />
                {e.landedCost === cheapest ? <Chip tone="verified">lowest landed cost</Chip> : null}
                <Row
                  label="Comp median"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" note="No completed sales on record" />
                    ) : (
                      <ValueCell value={money2(e.medianSold)} />
                    )
                  }
                />
                <Row
                  label="Comp range"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" />
                    ) : (
                      <ValueCell value={`${money2(e.lowSold)} – ${money2(e.highSold)}`} />
                    )
                  }
                />
                <Row
                  label="Expected resale"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" note="Needs comps to estimate resale" />
                    ) : (
                      <ValueCell
                        value={money2(e.expectedResale)}
                        state="estimated"
                        note={`Condition-adjusted from ${e.sampleSize} completed sales`}
                      />
                    )
                  }
                />
                <Row
                  label="Estimated profit"
                  strong
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" />
                    ) : (
                      <ValueCell
                        value={money2(e.expectedProfit)}
                        state="estimated"
                        className={e.expectedProfit >= 0 ? "text-verified" : "text-destructive"}
                      />
                    )
                  }
                />
                <Row
                  label="ROI"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" />
                    ) : (
                      <ValueCell value={`${e.roiPct.toFixed(1)}%`} state="estimated" />
                    )
                  }
                />
                <Row
                  label="Est. days to sell"
                  cell={<ValueCell value={`${e.daysToSell}d`} state="estimated" />}
                />

                <div className="pt-1">
                  <RecommendationBadge rec={recommendation} showReason />
                </div>

                <ProvenanceCell
                  source={sourceName(offer.data_source_id)}
                  retrievedAt={offer.retrieved_at}
                  matchConfidence={offer.match_confidence}
                  url={offer.listing_url}
                  className="pt-1"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={addToWatchlist.isPending}
                    onClick={() =>
                      addToWatchlist.mutate({
                        variantId: variant.variantId,
                        offerId: offer.id,
                        mode,
                        note: `Compared ${offer.title}`,
                      })
                    }
                  >
                    Watchlist
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={saveEvaluation.isPending}
                    onClick={() =>
                      saveEvaluation.mutate({
                        label: variant.productName,
                        variantId: variant.variantId,
                        offerId: offer.id,
                        economics: e,
                        recommendation,
                      })
                    }
                  >
                    Save evaluation
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </QueryBoundary>

      <Disclaimer />
    </div>
  );
}

function Row({ label, cell, strong }: { label: string; cell: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <span className="label-meta">{label}</span>
      <span className={`text-sm ${strong ? "font-semibold" : ""}`}>{cell}</span>
    </div>
  );
}
