import { Link } from "@tanstack/react-router";

import {
  Chip,
  ConditionChip,
  ProvenanceCell,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { ScoreGauge } from "@/components/score-gauge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataSource, VariantIntel } from "@/lib/catalog";
import { liquidityOf } from "@/lib/catalog";
import { useCompare } from "@/lib/compare-store";
import { money2 } from "@/lib/format";
import type { RoleMode } from "@/lib/role-mode";
import { offerEconomics, recommend } from "@/lib/scoring";

export function OfferTable({
  variant,
  mode,
  sources = [],
  onSaveEvaluation,
  onAddToWatchlist,
  busy,
}: {
  variant: VariantIntel;
  mode: RoleMode;
  sources?: DataSource[];
  onSaveEvaluation?: (offerId: string) => void;
  onAddToWatchlist?: (offerId: string) => void;
  busy?: boolean;
}) {
  const { isSelected, toggle } = useCompare();
  const liquidity = liquidityOf(variant);
  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? "Unregistered source";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-sm">
        <caption className="sr-only">
          Offers for {variant.variantTitle} with landed cost, resale economics and verdict
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="label-meta py-2 pr-2">Cmp</th>
            <th scope="col" className="label-meta py-2 pr-2">Offer</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Item</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Ship</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Tax</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Fees</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Landed</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Exp. resale</th>
            <th scope="col" className="label-meta py-2 pr-2 text-right">Profit / ROI</th>
            <th scope="col" className="label-meta py-2 pr-2">
              {mode === "buyer" ? "Buyer score" : "Deal score"}
            </th>
            <th scope="col" className="label-meta py-2 pr-2">Verdict</th>
            <th scope="col" className="label-meta py-2 pr-2">Provenance</th>
            <th scope="col" className="label-meta py-2 pr-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variant.offers.map((offer) => {
            const e = offerEconomics(offer, variant.stats, liquidity);
            const rec = recommend(mode, e);
            const noComps = e.sampleSize === 0;
            const score = mode === "buyer" ? e.buyer : e.deal.score;

            return (
              <tr key={offer.id} className="border-b border-border/60 align-top">
                <td className="py-3 pr-2">
                  <Checkbox
                    checked={isSelected(offer.id)}
                    onCheckedChange={() => toggle(offer.id)}
                    aria-label={`Add ${offer.title} to comparison`}
                  />
                </td>
                <td className="py-3 pr-2">
                  <p className="font-medium">{offer.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ConditionChip grade={offer.condition_grade} />
                    <Chip tone={offer.availability === "in_stock" ? "verified" : "caution"}>
                      {offer.availability.replace(/_/g, " ")}
                    </Chip>
                  </div>
                  {offer.condition_notes ? (
                    <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
                      {offer.condition_notes}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 pr-2 text-right">
                  <ValueCell value={money2(e.itemPrice)} />
                </td>
                <td className="py-3 pr-2 text-right">
                  <ValueCell
                    value={money2(e.shipping)}
                    state={e.shipping > 0 ? "sourced" : "estimated"}
                    note={e.shipping > 0 ? "Quoted shipping" : "Free or unstated shipping"}
                  />
                </td>
                <td className="py-3 pr-2 text-right">
                  <ValueCell
                    value={money2(e.tax)}
                    state={e.taxProvided ? "sourced" : "missing"}
                    note="Source returned no tax figure"
                  />
                </td>
                <td className="py-3 pr-2 text-right">
                  <ValueCell
                    value={money2(e.resaleFees)}
                    state="estimated"
                    note="Marketplace + payment fees on expected resale"
                  />
                </td>
                <td className="py-3 pr-2 text-right font-semibold">
                  <ValueCell
                    value={money2(e.landedCost)}
                    state={e.taxProvided ? "sourced" : "estimated"}
                    note="Item + shipping + tax"
                  />
                </td>
                <td className="py-3 pr-2 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" note="No completed sales on record" />
                  ) : (
                    <ValueCell
                      value={money2(e.expectedResale)}
                      state="estimated"
                      note={`Median ${money2(e.medianSold)} across ${e.sampleSize} comps`}
                    />
                  )}
                </td>
                <td className="py-3 pr-2 text-right">
                  {noComps ? (
                    <ValueCell value="" state="missing" />
                  ) : (
                    <div>
                      <p
                        className={`num font-semibold ${e.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                      >
                        {money2(e.expectedProfit)}
                      </p>
                      <p className="num text-xs text-muted-foreground">
                        {e.roiPct.toFixed(1)}% ROI · ~{e.daysToSell}d
                      </p>
                    </div>
                  )}
                </td>
                <td className="py-3 pr-2">
                  <ScoreGauge
                    score={score.score}
                    factors={score.factors}
                    caption={mode === "buyer" ? "Buyer value" : "Deal quality"}
                    size={48}
                  />
                </td>
                <td className="py-3 pr-2">
                  <RecommendationBadge rec={rec} showReason />
                </td>
                <td className="py-3 pr-2">
                  <ProvenanceCell
                    source={sourceName(offer.data_source_id)}
                    retrievedAt={offer.retrieved_at}
                    matchConfidence={offer.match_confidence}
                    url={offer.listing_url}
                  />
                </td>
                <td className="py-3 pr-2">
                  <div className="flex flex-col items-start gap-1">
                    {onAddToWatchlist ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={busy}
                        onClick={() => onAddToWatchlist(offer.id)}
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
                        onClick={() => onSaveEvaluation(offer.id)}
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
          {variant.offers.length === 0 ? (
            <tr>
              <td colSpan={13} className="py-3 text-sm text-muted-foreground">
                No active offers from registered sources for this variant.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
