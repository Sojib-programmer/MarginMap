import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Chip, ConditionChip, Disclaimer } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { catalogQuery, liquidityOf, type Offer, type VariantIntel } from "@/lib/catalog";
import { money2, relativeTime } from "@/lib/format";
import { useCompare } from "@/lib/compare-store";
import { useRoleMode } from "@/lib/role-mode";
import { buyerScore, DEFAULT_DEAL_INPUT, evaluateDeal, landedCost } from "@/lib/scoring";

export const Route = createFileRoute("/app/compare")({
  component: ComparePage,
});

function ComparePage() {
  const { selected, clear, toggle } = useCompare();
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);

  const picks: Array<{ offer: Offer; variant: VariantIntel }> = [];
  for (const v of catalog.data?.variants ?? []) {
    for (const o of v.offers) if (selected.includes(o.id)) picks.push({ offer: o, variant: v });
  }

  const cheapest = picks.length ? Math.min(...picks.map((p) => landedCost(p.offer))) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-meta">Compare</p>
          <h1 className="text-2xl font-semibold tracking-tight">Side-by-side offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Same canonical product or not — every column is normalized to landed cost and the same
            comp baseline.
          </p>
        </div>
        {picks.length ? (
          <Button size="sm" variant="outline" onClick={clear}>
            Clear selection
          </Button>
        ) : null}
      </header>

      {picks.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm font-medium">Nothing selected yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tick offers in any offer table to add them here (up to 4).
          </p>
          <Button asChild className="mt-3" size="sm">
            <Link to="/app/search" search={{ q: "" }}>
              Go to search
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {picks.map(({ offer, variant }) => {
            const cost = landedCost(offer);
            const score = buyerScore(offer, variant.stats);
            const deal = evaluateDeal(
              {
                ...DEFAULT_DEAL_INPUT,
                purchasePrice: Number(offer.item_price),
                inboundShipping: Number(offer.shipping_price),
                tax: Number(offer.estimated_tax),
                conditionGrade: offer.condition_grade,
              },
              variant.stats,
              liquidityOf(variant),
            );
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

                <Row label="Item" value={money2(offer.item_price)} />
                <Row label="Shipping" value={money2(offer.shipping_price)} />
                <Row
                  label="Tax"
                  value={Number(offer.estimated_tax) === 0 ? "not provided" : money2(offer.estimated_tax)}
                />
                <Row label="Landed cost" value={money2(cost)} strong />
                {cost === cheapest ? <Chip tone="verified">lowest landed cost</Chip> : null}
                <Row label="Comp median" value={money2(variant.stats.medianSold)} />
                {mode === "buyer" ? (
                  <Row label="Buyer score" value={String(score.score)} strong />
                ) : (
                  <>
                    <Row label="Expected net" value={money2(deal.netProceeds)} />
                    <Row label="Profit" value={money2(deal.expectedProfit)} strong />
                    <Row label="ROI" value={`${deal.roiPct.toFixed(1)}%`} />
                    <Row label="Days to sell" value={`${deal.daysToSell}d`} />
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {offer.seller_name ?? "Unknown seller"} · retrieved {relativeTime(offer.retrieved_at)}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <span className="label-meta">{label}</span>
      <span className={`num text-sm ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
