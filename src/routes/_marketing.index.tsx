import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CTABand, FaqBlock, StatStrip, faqJsonLd } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { PILLARS } from "@/content/pillars";

const HOME_FAQ = [
  {
    q: "Where does the data come from?",
    a: "Registered sources with stated refresh policies. Every record shown carries its source name, retrieval timestamp and match confidence in the evidence drawer.",
  },
  {
    q: "Is market value based on active listings?",
    a: "No. Fair market value comes only from completed sales, using a recency-weighted median with outlier trimming.",
  },
  {
    q: "Do I need to be a reseller to use it?",
    a: "No. Buyer mode optimizes landed cost, fit and trust. Reseller mode adds fee modelling, ROI, liquidity and a sourcing pipeline.",
  },
  {
    q: "What happens when data is missing?",
    a: "It is labelled missing. MarginMap never imputes a tax rate or borrows an adjacent condition grade's median to fill a gap.",
  },
];

export const Route = createFileRoute("/_marketing/")({
  head: () => ({
    meta: [
      { title: "MarginMap — Product intelligence for buyers and resellers" },
      {
        name: "description",
        content:
          "Search products in plain language, compare landed cost against completed sales, and check resale margin before you buy. Every number opens its evidence.",
      },
      { property: "og:title", content: "MarginMap — Product intelligence for buyers and resellers" },
      {
        property: "og:description",
        content:
          "Landed cost, sold comps and reseller margin in one workspace. Every number opens its evidence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pixel-perfect-render-330.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://pixel-perfect-render-330.lovable.app/" }],
    scripts: [{ type: "application/ld+json", children: faqJsonLd(HOME_FAQ) }],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    t: "Describe what you want",
    d: "Plain language in, parsed intent out: category, price ceiling, condition floor, brand constraints. The parse is shown, so you can correct it.",
  },
  {
    n: "02",
    t: "See landed cost against sold comps",
    d: "Offers resolve to one canonical variant, total to item plus shipping plus tax, and rank against a recency-weighted median of completed sales.",
  },
  {
    n: "03",
    t: "Decide, then track",
    d: "Buyers get a value score with its factor breakdown. Resellers get net proceeds, ROI, breakeven and a seven-stage pipeline.",
  },
];

function Landing() {
  return (
    <>
      <section className="grid-noise border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="label-meta">Product intelligence workspace</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Know the real cost before you buy — and the real margin before you resell.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            MarginMap normalizes messy listings into canonical products, computes landed cost, and
            scores each offer against completed-sale comps. Buyer mode optimizes the purchase.
            Reseller mode optimizes the exit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Open the workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app/search" search={{ q: "full-frame mirrorless under $2000" }}>
                See a sample search
              </Link>
            </Button>
          </div>

          <StatStrip
            className="mt-12 sm:grid-cols-4"
            items={[
              { label: "Priced on", value: "Landed cost", note: "item + shipping + tax, per offer" },
              { label: "Valued on", value: "Sold comps", note: "recency-weighted median, IQR trimmed" },
              { label: "Every figure", value: "Auditable", note: "source, timestamp, match confidence" },
              { label: "Guessed values", value: "None", note: "missing data is labelled missing" },
            ]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.n} className="panel p-5">
              <span className="num label-meta">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
          <article className="panel p-6">
            <p className="label-meta">Buyer mode</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Optimize the purchase</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Landed cost ranking instead of sticker-price ranking.</li>
              <li>Value score against completed sales, with the factor weights exposed.</li>
              <li>Seller trust, fulfillment speed and return terms as explicit lines.</li>
              <li>Condition normalized onto one ladder across every source.</li>
            </ul>
          </article>
          <article className="panel p-6">
            <p className="label-meta">Reseller mode</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Optimize the exit</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Net proceeds after commission, processing, shipping and promotion.</li>
              <li>ROI on total capital deployed, annualized by observed days-to-sell.</li>
              <li>Breakeven purchase price as a negotiating position.</li>
              <li>Seven-stage pipeline from watch to sold, with realized-vs-estimate feedback.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">The eight things it gets right</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Each of these is a design decision with a price consequence. Read the reasoning before you
          trust the output.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Link
              key={p.slug}
              to={`/${p.slug}` as never}
              className="panel p-5 transition-colors hover:border-border-strong"
            >
              <p className="label-meta">{p.kicker}</p>
              <h3 className="mt-2 text-sm font-semibold">{p.nav}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Questions people ask first</h2>
        <div className="mt-4">
          <FaqBlock items={HOME_FAQ} />
        </div>
      </section>

      <CTABand />
    </>
  );
}
