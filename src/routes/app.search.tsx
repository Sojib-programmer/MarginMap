import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { FilterGroup } from "@/components/filter-bar";
import {
  Chip,
  ConfidenceMeter,
  DataAsOf,
  Disclaimer,
  FreshnessBadge,
  RecommendationBadge,
  ValueCell,
} from "@/components/primitives";
import { buildRows, ResultTable } from "@/components/result-table";
import { EmptyState, QueryBoundary, RouteError, TableSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAddToWatchlist, useSaveEvaluation, useSaveSearch } from "@/hooks/use-workspace-actions";
import {
  catalogQuery,
  filterCatalog,
  latestRetrievedAt,
  marketplaceIndex,
  marketplaceOptions,
  sourceNameIndex,
} from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
import { OFFER_CSV_HEADERS, offerCsvRows } from "@/lib/export-rows";
import { money, money2 } from "@/lib/format";
import { matchVariants, parseIntent } from "@/lib/intent";
import { useRoleMode } from "@/lib/role-mode";

const asList = (value: unknown): string[] =>
  typeof value === "string" && value.length
    ? value.split(",").filter(Boolean)
    : Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];

export const Route = createFileRoute("/app/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
    mk: asList(search["mk"]),
    cat: asList(search["cat"]),
  }),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: SearchPage,
});

