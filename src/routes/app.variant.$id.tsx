import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { OfferTable } from "@/components/offer-table";
import {
  Chip,
  ConditionChip,
  ConfidenceMeter,
  Disclaimer,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { PanelSkeleton, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAddToWatchlist, useSaveEvaluation } from "@/hooks/use-workspace-actions";
import { catalogQuery, liquidityOf } from "@/lib/catalog";
import { money, money2, relativeTime } from "@/lib/format";
import { runResearch } from "@/lib/research.functions";
import { useRoleMode } from "@/lib/role-mode";
import { offerEconomics, recommend } from "@/lib/scoring";
import { reportsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/variant/$id")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: VariantPage,
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Product not found.</p>,
});

function VariantPage() {
  const { id } = Route.useParams();
  const { mode } = useRoleMode();
  const qc = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const reports = useQuery(reportsQuery);
  const research = useServerFn(runResearch);
  const addToWatchlist = useAddToWatchlist();
  const saveEvaluation = useSaveEvaluation();

  const [question, setQuestion] = useState("");
  const [target, setTarget] = useState("");

  const variant = catalog.data?.variants.find((v) => v.variantId === id);

  const ask = useMutation({
    mutationFn: async () => {
      const q = question.trim() || `Should I ${mode === "buyer" ? "buy" : "source"} this right now?`;
      return research({ data: { variantId: id, query: q, roleMode: mode } });
    },
    onSuccess: () => {
      toast.success("Analyst report ready");
      setQuestion("");
      qc.invalidateQueries({ queryKey: ["research_reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (catalog.isLoading) return <PanelSkeleton rows={8} />;
  if (catalog.error) return <RouteError error={catalog.error as Error} />;
  if (!variant) throw notFound();

  const liquidity = liquidityOf(variant);
  const variantReports = (reports.data ?? []).filter((r) => r.variant_id === id);
  const noComps = variant.stats.sampleSize === 0;

  // Best offer under the current role, on the shared economics path.
  const scored = variant.offers.map((offer) => {
    const economics = offerEconomics(offer, variant.stats, liquidity);
    return { offer, economics, recommendation: recommend(mode, economics) };
  });
  const best = scored.sort((a, b) =>
    mode === "buyer"
      ? b.economics.buyer.score - a.economics.buyer.score
      : b.economics.expectedProfit - a.economics.expectedProfit,
  )[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="panel p-5">
        <p className="label-meta">
          {variant.brand} · {variant.category}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{variant.productName}</h1>
        <p className="text-sm text-muted-foreground">{variant.variantTitle}</p>
        {variant.description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{variant.description}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip className="num">canonical {variant.canonicalKey}</Chip>
          {variant.gtin ? <Chip className="num">GTIN {variant.gtin}</Chip> : null}
          {variant.sku ? <Chip className="num">MPN {variant.sku}</Chip> : null}
          <Chip tone="verified">
            identity {(variant.identityConfidence * 100).toFixed(0)}%
          </Chip>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Metric
            label="Comp median"
            cell={
              noComps ? (
                <ValueCell value="" state="missing" note="No completed sales recorded" />
              ) : (
                <ValueCell
                  value={money(variant.stats.medianSold)}
                  note={`Recency-weighted across ${variant.stats.sampleSize} completed sales`}
                />
              )
            }
          />
          <Metric
            label="Comp range"
            cell={
              noComps ? (
                <ValueCell value="" state="missing" note="No completed sales recorded" />
              ) : (
                <ValueCell
                  value={`${money(variant.stats.lowSold)} – ${money(variant.stats.highSold)}`}
                  note="Low / high completed sale after outlier trimming"
                />
              )
            }
          />
          <Metric
            label="Completed sales"
            cell={
              noComps ? (
                <ValueCell value="" state="missing" note="Nothing to price against yet" />
              ) : (
                <ValueCell
                  value={String(liquidity.completedSales)}
                  note={`${variant.stats.excludedCount} record(s) excluded as outliers`}
                />
              )
            }
          />
          <Metric
            label="Est. days to sell"
            cell={
              <ValueCell
                value={`${liquidity.daysToSell}d`}
                state="estimated"
                note="Modeled from sell-through against active supply — not a quoted figure"
              />
            }
          />
        </div>

        <div className="mt-4 max-w-xs">
          <ConfidenceMeter value={variant.stats.confidence} label="Market data confidence" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EvidenceDrawer variant={variant} sources={catalog.data?.sources ?? []} />
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target price"
            inputMode="decimal"
            className="num h-9 w-32"
            aria-label="Target price"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={addToWatchlist.isPending}
            onClick={() =>
              addToWatchlist.mutate(
                {
                  variantId: id,
                  targetPrice: target ? Number(target) : null,
                  mode,
                },
                { onSuccess: () => setTarget("") },
              )
            }
          >
            Add to watchlist
          </Button>
          {best ? (
            <Button
              size="sm"
              variant="outline"
              disabled={saveEvaluation.isPending}
              onClick={() =>
                saveEvaluation.mutate({
                  label: variant.productName,
                  variantId: id,
                  offerId: best.offer.id,
                  economics: best.economics,
                  recommendation: best.recommendation,
                })
              }
            >
              Save evaluation (best offer)
            </Button>
          ) : null}
          {mode === "reseller" && variant.offers[0] ? (
            <Button asChild size="sm">
              <Link to="/app/evaluate" search={{ offer: variant.offers[0].id }}>
                Evaluate deal
              </Link>
            </Button>
          ) : null}
        </div>

        {best ? (
          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="label-meta">Best offer verdict · {best.offer.title}</p>
            <div className="mt-2 flex flex-wrap items-start gap-4">
              <RecommendationBadge rec={best.recommendation} showReason />
              <div className="flex flex-wrap gap-4 text-sm">
                <LabeledValue
                  label="Landed cost"
                  cell={
                    <ValueCell
                      value={money2(best.economics.landedCost)}
                      state={best.economics.taxProvided ? "sourced" : "estimated"}
                      note={
                        best.economics.taxProvided
                          ? "Item + shipping + tax"
                          : "Excludes tax the source did not provide"
                      }
                    />
                  }
                />
                <LabeledValue
                  label="Expected profit"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" />
                    ) : (
                      <ValueCell value={money2(best.economics.expectedProfit)} state="estimated" />
                    )
                  }
                />
                <LabeledValue
                  label="ROI"
                  cell={
                    noComps ? (
                      <ValueCell value="" state="missing" />
                    ) : (
                      <ValueCell value={`${best.economics.roiPct.toFixed(1)}%`} state="estimated" />
                    )
                  }
                />
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Active offers — asking prices</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Landed cost is item + shipping + tax. Missing tax is labeled, never estimated.
        </p>
        <div className="mt-3">
          <OfferTable variant={variant} mode={mode} />
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Completed sales — what buyers actually paid</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-meta py-2 pr-2">Item</th>
                <th className="label-meta py-2 pr-2">Condition</th>
                <th className="label-meta py-2 pr-2">Sold</th>
                <th className="label-meta py-2 pr-2">Shipping</th>
                <th className="label-meta py-2 pr-2">Date</th>
                <th className="label-meta py-2 pr-2">Verified</th>
              </tr>
            </thead>
            <tbody>
              {variant.comps.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="py-2 pr-2">{c.title}</td>
                  <td className="py-2 pr-2">
                    <ConditionChip grade={c.condition_grade} />
                  </td>
                  <td className="num py-2 pr-2 font-medium">{money2(c.sold_price)}</td>
                  <td className="py-2 pr-2">
                    <ValueCell
                      value={money2(c.shipping_paid)}
                      state={Number(c.shipping_paid) > 0 ? "sourced" : "estimated"}
                      note={
                        Number(c.shipping_paid) > 0
                          ? "Shipping paid by the buyer"
                          : "Free or unstated shipping on this sale"
                      }
                    />
                  </td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                    {relativeTime(c.sold_at)}
                  </td>
                  <td className="py-2 pr-2">
                    <Chip tone={c.is_verified_completed_sale ? "verified" : "caution"}>
                      {c.is_verified_completed_sale ? "verified" : "unverified"}
                    </Chip>
                  </td>
                </tr>
              ))}
              {variant.comps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-sm text-muted-foreground">
                    No completed sales recorded — treat any valuation as speculative.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Ask the analyst</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Answers are grounded only in the evidence records above and cite their assumptions.
        </p>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            mode === "buyer"
              ? "Is the excellent-condition offer worth the premium over good?"
              : "What's my realistic net at a 30-day hold?"
          }
          className="mt-3"
          rows={3}
        />
        <Button className="mt-2" size="sm" onClick={() => ask.mutate()} disabled={ask.isPending}>
          {ask.isPending ? "Analyzing…" : "Run analysis"}
        </Button>

        <div className="mt-4">
          <QueryBoundary
            isLoading={reports.isLoading}
            error={reports.error}
            skeleton={<PanelSkeleton rows={3} />}
          >
            <div className="space-y-3">
              {variantReports.map((r) => {
                const out = r.structured_output as {
                  recommendation?: string;
                  why?: string[];
                  numbers?: Array<{ label: string; value: string; assumption: string }>;
                  risks?: string[];
                  next_actions?: string[];
                };
                return (
                  <article key={r.id} className="rounded-lg border border-border bg-background p-4">
                    <p className="label-meta">
                      {r.role_mode} · {relativeTime(r.created_at)} · {r.model_name}
                    </p>
                    <p className="mt-1 text-sm font-medium">“{r.query}”</p>
                    <p className="mt-2 text-sm">{out.recommendation}</p>
                    {out.why?.length ? (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                        {out.why.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
                    {out.numbers?.length ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {out.numbers.map((n, i) => (
                          <div key={i} className="rounded-md border border-border p-2">
                            <p className="label-meta">{n.label}</p>
                            <p className="num text-sm font-semibold">{n.value}</p>
                            <p className="text-xs text-muted-foreground">{n.assumption}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {out.risks?.length ? (
                      <p className="mt-2 text-xs text-caution">Risks: {out.risks.join(" · ")}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </QueryBoundary>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}

function Metric({ label, cell }: { label: string; cell: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="label-meta">{label}</p>
      <p className="mt-1 text-lg font-semibold">{cell}</p>
    </div>
  );
}

function LabeledValue({ label, cell }: { label: string; cell: React.ReactNode }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{cell}</p>
    </div>
  );
}
