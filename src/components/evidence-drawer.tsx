import { ExternalLink } from "lucide-react";

import { Chip, ConditionChip } from "@/components/primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DataSource, VariantIntel } from "@/lib/catalog";
import { money2, relativeTime } from "@/lib/format";
import { landedCost } from "@/lib/scoring";

export function EvidenceDrawer({
  variant,
  sources,
  trigger,
}: {
  variant: VariantIntel;
  sources: DataSource[];
  trigger?: React.ReactNode;
}) {
  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? "Unknown source";
  const sourceType = (id: string) => sources.find((s) => s.id === id)?.source_type ?? "unknown";

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <button className="text-xs font-medium text-primary underline decoration-dotted underline-offset-2">
            Evidence ({variant.offers.length + variant.comps.length})
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto bg-surface sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Evidence — {variant.variantTitle}</SheetTitle>
          <SheetDescription>
            Every record behind this recommendation: source, type, retrieval time, match confidence.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-10">
          <section>
            <p className="label-meta mb-2">Asking prices — active offers</p>
            <ul className="space-y-2">
              {variant.offers.map((o) => (
                <li key={o.id} className="panel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{o.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sourceName(o.data_source_id)} ·{" "}
                        {sourceType(o.data_source_id).replace("_", " ")} · retrieved{" "}
                        {relativeTime(o.retrieved_at)}
                      </p>
                    </div>
                    <span className="num text-sm font-semibold">{money2(landedCost(o))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip tone="primary">Active offer</Chip>
                    <ConditionChip grade={o.condition_grade} />
                    <Chip className="num">
                      match {(Number(o.match_confidence) * 100).toFixed(0)}%
                    </Chip>
                    {o.listing_url ? (
                      <a
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                        href={o.listing_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Source <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
              {variant.offers.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No active offers from a registered source.
                </li>
              ) : null}
            </ul>
          </section>

          <section>
            <p className="label-meta mb-2">Completed sales — comps</p>
            <ul className="space-y-2">
              {variant.comps.slice(0, 12).map((c) => (
                <li key={c.id} className="panel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sourceName(c.data_source_id)} · sold{" "}
                        {new Date(c.sold_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="num text-sm font-semibold">
                      {money2(Number(c.sold_price) + Number(c.shipping_paid))}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip tone={c.is_verified_completed_sale ? "verified" : "caution"}>
                      {c.is_verified_completed_sale ? "Verified completed sale" : "Unverified"}
                    </Chip>
                    <ConditionChip grade={c.condition_grade} />
                    <Chip className="num">
                      match {(Number(c.match_confidence) * 100).toFixed(0)}%
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="label-meta mb-2">Calculated assumptions</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                Landed cost = item price + shipping + estimated tax (where the source supplies it).
              </li>
              <li>
                Fair market = recency-weighted median of completed sales, 60-day half-life, IQR
                outlier filter ({variant.stats.excludedCount} comp(s) excluded as outliers).
              </li>
              <li>
                Sample: {variant.stats.sampleSize} comps, median age{" "}
                {variant.stats.medianAgeDays.toFixed(0)} days, data confidence{" "}
                {(variant.stats.confidence * 100).toFixed(0)}%.
              </li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
