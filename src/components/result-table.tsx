import { Link } from "@tanstack/react-router";

import {
  Chip,
  ConditionChip,
  ProvenanceCell,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataSource, Offer, VariantIntel } from "@/lib/catalog";
import { liquidityOf } from "@/lib/catalog";
import { useCompare } from "@/lib/compare-store";
import { money2 } from "@/lib/format";
import { ageInDays } from "@/lib/freshness";
import type { RoleMode } from "@/lib/role-mode";
import { offerEconomics, recommend, type OfferEconomics, type Recommendation } from "@/lib/scoring";

export type ResultRow = {
  variant: VariantIntel;
  offer: Offer;
  economics: OfferEconomics;
  recommendation: Recommendation;
};

/** Builds one row per offer across the supplied variants, best value first. */
export function buildRows(variants: VariantIntel[], mode: RoleMode): ResultRow[] {
  const rows: ResultRow[] = [];
  for (const variant of variants) {
    const liquidity = liquidityOf(variant);
    for (const offer of variant.offers) {
      const economics = offerEconomics(offer, variant.stats, liquidity);
      rows.push({
        variant,
        offer,
        economics,
        recommendation: recommend(mode, economics, {
          evidenceAgeDays: ageInDays(offer.retrieved_at),
        }),
      });
    }
  }
  const rank = { Buy: 0, Watch: 1, Pass: 2 } as const;
  return rows.sort((a, b) => {
    const r = rank[a.recommendation.action] - rank[b.recommendation.action];
    if (r !== 0) return r;
    return mode === "buyer"
      ? b.economics.buyer.score - a.economics.buyer.score
      : b.economics.expectedProfit - a.economics.expectedProfit;
  });
}

export function ResultTable({
  rows,
  sources,
  onSaveEvaluation,
  onAddToWatchlist,
  busy,
}: {
  rows: ResultRow[];
  sources: DataSource[];
  onSaveEvaluation?: (row: ResultRow) => void;
  onAddToWatchlist?: (row: ResultRow) => void;
  busy?: boolean;
}) {
  const { isSelected, toggle } = useCompare();
  const sourceName = (id: string) =>
    sources.find((s) => s.id === id)?.name ?? "Unregistered source";

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-sm">
        <caption className="sr-only">
          Offer comparison: landed cost, completed-sale comps, resale economics and verdict
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="label-meta px-3 py-2">
              Cmp
            </th>
            <th scope="col" className="label-meta px-3 py-2">
              Offer
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Item
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Ship
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Tax
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Fees
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Landed
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Median sold
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Exp. resale
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              Profit
            </th>
            <th scope="col" className="label-meta px-3 py-2 text-right">
              ROI
            </th>
            <th scope="col" className="label-meta px-3 py-2">
              Verdict
            </th>
            <th scope="col" className="label-meta px-3 py-2">
              Provenance
            </th>
            <th scope="col" className="label-meta px-3 py-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { variant, offer, economics: e, recommendation } = row;
            const noComps = e.sampleSize === 0;
            return (
              <tr key={offer.id} className="border-b border-border/60 align-top">
                <td className="px-3 py-3">
                  <Checkbox
                    checked={isSelected(offer.id)}
                    onCheckedChange={() => toggle(offer.id)}
                    aria-label={`Add ${offer.title} to comparison`}
                  />
                </td>
                <td className="px-3 py-3">
                  <Link
                    to="/app/variant/$id"
                    params={{ id: variant.variantId }}
                    className="font-medium hover:underline"
                  >
                    {variant.productName}
                  </Link>
                  <p className="max-w-[18rem] truncate text-xs text-muted-foreground">
                    {offer.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ConditionChip grade={offer.condition_grade} />
                    <Chip tone={offer.availability === "in_stock" ? "verified" : "caution"}>
                      {offer.availability.replace(/_/g, " ")}
                    </Chip>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <ValueCell value={money2(e.itemPrice)} note="Quoted by the source listing" />
                </td>
                <td className="px-3 py-3 text-right">
                  <ValueCell
                    value={money2(e.shipping)}
                    state={e.shipping > 0 ? "sourced" : "estimated"}
                    note={
                      e.shipping > 0 ? "Quoted shipping" : "Listing shows free or unstated shipping"
                    }
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <ValueCell
                    value={money2(e.tax)}
                    state={e.taxProvided ? "sourced" : "missing"}
                    note="Source returned no tax figure — not assumed to be zero"
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <ValueCell
                    value={money2(e.resaleFees)}
                    state="estimated"
                    note="Marketplace + payment fees on the expected resale price"
                  />
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  <ValueCell
                    value={money2(e.landedCost)}
                    state={e.taxProvided ? "sourced" : "estimated"}
                    note="Item + shipping + tax"
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" note="No completed sales on record" />
                  ) : (
                    <div>
                      <ValueCell value={money2(e.medianSold)} />
                      <p className="num text-[11px] text-muted-foreground">
                        {money2(e.lowSold)} – {money2(e.highSold)} · {e.sampleSize} comps
                      </p>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" note="Needs comps to estimate resale" />
                  ) : (
                    <ValueCell
                      value={money2(e.expectedResale)}
                      state="estimated"
                      note="Condition-adjusted from completed sales"
                    />
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" />
                  ) : (
                    <span
                      className={`num font-semibold ${e.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                    >
                      {money2(e.expectedProfit)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" />
                  ) : (
                    <span className="num">{e.roiPct.toFixed(1)}%</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <RecommendationBadge rec={recommendation} showReason />
                </td>
                <td className="px-3 py-3">
                  <ProvenanceCell
                    source={sourceName(offer.data_source_id)}
                    retrievedAt={offer.retrieved_at}
                    matchConfidence={offer.match_confidence}
                    url={offer.listing_url}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {onAddToWatchlist ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={busy}
                        onClick={() => onAddToWatchlist(row)}
                      >
                        Watchlist
                      </Button>
                    ) : null}
                    {onSaveEvaluation ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={busy}
                        onClick={() => onSaveEvaluation(row)}
                      >
                        Save evaluation
                      </Button>
                    ) : null}
                    <Link
                      to="/app/evaluate"
                      search={{ offer: offer.id }}
                      className="text-xs text-primary underline"
                    >
                      Open calculator
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
