import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { FaqBlock, PageHero } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { faqJsonLdScript, pageHead } from "@/lib/seo";

const FAQ = [
  {
    q: "Is there a free tier?",
    a: "Yes. Research is free for individual buyers: search, canonical variant pages, landed cost, completed-sale comparables and the evidence drawer. Reseller tooling — the deal calculator, pipeline and alerts — is on the paid plans.",
  },
  {
    q: "How is the reseller plan priced?",
    a: "Flat monthly per seat. We do not price on transaction volume or take a percentage of your margin — that would give us an incentive to make optimistic numbers look better than they are.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes, effective at the end of the current billing period. Your saved evaluations, watchlists and pipeline remain readable on the free tier.",
  },
  {
    q: "Do you sell or share my sourcing data?",
    a: "No. Watchlists, evaluations, pipeline items and research reports are private to your account and are never sold, shared or used to build a public dataset.",
  },
];

const TIERS = [
  {
    name: "Research",
    price: "Free",
    cadence: "for individual buyers",
    body: "Everything needed to decide whether a single listing is a fair trade.",
    features: [
      "Plain-language search with visible intent parsing",
      "Canonical variant pages with landed cost",
      "Recency-weighted completed-sale comparables",
      "Buyer score with full factor breakdown",
      "Evidence drawer on every number",
      "Up to 2 watchlists",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Reseller",
    price: "$29",
    cadence: "per seat / month",
    body: "Margin-accurate sourcing for people buying to sell.",
    features: [
      "Everything in Research",
      "Deal calculator with per-marketplace fee schedules",
      "Expected profit, ROI, breakeven and liquidity",
      "Sourcing-to-sold pipeline",
      "Unlimited watchlists and landed-cost alerts",
      "AI analyst reports with cited evidence",
    ],
    cta: "Start reselling",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    cadence: "per seat / month",
    body: "Shared sourcing operations with an audit trail.",
    features: [
      "Everything in Reseller",
      "Shared watchlists and pipeline across seats",
      "Per-seat attribution on evaluations",
      "Saved fee schedules and cost presets",
      "Priority analyst throughput",
      "Export of evidence and evaluations",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

export const Route = createFileRoute("/_marketing/pricing")({
  head: () => ({
    ...pageHead({
      path: "/pricing",
      title: "Pricing — MarginMap",
      description:
        "Free product research for buyers, flat per-seat pricing for resellers and teams. No transaction fees and no percentage of your margin.",
    }),
    scripts: faqJsonLdScript(FAQ),
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <PageHero
        kicker="Pricing"
        title="Flat pricing, because we should not profit from your optimism"
        lede="Research is free. Reseller tooling is a flat per-seat subscription — never a cut of your margin, never a transaction fee, never a volume ladder that punishes a good month."
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((t) => (
            <section
              key={t.name}
              className={
                t.highlight
                  ? "panel border-border-strong p-6 ring-1 ring-primary/40"
                  : "panel p-6"
              }
            >
              <p className="label-meta">{t.name}</p>
              <p className="num mt-2 text-3xl font-semibold tracking-tight">{t.price}</p>
              <p className="text-xs text-muted-foreground">{t.cadence}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              <ul className="mt-5 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={t.highlight ? "default" : "outline"}>
                <Link to={t.name === "Team" ? "/contact" : "/auth"}>{t.cta}</Link>
              </Button>
            </section>
          ))}
        </div>

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
