import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { Chip, ConditionChip } from "@/components/primitives";
import { ScoreGauge } from "@/components/score-gauge";
import { Checkbox } from "@/components/ui/checkbox";
import type { VariantIntel } from "@/lib/catalog";
import { liquidityOf } from "@/lib/catalog";
import { useCompare } from "@/lib/compare-store";
import { money2, relativeTime } from "@/lib/format";
import type { RoleMode } from "@/lib/role-mode";
import {
  buyerScore,
  DEFAULT_DEAL_INPUT,
  evaluateDeal,
  landedCost,
} from "@/lib/scoring";

export function OfferTable({ variant, mode }: { variant: VariantIntel; mode: RoleMode }) {
  const { isSelected, toggle } = useCompare();
  const liquidity = liquidityOf(variant);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <caption className="sr-only">
          Offers for {variant.variantTitle} with landed cost and role score
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="label-meta py-2 pr-2">Compare</th>
            <th scope="col" className="label-meta py-2 pr-2">Offer</th>
            <th scope="col" className="label-meta py-2 pr-2">Item</th>
            <th scope="col" className="label-meta py-2 pr-2">Ship</th>
            <th scope="col" className="label-meta py-2 pr-2">Tax</th>
            <th scope="col" className="label-meta py-2 pr-2">Landed</th>
            <th scope="col" className="label-meta py-2 pr-2">
              {mode === "buyer" ? "Buyer score" : "Est. profit"}
            </th>
            <th scope="col" className="label-meta py-2 pr-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {variant.offers.map((offer) => {
            const cost = landedCost(offer);
            const deal = evaluateDeal(
              {
                ...DEFAULT_DEAL_INPUT,
                purchasePrice: Number(offer.item_price),
                inboundShipping: Number(offer.shipping_price),
                tax: Number(offer.estimated_tax),
                conditionGrade: offer.condition_grade,
              },
              variant.stats,
              liquidity,
            );
            const score = buyerScore(offer, variant.stats);

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
                      {offer.availability.replace("_", " ")}
                    </Chip>
                  </div>
                  {offer.condition_notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{offer.condition_notes}</p>
                  ) : null}
                </td>
                <td className="num py-3 pr-2">{money2(offer.item_price)}</td>
                <td className="num py-3 pr-2">{money2(offer.shipping_price)}</td>
                <td className="num py-3 pr-2">
                  {Number(offer.estimated_tax) === 0 ? (
                    <span className="text-caution">n/a</span>
                  ) : (
                    money2(offer.estimated_tax)
                  )}
                </td>
                <td className="num py-3 pr-2 font-semibold">{money2(cost)}</td>
                <td className="py-3 pr-2">
                  {mode === "buyer" ? (
                    <ScoreGauge
                      score={score.score}
                      factors={score.factors}
                      caption="Buyer value"
                      size={48}
                    />
                  ) : (
                    <div>
                      <p
                        className={`num font-semibold ${deal.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                      >
                        {money2(deal.expectedProfit)}
                      </p>
                      <p className="num text-xs text-muted-foreground">
                        {deal.roiPct.toFixed(1)}% ROI · {deal.verdict}
                      </p>
                      <Link
                        to="/app/evaluate"
                        search={{ offer: offer.id }}
                        className="text-xs text-primary underline"
                      >
                        Evaluate deal
                      </Link>
                    </div>
                  )}
                </td>
                <td className="py-3 pr-2 text-xs text-muted-foreground">
                  <p>{offer.seller_name ?? "Unknown seller"}</p>
                  <p>retrieved {relativeTime(offer.retrieved_at)}</p>
                  {offer.listing_url ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary underline"
                      href={offer.listing_url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Visit <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
