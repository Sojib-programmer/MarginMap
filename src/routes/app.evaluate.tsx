import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Chip,
  Disclaimer,
  ProvenanceCell,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { ScoreGauge } from "@/components/score-gauge";
import { EmptyState, PanelSkeleton, QueryBoundary, RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveEvaluation } from "@/hooks/use-workspace-actions";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, liquidityOf } from "@/lib/catalog";
import { money2, relativeTime } from "@/lib/format";
import { useRoleMode } from "@/lib/role-mode";
import {
  buyerScore,
  DEFAULT_DEAL_INPUT,
  evaluateDeal,
  FEE_SCHEDULES,
  recommend,
  type DealInput,
  type OfferEconomics,
} from "@/lib/scoring";
import { evaluationsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/evaluate")({
  validateSearch: (search: Record<string, unknown>) => ({
    offer: typeof search["offer"] === "string" ? (search["offer"] as string) : undefined,
  }),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: EvaluatePage,
});

function EvaluatePage() {
  const { offer: offerId } = Route.useSearch();
  const { mode } = useRoleMode();
  const qc = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const saved = useQuery(evaluationsQuery);
  const saveEvaluation = useSaveEvaluation();

  const found = useMemo(() => {
    for (const v of catalog.data?.variants ?? []) {
      const o = v.offers.find((x) => x.id === offerId);
      if (o) return { variant: v, offer: o };
    }
    return null;
  }, [catalog.data, offerId]);

  const [input, setInput] = useState<DealInput>(DEFAULT_DEAL_INPUT);
  const [seeded, setSeeded] = useState<string | null>(null);

  if (found && seeded !== found.offer.id) {
    setSeeded(found.offer.id);
    setInput((prev) => ({
      ...prev,
      purchasePrice: Number(found.offer.item_price),
      inboundShipping: Number(found.offer.shipping_price),
      tax: Number(found.offer.estimated_tax),
      conditionGrade: found.offer.condition_grade,
    }));
  }

  const stats = found?.variant.stats ?? {
    sampleSize: 0,
    medianSold: 0,
    lowSold: 0,
    highSold: 0,
    medianAgeDays: 0,
    dispersion: 0,
    excludedCount: 0,
    confidence: 0,
  };
  const liquidity = found
    ? liquidityOf(found.variant)
    : { activeListings: 0, completedSales: 0, daysToSell: 30 };

  const result = evaluateDeal(input, stats, liquidity);

  // One displayed math path: the calculator's own fee mechanics feed the same
  // OfferEconomics shape used by search, compare and the variant intel page.
  const economics: OfferEconomics = {
    itemPrice: input.purchasePrice,
    shipping: input.inboundShipping,
    tax: input.tax,
    taxProvided: input.tax > 0,
    landedCost: result.allInCost,
    resaleFees: result.marketplaceFee + result.paymentFee,
    landedCostWithFees: result.allInCost + result.marketplaceFee + result.paymentFee,
    medianSold: stats.medianSold,
    lowSold: stats.lowSold,
    highSold: stats.highSold,
    expectedResale: result.expectedGrossSale,
    netProceeds: result.netProceeds,
    expectedProfit: result.expectedProfit,
    roiPct: result.roiPct,
    daysToSell: result.daysToSell,
    sampleSize: stats.sampleSize,
    confidence: stats.confidence,
    buyer: found ? buyerScore(found.offer, stats) : result.score,
    deal: result,
    flags: result.flags,
  };
  const rec = recommend(mode, economics);
  const noComps = stats.sampleSize === 0;

  const sourceName =
    catalog.data?.sources.find((s) => s.id === found?.offer.data_source_id)?.name ??
    "Unregistered source";

  const set = <K extends keyof DealInput>(k: K, v: DealInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));
  const num = (k: keyof DealInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (Number(e.target.value) || 0) as never);

  const addToPipeline = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("inventory_items").insert({
        user_id: auth.user.id,
        variant_id: found?.variant.variantId ?? null,
        title: found?.variant.productName ?? "Manual candidate",
        status: "source_now",
        cost_basis: result.allInCost,
        condition_grade: input.conditionGrade,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Added to pipeline");
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="label-meta">Reseller · deal calculator</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {found ? found.variant.productName : "Evaluate a deal"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every assumption is editable and shown. Expected sale comes from completed comps, not
          asking prices.
        </p>
        {found ? (
          <div className="mt-3 max-w-md">
            <ProvenanceCell
              source={sourceName}
              retrievedAt={found.offer.retrieved_at}
              matchConfidence={found.offer.match_confidence}
              url={found.offer.listing_url}
            />
          </div>
        ) : null}
      </header>

      <QueryBoundary
        isLoading={catalog.isLoading}
        error={catalog.error}
        skeleton={<PanelSkeleton rows={8} />}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="panel space-y-4 p-4">
            <h2 className="text-sm font-semibold">Inputs</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Purchase price"
                value={input.purchasePrice}
                onChange={num("purchasePrice")}
              />
              <Field
                label="Inbound shipping"
                value={input.inboundShipping}
                onChange={num("inboundShipping")}
              />
              <Field label="Tax paid" value={input.tax} onChange={num("tax")} />
              <Field label="Repair / prep" value={input.repairPrep} onChange={num("repairPrep")} />
              <Field label="Other costs" value={input.otherCosts} onChange={num("otherCosts")} />
              <Field
                label="Outbound shipping"
                value={input.outboundShipping}
                onChange={num("outboundShipping")}
              />
              <Field label="Packaging" value={input.packaging} onChange={num("packaging")} />
              <Field
                label="Returns reserve %"
                value={Math.round(input.returnsReservePct * 100)}
                onChange={(e) => set("returnsReservePct", (Number(e.target.value) || 0) / 100)}
              />
              <Field
                label="Target hold days"
                value={input.targetHoldDays}
                onChange={num("targetHoldDays")}
              />
              <Field
                label="Desired profit"
                value={input.desiredProfit}
                onChange={num("desiredProfit")}
              />

              <div>
                <Label className="label-meta">Marketplace</Label>
                <Select value={input.marketplace} onValueChange={(v) => set("marketplace", v)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_SCHEDULES.map((f) => (
                      <SelectItem key={f.marketplace} value={f.marketplace}>
                        {f.marketplace}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="label-meta">Condition</Label>
                <Select
                  value={input.conditionGrade}
                  onValueChange={(v) => set("conditionGrade", v)}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "new_sealed",
                      "open_box",
                      "refurbished",
                      "used_excellent",
                      "used_good",
                      "used_fair",
                      "for_parts",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <aside className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Verdict</h2>
              <ScoreGauge
                score={result.score.score}
                factors={result.score.factors}
                caption="Deal score"
                size={56}
              />
            </div>

            <RecommendationBadge rec={rec} showReason />

            <Line
              label="Item price"
              cell={
                <ValueCell
                  value={money2(economics.itemPrice)}
                  state={found ? "sourced" : "estimated"}
                  note={found ? "Quoted by the source listing" : "Your input"}
                />
              }
            />
            <Line
              label="Inbound shipping"
              cell={
                <ValueCell
                  value={money2(economics.shipping)}
                  state={economics.shipping > 0 ? "sourced" : "estimated"}
                  note={economics.shipping > 0 ? "Quoted shipping" : "Free or unstated shipping"}
                />
              }
            />
            <Line
              label="Tax"
              cell={
                <ValueCell
                  value={money2(economics.tax)}
                  state={economics.taxProvided ? "sourced" : "missing"}
                  note="No tax figure provided — not assumed to be zero"
                />
              }
            />
            <Line
              label="Marketplace + payment fees"
              cell={
                <ValueCell
                  value={money2(economics.resaleFees)}
                  state="estimated"
                  note={`${input.marketplace} fee schedule applied to the expected resale`}
                />
              }
            />
            <Line
              label="Landed cost (all-in)"
              strong
              cell={
                <ValueCell
                  value={money2(economics.landedCost)}
                  state={economics.taxProvided ? "sourced" : "estimated"}
                  note={
                    economics.taxProvided
                      ? "Item + shipping + tax + prep + other costs"
                      : "Excludes tax that was never provided"
                  }
                />
              }
            />
            <Line
              label="Median sold"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" note="No completed sales on record" />
                ) : (
                  <ValueCell
                    value={money2(economics.medianSold)}
                    note={`${economics.sampleSize} comps`}
                  />
                )
              }
            />
            <Line
              label="Comp range"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" />
                ) : (
                  <ValueCell
                    value={`${money2(economics.lowSold)} – ${money2(economics.highSold)}`}
                    note="Low / high completed sale"
                  />
                )
              }
            />
            <Line
              label="Expected resale"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" note="Needs comps to estimate resale" />
                ) : (
                  <ValueCell
                    value={money2(economics.expectedResale)}
                    state="estimated"
                    note="Condition-adjusted from completed sales"
                  />
                )
              }
            />
            <Line
              label="Net proceeds"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" />
                ) : (
                  <ValueCell
                    value={money2(economics.netProceeds)}
                    state="estimated"
                    note="After fees, outbound shipping, packaging and returns reserve"
                  />
                )
              }
            />
            <Line
              label="Expected profit"
              strong
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" />
                ) : (
                  <span
                    className={`num text-sm font-semibold ${economics.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                  >
                    {money2(economics.expectedProfit)}
                  </span>
                )
              }
            />
            <Line
              label="ROI"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" />
                ) : (
                  <ValueCell value={`${economics.roiPct.toFixed(1)}%`} state="estimated" />
                )
              }
            />
            <Line
              label="Break-even buy price"
              cell={
                noComps ? (
                  <ValueCell value="" state="missing" />
                ) : (
                  <ValueCell
                    value={money2(result.breakEvenPurchasePrice)}
                    state="estimated"
                    note={`At your ${money2(input.desiredProfit)} profit target`}
                  />
                )
              }
            />
            <Line
              label="Est. days to sell"
              cell={<ValueCell value={`${economics.daysToSell}d`} state="estimated" />}
            />

            {result.flags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {result.flags.map((f) => (
                  <Chip key={f} tone="caution">
                    {f}
                  </Chip>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                disabled={saveEvaluation.isPending}
                onClick={() =>
                  saveEvaluation.mutate({
                    label: found?.variant.productName ?? "Manual evaluation",
                    variantId: found?.variant.variantId ?? null,
                    offerId: found?.offer.id ?? null,
                    economics,
                    recommendation: rec,
                    input: input as unknown as Record<string, unknown>,
                    marketplace: input.marketplace,
                  })
                }
              >
                Save evaluation
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToPipeline.mutate()}
                disabled={addToPipeline.isPending}
              >
                Add to pipeline
              </Button>
            </div>
          </aside>
        </div>
      </QueryBoundary>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Saved evaluations</h2>
        <div className="mt-2">
          <QueryBoundary
            isLoading={saved.isLoading}
            error={saved.error}
            isEmpty={(saved.data ?? []).length === 0}
            skeleton={<PanelSkeleton rows={3} />}
            empty={
              <EmptyState
                title="Nothing saved yet"
                body="Run a calculation above and save it to keep the assumptions, verdict and numbers on record."
              />
            }
          >
            <ul className="divide-y divide-border">
              {(saved.data ?? []).slice(0, 10).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{e.label ?? "Evaluation"}</span>
                  <ValueCell
                    value={money2(e.profit ?? 0)}
                    state={e.profit == null ? "missing" : "estimated"}
                  />
                  <ValueCell
                    value={`${(e.roi_pct ?? 0).toFixed(1)}% ROI`}
                    state={e.roi_pct == null ? "missing" : "estimated"}
                    className="text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(e.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </QueryBoundary>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label className="label-meta">{label}</Label>
      <Input className="num mt-1 h-9" inputMode="decimal" value={value} onChange={onChange} />
    </div>
  );
}

function Line({ label, cell, strong }: { label: string; cell: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <span className="label-meta">{label}</span>
      <span className={`text-sm ${strong ? "font-semibold" : ""}`}>{cell}</span>
    </div>
  );
}
