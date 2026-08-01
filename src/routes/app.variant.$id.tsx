import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { OfferTable } from "@/components/offer-table";
import { Chip, ConditionChip, ConfidenceMeter, Disclaimer } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, liquidityOf } from "@/lib/catalog";
import { money, money2, relativeTime } from "@/lib/format";
import { runResearch } from "@/lib/research.functions";
import { useRoleMode } from "@/lib/role-mode";
import { reportsQuery, watchlistsQuery } from "@/lib/workspace";

export const Route = createFileRoute("/app/variant/$id")({
  component: VariantPage,
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Product not found.</p>,
});

function VariantPage() {
  const { id } = Route.useParams();
  const { mode } = useRoleMode();
  const qc = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const reports = useQuery(reportsQuery);
  const watchlists = useQuery(watchlistsQuery);
  const research = useServerFn(runResearch);

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

  const watch = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      let listId = watchlists.data?.[0]?.id;
      if (!listId) {
        const { data, error } = await supabase
          .from("watchlists")
          .insert({ user_id: auth.user.id, name: "My watchlist", role_mode: mode })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        listId = data.id;
      }
      const { error } = await supabase.from("watchlist_items").insert({
        user_id: auth.user.id,
        watchlist_id: listId,
        variant_id: id,
        target_price: target ? Number(target) : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Added to watchlist");
      setTarget("");
      qc.invalidateQueries({ queryKey: ["watchlist_items"] });
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (catalog.isLoading) return <p className="text-sm text-muted-foreground">Loading intel…</p>;
  if (!variant) throw notFound();

  const liquidity = liquidityOf(variant);
  const variantReports = (reports.data ?? []).filter((r) => r.variant_id === id);

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
          <Metric label="Comp median" value={money(variant.stats.medianSold)} />
          <Metric
            label="Comp range"
            value={`${money(variant.stats.low)} – ${money(variant.stats.high)}`}
          />
          <Metric label="Completed sales" value={String(liquidity.completedSales)} />
          <Metric label="Est. days to sell" value={`${liquidity.daysToSell}d`} />
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
          <Button size="sm" variant="outline" onClick={() => watch.mutate()} disabled={watch.isPending}>
            Add to watchlist
          </Button>
          {mode === "reseller" && variant.offers[0] ? (
            <Button asChild size="sm">
              <Link to="/app/evaluate" search={{ offer: variant.offers[0].id }}>
                Evaluate deal
              </Link>
            </Button>
          ) : null}
        </div>
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
                  <td className="num py-2 pr-2">{money2(c.shipping_paid)}</td>
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

        <div className="mt-4 space-y-3">
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
      </section>

      <Disclaimer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="label-meta">{label}</p>
      <p className="num mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
