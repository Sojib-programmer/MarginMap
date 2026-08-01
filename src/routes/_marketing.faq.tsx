import { createFileRoute, Link } from "@tanstack/react-router";

import { CTABand, FaqBlock, PageHero } from "@/components/marketing";
import { PILLARS } from "@/content/pillars";
import { faqJsonLdScript, pageHead } from "@/lib/seo";

const GENERAL = [
  {
    q: "What does MarginMap actually do?",
    a: "It resolves marketplace listings to canonical product variants, normalises each offer to landed cost, compares that cost against recency-weighted completed sales, and scores the result for buyers or resellers — with the underlying evidence attached to every figure.",
  },
  {
    q: "Where does the data come from?",
    a: "Registered data sources with attribution and a refresh policy, visible in the workspace settings. Each offer, completed sale and market snapshot records its source and observation time, and the interface surfaces staleness rather than hiding it.",
  },
  {
    q: "Is the AI making up prices?",
    a: "No. All scoring, medians, landed cost and margin arithmetic is deterministic and auditable. The analyst layer reads those computed numbers plus the evidence rows and writes an explanation — it cannot originate a price.",
  },
  {
    q: "Do I need an account?",
    a: "The marketing pages are public. The workspace requires an account because watchlists, deal evaluations, pipeline items and research reports are private to you.",
  },
  {
    q: "Can I use it outside the seeded categories?",
    a: "The current catalog covers cameras, laptops, consoles, collectibles and guitars. The identity, landed-cost and comparables machinery is category-agnostic; coverage expands as sources are added.",
  },
];

const FAQ = [
  ...GENERAL,
  ...PILLARS.map((p) => p.faq[0]).filter((f): f is { q: string; a: string } => Boolean(f)),
];

export const Route = createFileRoute("/_marketing/faq")({
  head: () => ({
    ...pageHead({
      path: "/faq",
      title: "FAQ — MarginMap",
      description:
        "Answers about canonical product identity, landed cost, completed-sale comparables, data confidence, reseller margin and how MarginMap uses AI.",
    }),
    scripts: faqJsonLdScript(FAQ),
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <>
      <PageHero
        kicker="Support"
        title="Frequently asked questions"
        lede="The questions people ask before they trust a price. If the answer you need is about a specific mechanism, each platform page goes considerably deeper."
      />

      <div className="mx-auto max-w-4xl px-4 py-14">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">General</h2>
          <div className="mt-4">
            <FaqBlock items={GENERAL} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">By mechanism</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <Link
                key={p.slug}
                to={`/${p.slug}` as never}
                className="panel p-4 transition-colors hover:border-border-strong"
              >
                <span className="block text-sm font-medium">{p.nav}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{p.faq[0]?.q}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <CTABand />
    </>
  );
}