function SearchPage() {
  const { q, mk, cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/app/search" });
  const { mode } = useRoleMode();
  const catalog = useQuery(catalogQuery);
  const logged = useRef<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");

  const saveSearch = useSaveSearch();
  const saveEvaluation = useSaveEvaluation();
  const addToWatchlist = useAddToWatchlist();

  const allVariants = useMemo(() => catalog.data?.variants ?? [], [catalog.data?.variants]);
  const sources = useMemo(() => catalog.data?.sources ?? [], [catalog.data?.sources]);
  const variants = useMemo(
    () => filterCatalog(allVariants, sources, { marketplaces: mk, categories: cat }),
    [allVariants, sources, mk, cat],
  );
  const intent = useMemo(() => parseIntent(q, variants), [q, variants]);
  const matches = useMemo(() => matchVariants(intent, variants), [intent, variants]);
  const rows = useMemo(
    () =>
      buildRows(
        matches.map((m) => m.variant),
        mode,
      ),
    [matches, mode],
  );

  const marketplaces = useMemo(() => marketplaceOptions(sources), [sources]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of allVariants) seen.set(v.categorySlug, v.category);
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }, [allVariants]);

  const toggleParam = (field: "mk" | "cat", key: string) =>
    navigate({
      search: (prev) => {
        const current = (prev[field] as string[] | undefined) ?? [];
        return {
          ...prev,
          [field]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
        };
      },
    });

  const clearParam = (field: "mk" | "cat") =>
    navigate({ search: (prev) => ({ ...prev, [field]: [] }) });

  const exportCsv = () => {
    const byMarketplace = marketplaceIndex(sources);
    const byName = sourceNameIndex(sources);
    downloadCsv(
      "search",
      OFFER_CSV_HEADERS,
      offerCsvRows(rows, {
        sourceName: (id) => byName.get(id) ?? "Unregistered source",
        marketplace: (id) => byMarketplace.get(id) ?? "other",
      }),
    );
  };

  useEffect(() => {
    if (q.trim().length > 1 && variants.length && logged.current !== q) {
      logged.current = q;
      saveSearch.mutate({ query: q, mode, intent, silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, variants.length]);

  const busy = saveEvaluation.isPending || addToWatchlist.isPending;


  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <p className="label-meta">Search</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {q.trim() ? `“${q}”` : "Describe what you want"}
        </h1>

        <div className="mt-2 grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3">
          <IntentField label="Product" value={intent.keywords.join(" ") || "not specified"} />
          <IntentField label="Brand" value={intent.brand ?? "any"} />
          <IntentField
            label="Condition"
            value={
              intent.conditions.length
                ? intent.conditions.map((c) => c.replace(/_/g, " ")).join(", ")
                : "any"
            }
          />
          <IntentField
            label="Budget ceiling"
            value={intent.priceCeiling ? money(intent.priceCeiling) : "none"}
          />
          <IntentField
            label="Budget floor"
            value={intent.priceFloor ? money(intent.priceFloor) : "none"}
          />
          <IntentField label="Source preference" value="all registered demo sources" />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Interpretation is lexical and shown above so you can correct it — nothing is inferred
            silently.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!q.trim() || saveSearch.isPending}
              onClick={() => saveSearch.mutate({ query: q, mode, intent })}
            >
              Save this search
            </Button>
            <div className="flex rounded-md border border-border p-0.5">
              {(["table", "cards"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`rounded px-2 py-1 text-xs capitalize ${
                    view === v ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <QueryBoundary
        isLoading={catalog.isLoading}
        error={catalog.error}
        isEmpty={matches.length === 0}
        skeleton={<TableSkeleton rows={6} />}
        empty={
          <EmptyState
            title="No canonical products matched"
            body="Try fewer words, or drop the price bound. The demo catalog covers cameras, laptops, consoles, collectibles and guitars."
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/app/search" search={{ q: "" }}>
                  Reset search
                </Link>
              </Button>
            }
          />
        }
      >
        {view === "table" ? (
          <ResultTable
            rows={rows}
            sources={sources}
            busy={busy}
            onAddToWatchlist={(row) =>
              addToWatchlist.mutate({
                variantId: row.variant.variantId,
                offerId: row.offer.id,
                mode,
              })
            }
            onSaveEvaluation={(row) =>
              saveEvaluation.mutate({
                label: `${row.variant.productName} — ${row.offer.title}`,
                variantId: row.variant.variantId,
                offerId: row.offer.id,
                economics: row.economics,
                recommendation: row.recommendation,
              })
            }
          />
        ) : (
          <ul className="space-y-4">
            {matches.map(({ variant, relevance, explanation }) => {
              const row = rows.find((r) => r.variant.variantId === variant.variantId);
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
                          best landed {row ? money(row.economics.landedCost) : "n/a"}
                        </Chip>
                        <Chip className="num">
                          comp median{" "}
                          {variant.stats.sampleSize
                            ? money(variant.stats.medianSold)
                            : "not provided"}
                        </Chip>
                        <Chip className="num">
                          {variant.comps.length} sold · {variant.offers.length} offers
                        </Chip>
                        {variant.offers[0] ? (
                          <FreshnessBadge iso={variant.offers[0].retrieved_at} />
                        ) : null}
                        <Chip>relevance {(relevance * 100).toFixed(0)}%</Chip>
                      </div>

                      {row ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          <Cell label="Fees" value={money2(row.economics.resaleFees)} est />
                          <Cell
                            label="Expected resale"
                            value={money2(row.economics.expectedResale)}
                            est
                            missing={row.economics.sampleSize === 0}
                          />
                          <Cell
                            label="Est. profit"
                            value={money2(row.economics.expectedProfit)}
                            missing={row.economics.sampleSize === 0}
                          />
                          <Cell
                            label="ROI"
                            value={`${row.economics.roiPct.toFixed(1)}%`}
                            missing={row.economics.sampleSize === 0}
                          />
                          <Cell
                            label="Tax"
                            value={money2(row.economics.tax)}
                            missing={!row.economics.taxProvided}
                          />
                        </div>
                      ) : null}

                      <div className="mt-3 max-w-xs">
                        <ConfidenceMeter value={variant.stats.confidence} label="Comp confidence" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <EvidenceDrawer variant={variant} sources={sources} />
                        <Button asChild size="sm" variant="outline">
                          <Link to="/app/variant/$id" params={{ id: variant.variantId }}>
                            Open intel
                          </Link>
                        </Button>
                        {row ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                addToWatchlist.mutate({
                                  variantId: variant.variantId,
                                  offerId: row.offer.id,
                                  mode,
                                })
                              }
                            >
                              Add to watchlist
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                saveEvaluation.mutate({
                                  label: `${variant.productName} — ${row.offer.title}`,
                                  variantId: variant.variantId,
                                  offerId: row.offer.id,
                                  economics: row.economics,
                                  recommendation: row.recommendation,
                                })
                              }
                            >
                              Save evaluation
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {row ? (
                      <div className="w-56">
                        <RecommendationBadge rec={row.recommendation} showReason />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBoundary>

      <Disclaimer />
    </div>
  );
}

function IntentField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function Cell({
  label,
  value,
  est,
  missing,
}: {
  label: string;
  value: string;
  est?: boolean;
  missing?: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="label-meta">{label}</p>
      <ValueCell
        className="mt-0.5 text-sm font-medium"
        value={value}
        state={missing ? "missing" : est ? "estimated" : "sourced"}
      />
    </div>
  );
}
