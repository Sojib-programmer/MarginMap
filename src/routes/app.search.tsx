import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { Chip, ConfidenceMeter, Disclaimer, FreshnessBadge } from "@/components/primitives";
import { ScoreGauge } from "@/components/score-gauge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, liquidityOf } from "@/lib/catalog";
import { money, money2 } from "@/lib/format";
import { matchVariants, parseIntent } from "@/lib/intent";
import { useRoleMode } from "@/lib/role-mode";
import { buyerScore, DEFAULT_DEAL_INPUT, evaluateDeal, landedCost } from "@/lib/scoring";

export const Route = createFileRoute("/app/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);
  const qc = useQueryClient();
  const logged = useRef<string | null>(null);

  const variants = catalog.data?.variants ?? [];
  const intent = useMemo(() => parseIntent(q, variants), [q, variants]);
  const matches = useMemo(() => matchVariants(intent, variants), [intent, variants]);

  const logSearch = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      await supabase.from("searches").insert({
        user_id: auth.user.id,
        raw_query: q,
        role_mode: mode,
        parsed_intent: intent as never,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["searches"] }),
  });

  useEffect(() => {
    if (q.trim().length > 1 && variants.length && logged.current !== q) {
      logged.current = q;
      logSearch.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, variants.length]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="label-meta">Search</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {q.trim() ? `“${q}”` : "Describe what you want"}
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {intent.keywords.map((k) => (
            <Chip key={k}>{k}</Chip>
          ))}
          {intent.priceCeiling ? (
            <Chip tone="primary" className="num">
              ≤ {money(intent.priceCeiling)}
            </Chip>
          ) : null}
          {intent.priceFloor ? (
            <Chip tone="primary" className="num">
              ≥ {money(intent.priceFloor)}
            </Chip>
          ) : null}
          {intent.conditions.map((c) => (
            <Chip key={c} tone="verified">
              {c.replace(/_/g, " ")}
            </Chip>
          ))}
          {intent.brand ? <Chip tone="verified">{intent.brand}</Chip> : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Interpretation is lexical and shown above so you can correct it — nothing is inferred
          silently.
        </p>
      </header>

      {catalog.isLoading ? <p className="text-sm text-muted-foreground">Loading catalog…</p> : null}

      {!catalog.isLoading && matches.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm font-medium">No canonical products matched.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try fewer words, or drop the price bound. The demo catalog covers cameras, laptops,
            consoles, collectibles and guitars.
          </p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {matches.map(({ variant, relevance, explanation }) => {
          const offer = variant.offers[0];
          const liquidity = liquidityOf(variant);
          const score = offer ? buyerScore(offer, variant.stats) : null;
          const deal = offer
            ? evaluateDeal(
                {
                  ...DEFAULT_DEAL_INPUT,
                  purchasePrice: Number(offer.item_price),
                  inboundShipping: Number(offer.shipping_price),
                  tax: Number(offer.estimated_tax),
                  conditionGrade: offer.condition_grade,
                },
                variant.stats,
                liquidity,
              )
            : null;

          return (
            <li key={variant.variantId} className="panel p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/app/variant/$id"
                    params={{ id: variant.variantId }}
                    className="text-base font-semibold hover:underline"
                  >
                    {variant.productName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {variant.variantTitle} · {variant.brand} · {variant.category}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{explanation}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip className="num" tone="primary">
                      best landed {offer ? money(landedCost(offer)) : "n/a"}
                    </Chip>
                    <Chip className="num">comp median {money(variant.stats.medianSold)}</Chip>
                    <Chip className="num">
                      {variant.comps.length} sold · {variant.offers.length} offers
                    </Chip>
                    {offer ? <FreshnessBadge iso={offer.retrieved_at} /> : null}
                    <Chip>relevance {(relevance * 100).toFixed(0)}%</Chip>
                  </div>

                  <div className="mt-3 max-w-xs">
                    <ConfidenceMeter value={variant.stats.confidence} label="Comp confidence" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <EvidenceDrawer variant={variant} sources={catalog.data?.sources ?? []} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/app/variant/$id" params={{ id: variant.variantId }}>
                        Open intel
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  {mode === "buyer" && score ? (
                    <ScoreGauge
                      score={score.score}
                      factors={score.factors}
                      caption="Buyer value"
                      size={72}
                    />
                  ) : null}
                  {mode === "reseller" && deal ? (
                    <>
                      <p
                        className={`num text-xl font-semibold ${deal.expectedProfit >= 0 ? "text-verified" : "text-destructive"}`}
                      >
                        {money2(deal.expectedProfit)}
                      </p>
                      <p className="label-meta">
                        {deal.roiPct.toFixed(1)}% ROI · {deal.daysToSell}d
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{deal.verdict}</p>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Disclaimer />
    </div>
  );
}
