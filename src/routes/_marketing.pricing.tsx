import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { FaqBlock, PageHero } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { cadenceLabel, PRICING, priceLabel } from "@/lib/entitlements";
import { faqJsonLdScript, pageHead } from "@/lib/seo";

const FAQ = [
  {
    q: "Is there a free tier?",
    a: "Yes. Free covers 5 searches a day, up to 3 watchlists and 2 of the 3 marketplace sources, with the evidence drawer on every number. Reseller tooling — the deal calculator, pipeline, alerts and export — starts on Pro.",
  },
  {
    q: "How is Pro priced?",
    a: "$9.99 per seat monthly, or $99 a year. We do not price on transaction volume and we never take a percentage of your margin — that would give us an incentive to make optimistic numbers look better than they are.",
  },
  {
    q: "What does Business add over Pro?",
    a: "Up to 5 seats with roles, unlimited watchlists and alerts, 1,000 API calls a month, 90-day history, PDF reports and a shared, append-only workspace activity log.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes, effective at the end of the current billing period. Your saved evaluations, watchlists and pipeline stay readable on the Free tier.",
  },
  {
    q: "Who can see my sourcing data?",
    a: "Records belong to a workspace, so other members of that workspace see them according to their role. We never sell your data or use it to build a public dataset.",
  },
];

export const Route = createFileRoute("/_marketing/pricing")({
  head: () => ({
    ...pageHead({
      path: "/pricing",
      title: "Pricing — Free, Pro $9.99 and Business plans | MarginMap",
      description:
        "Free product research for buyers, Pro at $9.99 per month for resellers, Business for teams. No transaction fees and no percentage of your margin.",
    }),
    scripts: faqJsonLdScript(FAQ),
  }),
  component: PricingPage,
});

function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <>
      <PageHero
        kicker="Pricing"
        title="Flat pricing, because we should not profit from your optimism"
        lede="Free for buyers checking a single listing. Flat per-seat subscriptions above that — never a cut of your margin, never a transaction fee, never a volume ladder that punishes a good month."
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div
          className="inline-flex rounded-md border border-border p-1"
          role="group"
          aria-label="Billing interval"
        >
          {(["monthly", "annual"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              aria-pressed={interval === option}
              className={
                interval === option
                  ? "rounded-sm bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-sm px-3 py-1 text-xs font-medium text-muted-foreground"
              }
            >
              {option === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {PRICING.map((t) => (
            <section
              key={t.id}
              className={
                t.highlight ? "panel border-border-strong p-6 ring-1 ring-primary/40" : "panel p-6"
              }
            >
              <h2 className="label-meta">{t.name}</h2>
              <p className="num mt-2 text-3xl font-semibold tracking-tight">
                {priceLabel(t, interval)}
              </p>
              <p className="text-xs text-muted-foreground">
                {cadenceLabel(t, interval)}
                {interval === "annual" && t.annualSavingsPct
                  ? ` · save ${t.annualSavingsPct}%`
                  : ""}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>
              <ul className="mt-5 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={t.highlight ? "default" : "outline"}>
                <Link to={t.id === "free" ? "/auth" : "/contact"}>{t.cta}</Link>
              </Button>
            </section>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Paid plans are activated by our team while self-serve checkout is being finished — we will
          not charge a card through a flow we have not fully tested.
        </p>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight">Pricing questions</h2>
          <div className="mt-4">
            <FaqBlock items={FAQ} />
          </div>
        </section>
      </div>
    </>
  );
}
