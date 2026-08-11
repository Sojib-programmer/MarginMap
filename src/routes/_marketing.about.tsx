import { createFileRoute, Link } from "@tanstack/react-router";

import { CTABand, PageHero, StatStrip } from "@/components/marketing";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/about")({
  head: () =>
    pageHead({
      path: "/about",
      title: "About MarginMap — evidence-first product pricing",
      description:
        "Why MarginMap exists, who it is built for, and the principles behind every number it shows: canonical identity, landed cost, and completed-sale evidence.",
    }),
  component: AboutPage,
});

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "The problem we started with",
    body: [
      "Buying decisions and resale decisions both fail in the same place: the number people compare is not the number they pay. A listing price is not landed cost, an asking price is not a market price, and two listings with the same title are frequently not the same physical product.",
      "Every marketplace optimises for browsing. None of them optimise for the question that actually matters — is this specific unit, at this specific total cost, a good trade right now?",
    ],
  },
  {
    heading: "What MarginMap is",
    body: [
      "MarginMap is a decision workspace, not a price tracker. It resolves listings to canonical product variants, normalises every offer to landed cost, compares that cost against recency-weighted completed sales, and expresses the result as a score that can be opened and inspected.",
      "Buyers see value, fit certainty, condition risk and seller trust. Resellers see expected profit, ROI, breakeven and liquidity after marketplace fees. Both see the same underlying evidence.",
    ],
  },
  {
    heading: "Principles we do not bend",
    body: [
      "No number ships without its evidence. Every score, median and margin can be expanded to the raw offers, completed sales and snapshots that produced it, along with how stale each one is.",
      "Confidence is a first-class output. When identity resolution is weak or comparable sales are thin, the interface says so instead of rounding uncertainty into a confident-looking figure.",
      "Deterministic maths, language models on top. Scoring is plain arithmetic you can audit. The analyst layer explains and summarises — it never invents the underlying numbers.",
    ],
  },
  {
    heading: "Who uses it",
    body: [
      "Individual buyers making a considered purchase on a camera, laptop, console or instrument, who want to know whether a specific listing is fair once shipping, tax and condition are priced in.",
      "Resellers and small sourcing teams running volume, who need per-unit margin, fee-accurate net proceeds and a pipeline that survives contact with reality.",
    ],
  },
];

function AboutPage() {
  return (
    <>
      <PageHero
        kicker="Company"
        title="We build the number you actually pay"
        lede="MarginMap exists because listing prices are the least useful number in a transaction. Everything here is organised around producing a defensible total cost and a defensible market value — and showing the evidence for both."
      >
        <StatStrip
          className="mt-8"
          items={[
            {
              label: "Categories seeded",
              value: "5",
              note: "cameras, laptops, consoles, collectibles, guitars",
            },
            {
              label: "Scoring inputs",
              value: "6",
              note: "price, fit, condition, trust, fulfillment, confidence",
            },
            {
              label: "Evidence policy",
              value: "100%",
              note: "every score opens to its source rows",
            },
          ]}
        />
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="label-meta">Go deeper</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Link
              to="/methodology"
              className="panel p-4 transition-colors hover:border-border-strong"
            >
              <span className="block text-sm font-medium">Methodology</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                How every figure is produced
              </span>
            </Link>
            <Link
              to="/evidence-and-data-confidence"
              className="panel p-4 transition-colors hover:border-border-strong"
            >
              <span className="block text-sm font-medium">Evidence & confidence</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                What we do with thin data
              </span>
            </Link>
            <Link to="/pricing" className="panel p-4 transition-colors hover:border-border-strong">
              <span className="block text-sm font-medium">Pricing</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Plans and what each includes
              </span>
            </Link>
          </div>
        </section>
      </div>

      <CTABand />
    </>
  );
}
