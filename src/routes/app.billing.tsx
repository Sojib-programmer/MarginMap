import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { Chip, Disclaimer } from "@/components/primitives";
import { RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/upgrade-button";
import { catalogQuery } from "@/lib/catalog";
import {
  cadenceLabel,
  formatLimit,
  isUnlimited,
  PLAN_LABEL,
  PRICING,
  priceLabel,
  usageQuery,
} from "@/lib/entitlements";
import { hasPaidPlan, limitsOf, ROLE_LABEL, useMembership } from "@/lib/membership";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plans | MarginMap" },
      {
        name: "description",
        content: "Manage MarginMap workspace subscriptions, usage, invoices, and billing.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Billing & Plans | MarginMap" },
      {
        property: "og:description",
        content: "Manage MarginMap workspace subscriptions, usage, invoices, and billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: BillingPage,
});

function BillingPage() {
  const { membership } = useMembership();
  const catalog = useQuery(catalogQuery(membership?.workspaceId ?? null));
  const usage = useQuery(usageQuery(membership?.workspaceId ?? null));
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [portalBusy, setPortalBusy] = useState(false);
  const openPortal = useServerFn(createPortalSession);

  const limits = limitsOf(membership);
  const sources = catalog.data?.sources ?? [];
  const liveSources = sources.filter((s) => s.active).length;
  const searchesUsed = usage.data?.searchesUsed ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PaymentTestModeBanner />
      <header>
        <p className="label-meta">Billing</p>
        <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan entitlements are enforced by the database — locked pages refuse writes at the API
          level, and daily search quotas are counted server-side, not in this UI.
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
            {membership && !hasPaidPlan(membership) ? (
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
      </section>

      {membership && hasPaidPlan(membership) ? (
        <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="label-meta">Subscription</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Update payment details, view invoices, or schedule cancellation in Stripe.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={portalBusy || !paymentsConfigured()}
            onClick={async () => {
              setPortalBusy(true);
              try {
                const result = await openPortal({
                  data: {
                    workspaceId: membership.workspaceId,
                    environment: getStripeEnvironment(),
                    returnUrl: window.location.href,
                  },
                });
                if ("error" in result) throw new Error(result.error);
                window.open(result.url, "_blank", "noopener,noreferrer");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Billing portal unavailable.");
              } finally {
                setPortalBusy(false);
              }
            }}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {portalBusy ? "Opening…" : "Manage billing"}
          </Button>
        </section>
      ) : null}

      <section className="panel p-4">
        <p className="label-meta">Usage this period</p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-4">
          <UsageStat
            label="Searches today"
            used={searchesUsed}
            cap={limits.searchesPerDay}
            note="Resets at midnight UTC"
          />
          <UsageStat
            label="Watchlists"
            cap={limits.watchlists}
            note={isUnlimited(limits.watchlists) ? "No cap" : "Cap enforced on create"}
          />
          <UsageStat
            label="Price alerts"
            cap={limits.alerts}
            note={limits.alerts === 0 ? "Locked on Free" : "Cap enforced on create"}
          />
          <UsageStat
            label="API calls / month"
            used={usage.data?.apiCallsUsed ?? 0}
            cap={limits.apiCallsPerMonth}
            note={limits.apiCallsPerMonth === 0 ? "Business plan feature" : "Rolls over monthly"}
          />
        </dl>
      </section>

      <div className="flex items-center justify-center gap-2">
        <span className="label-meta">Billing</span>
        <div
          role="radiogroup"
          aria-label="Billing interval"
          className="inline-flex rounded-lg border border-border bg-surface p-1"
        >
          {(["monthly", "annual"] as const).map((i) => (
            <button
              key={i}
              role="radio"
              aria-checked={interval === i}
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                interval === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {i}
            </button>
          ))}
        </div>
        {interval === "annual" ? (
          <Chip tone="verified">save up to 25%</Chip>
        ) : (
          <span className="text-xs text-muted-foreground">annual saves 17–25%</span>
        )}
      </div>

      <section className="grid gap-3 lg:grid-cols-4">
        {PRICING.map((t) => {
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
                <h2 className="text-sm font-semibold">{t.name}</h2>
                {current ? <Chip tone="verified">current</Chip> : null}
              </div>
              <p className="num mt-2 text-2xl font-semibold">{priceLabel(t, interval)}</p>
              <p className="text-[11px] text-muted-foreground">{cadenceLabel(t, interval)}</p>
              {interval === "annual" && t.annualSavingsPct ? (
                <p className="mt-1 text-[11px] text-verified">save {t.annualSavingsPct}%</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">{t.tagline}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-verified" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              {current ? null : t.id === "enterprise" ? (
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              ) : t.id === "free" ? (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Downgrades take effect at the end of the billing period.
                </p>
              ) : (
                <UpgradeButton tier={t.id} interval={interval} className="mt-4" label={t.cta} />
              )}
            </article>
          );
        })}
      </section>

      <section className="panel p-4">
        <p className="label-meta">Workspace context</p>
        <div className="mt-2 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            {liveSources} registered source{liveSources === 1 ? "" : "s"} — see{" "}
            <Link to="/app/data-sources" className="underline underline-offset-2">
              Data sources
            </Link>{" "}
            for status and refresh cadence.
            {limits.marketplaces < 3 ? (
              <span className="mt-1 flex items-center gap-1 text-xs text-caution">
                <Lock className="size-3" aria-hidden /> Free shows {limits.marketplaces} of 3
                marketplaces.
              </span>
            ) : null}
          </p>
          <p>
            Every workspace write is attributed in the{" "}
            <Link to="/app/activity" className="underline underline-offset-2">
              activity log
            </Link>
            . Seats on this plan: {formatLimit(limits.seats)}.
          </p>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Subscriptions are billed through Stripe. Cancel any time — access continues to the end of
        the paid period, and your saved evaluations, watchlists and pipeline stay readable on Free.
        Refunds are available within 30 days of a charge.
      </p>

      <Disclaimer />
    </div>
  );
}

function UsageStat({
  label,
  used,
  cap,
  note,
}: {
  label: string;
  used?: number;
  cap: number;
  note: string;
}) {
  const unlimited = isUnlimited(cap);
  const pct = unlimited || cap === 0 ? 0 : Math.min(100, ((used ?? 0) / cap) * 100);
  return (
    <div>
      <dt className="label-meta">{label}</dt>
      <dd className="num mt-1 text-lg font-semibold">
        {used === undefined ? formatLimit(cap) : `${used} / ${unlimited ? "∞" : cap}`}
      </dd>
      {used !== undefined && !unlimited && cap > 0 ? (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", pct >= 100 ? "bg-caution" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
