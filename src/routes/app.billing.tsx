import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Chip, Disclaimer } from "@/components/primitives";
import { RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { catalogQuery } from "@/lib/catalog";
import {
  hasResellerPlan,
  PLAN_LABEL,
  ROLE_LABEL,
  useMembership,
  type PlanTier,
} from "@/lib/membership";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/billing")({
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: BillingPage,
});

const TIERS: Array<{
  id: PlanTier;
  price: string;
  blurb: string;
  features: string[];
}> = [
  {
    id: "research",
    price: "$0",
    blurb: "Evidence-backed buying research.",
    features: [
      "Catalog search with landed cost",
      "Sold-comps baseline and value score",
      "Watchlists and target-price alerts",
      "AI analyst reports with citations",
    ],
  },
  {
    id: "reseller",
    price: "$29/mo",
    blurb: "Everything in Research, plus deal execution.",
    features: [
      "Deal calculator and saved evaluations",
      "Sourcing pipeline (watch → sold)",
      "ROI, fees and days-to-sell modeling",
      "CSV export of every table",
    ],
  },
  {
    id: "team",
    price: "$79/mo",
    blurb: "Everything in Reseller, for shared workspaces.",
    features: [
      "Multiple seats with role-based access",
      "Read-only auditor seats",
      "Workspace invitations",
      "Shared audit trail with attribution",
    ],
  },
];

function BillingPage() {
  const { membership } = useMembership();
  const catalog = useQuery(catalogQuery);
  const sources = catalog.data?.sources ?? [];
  const liveSources = sources.filter((s) => s.active).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="label-meta">Billing</p>
        <h1 className="text-2xl font-semibold tracking-tight">Plan & workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan entitlements are enforced by the database — hidden pages refuse writes at the API
          level, not just in this UI.
        </p>
      </header>

      <section className="panel grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="label-meta">Workspace</p>
          <p className="mt-1 font-medium">{membership?.workspaceName ?? "—"}</p>
        </div>
        <div>
          <p className="label-meta">Current plan</p>
          <p className="mt-1 font-medium">
            {membership ? PLAN_LABEL[membership.plan] : "—"}
            {membership && !hasResellerPlan(membership) ? (
              <Chip tone="caution" className="ml-2">
                deal tools locked
              </Chip>
            ) : null}
          </p>
        </div>
        <div>
          <p className="label-meta">Your seat</p>
          <p className="mt-1 font-medium">{membership ? ROLE_LABEL[membership.role] : "—"}</p>
        </div>
        <div>
          <p className="label-meta">Catalog</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveSources} registered source{liveSources === 1 ? "" : "s"} — see{" "}
            <Link to="/app/data-sources" className="underline underline-offset-2">
              Data sources
            </Link>{" "}
            for status and refresh cadence.
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="label-meta">Activity</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every workspace write is attributed in the{" "}
            <Link to="/app/activity" className="underline underline-offset-2">
              activity log
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {TIERS.map((t) => {
          const current = membership?.plan === t.id;
          return (
            <article
              key={t.id}
              className={cn(
                "panel flex flex-col p-4",
                current && "border-primary/60 ring-1 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{PLAN_LABEL[t.id]}</h2>
                {current ? <Chip tone="verified">current</Chip> : null}
              </div>
              <p className="num mt-2 text-2xl font-semibold">{t.price}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-verified" />
                    {f}
                  </li>
                ))}
              </ul>
              {!current ? (
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link to="/contact">Contact us to upgrade</Link>
                </Button>
              ) : null}
            </article>
          );
        })}
      </section>

      <p className="text-xs text-muted-foreground">
        Plan changes are applied to the workspace record server-side. Self-serve checkout is on the
        roadmap; today upgrades are provisioned by the team.
      </p>

      <Disclaimer />
    </div>
  );
}
