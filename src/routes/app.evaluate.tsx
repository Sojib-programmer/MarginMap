import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Disclaimer } from "@/components/primitives";
import { ScoreGauge } from "@/components/score-gauge";
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
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, liquidityOf } from "@/lib/catalog";
import { money2, relativeTime } from "@/lib/format";
import {
  DEFAULT_DEAL_INPUT,
  evaluateDeal,
  FEE_SCHEDULES,
  type DealInput,
} from "@/lib/scoring";
import { evaluationsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/evaluate")({
  validateSearch: (search: Record<string, unknown>) => ({
    offer: typeof search["offer"] === "string" ? (search["offer"] as string) : undefined,
  }),
  component: EvaluatePage,
});

function EvaluatePage() {
  const { offer: offerId } = Route.useSearch();
  const qc = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const saved = useQuery(evaluationsQuery);

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

  const set = <K extends keyof DealInput>(k: K, v: DealInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));
  const num = (k: keyof DealInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (Number(e.target.value) || 0) as never);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("deal_evaluations").insert({
        user_id: auth.user.id,
        variant_id: found?.variant.variantId ?? null,
        offer_id: found?.offer.id ?? null,
        label: found?.variant.productName ?? "Manual evaluation",
        input: input as never,
        assumptions: { feeSchedule: input.marketplace, scoreFactors: result.score.factors } as never,
        profit: result.expectedProfit,
        roi_pct: result.roiPct,
        score: result.score.score,
        net_proceeds: result.netProceeds,
        expected_sale_low: result.expectedLow,
        expected_sale_mid: result.expectedGrossSale,
        expected_sale_high: result.expectedHigh,
        days_to_sell_estimate: result.daysToSell,
        confidence: stats.confidence,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Evaluation saved");
      qc.invalidateQueries({ queryKey: ["deal_evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="panel space-y-4 p-4">
          <h2 className="text-sm font-semibold">Inputs</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Purchase price" value={input.purchasePrice} onChange={num("purchasePrice")} />
            <Field label="Inbound shipping" value={input.inboundShipping} onChange={num("inboundShipping")} />
            <Field label="Tax paid" value={input.tax} onChange={num("tax")} />
            <Field label="Repair / prep" value={input.repairPrep} onChange={num("repairPrep")} />
            <Field label="Other costs" value={input.otherCosts} onChange={num("otherCosts")} />
            <Field label="Outbound shipping" value={input.outboundShipping} onChange={num("outboundShipping")} />
            <Field label="Packaging" value={input.packaging} onChange={num("packaging")} />
            <Field
              label="Returns reserve %"
              value={Math.round(input.returnsReservePct * 100)}
              onChange={(e) => set("returnsReservePct", (Number(e.target.value) || 0) / 100)}
            />
            <Field label="Target hold days" value={input.targetHoldDays} onChange={num("targetHoldDays")} />
            <Field label="Desired profit" value={input.desiredProfit} onChange={num("desiredProfit")} />

            <div>
              <Label className="label-meta">Marketplace</Label>
              <Select value={input.marketplace} onValueChange={(v) => set("marketplace", v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_SCHEDULES.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="label-meta">Condition</Label>
              <Select value={input.conditionGrade} onValueChange={(v) => set("conditionGrade", v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["new_sealed", "open_box", "refurbished", "used_excellent", "used_good", "used_fair", "for_parts"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <aside className="panel space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Outcome</h2>
            <ScoreGauge
              score={result.score.score}
              factors={result.score.factors}
              caption="Deal score"
              size={56}
            />
          </div>
          <Line label="Expected sale (mid)" value={money2(result.expectedGrossSale)} />
          <Line label="Range" value={`${money2(result.expectedLow)} – ${money2(result.expectedHigh)}`} />
          <Line label="Marketplace fee" value={`- ${money2(result.marketplaceFee)}`} />
          <Line label="Payment fee" value={`- ${money2(result.paymentFee)}`} />
          <Line label="Returns reserve" value={`- ${money2(result.returnsReserve)}`} />
          <Line label="Net proceeds" value={money2(result.netProceeds)} strong />
          <Line label="All-in cost" value={money2(result.allInCost)} />
          <Line
            label="Expected profit"
            value={money2(result.expectedProfit)}
            strong
            tone={result.expectedProfit >= 0 ? "verified" : "destructive"}
          />
          <Line label="ROI" value={`${result.roiPct.toFixed(1)}%`} />
          <Line label="Break-even buy price" value={money2(result.breakEvenPurchasePrice)} />
          <Line label="Est. days to sell" value={`${result.daysToSell}d`} />

          <p className="text-sm font-medium">{result.verdict}</p>
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
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
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

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Saved evaluations</h2>
        <ul className="mt-2 divide-y divide-border">
          {(saved.data ?? []).slice(0, 10).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{e.label ?? "Evaluation"}</span>
              <span className="num">{money2(e.profit ?? 0)}</span>
              <span className="num text-muted-foreground">{(e.roi_pct ?? 0).toFixed(1)}% ROI</span>
              <span className="text-xs text-muted-foreground">{relativeTime(e.created_at)}</span>
            </li>
          ))}
          {(saved.data ?? []).length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Nothing saved yet.</li>
          ) : null}
        </ul>
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

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "verified" | "destructive";
}) {
  const toneClass = tone === "verified" ? "text-verified" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
      <span className="label-meta">{label}</span>
      <span className={`num text-sm ${strong ? "font-semibold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}
