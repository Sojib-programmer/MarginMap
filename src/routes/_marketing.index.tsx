import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CTABand, FaqBlock, StatStrip } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { PILLARS } from "@/content/pillars";
import { POSTS } from "@/content/posts";
import { faqJsonLdScript, organizationJsonLdScript, pageHead } from "@/lib/seo";
import studioImg from "@/assets/how-it-works-studio.jpg";

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-semibold text-primary" : ""}>{v}</span>
    </div>
  );
}

function StepIntent() {
  return (
    <>
      <p className="truncate">&gt; sony a7 iv body under $1,800</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {["variant: α7 IV", "ceiling: $1,800", "cond ≥ B", "match 96%"].map((c) => (
          <span key={c} className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5">
            {c}
          </span>
        ))}
      </div>
    </>
  );
}

function StepCost() {
  return (
    <div className="space-y-1">
      <Row k="item" v="$1,495.00" />
      <Row k="shipping" v="$24.00" />
      <Row k="tax (est.)" v="$104.65" />
      <div className="border-t border-border pt-1">
        <Row k="landed" v="$1,623.65" strong />
      </div>
      <Row k="sold median" v="$1,840.00" />
    </div>
  );
}

function StepVerdict() {
  return (
    <div className="space-y-1">
      <span className="inline-block rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
        BUY
      </span>
      <Row k="net after fees" v="+$118.40" strong />
      <Row k="ROI" v="7.3%" />
      <Row k="days to sell" v="~14" />
    </div>
  );
}

export const HOME_FAQ = [
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
  head: () => {
    const base = pageHead({
      path: "/",
      title: "MarginMap — Product intelligence for buyers and resellers",
      description:
        "Search products in plain language, compare landed cost against completed sales, and check resale margin before you buy. Every number opens its evidence.",
    });
    return {
      ...base,
      scripts: [...faqJsonLdScript(HOME_FAQ), ...organizationJsonLdScript()],
    };
  },
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

const HOME_TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    body: "5 searches a day, 3 watchlists, landed cost and completed-sale comparables.",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    cadence: "per seat / month",
    body: "Unlimited searches, reseller mode, deal calculator, alerts and CSV export.",
    highlight: true,
  },
  {
    name: "Business",
    price: "$49.99",
    cadence: "per seat / month",
    body: "Up to 5 seats with roles, unlimited alerts, API access and 90-day history.",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "contact sales",
    body: "Unlimited seats and API, custom integrations, SSO and an uptime SLA.",
    highlight: false,
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
              {
                label: "Priced on",
                value: "Landed cost",
                note: "item + shipping + tax, per offer",
              },
              {
                label: "Valued on",
                value: "Sold comps",
                note: "recency-weighted median, IQR trimmed",
              },
              {
                label: "Every figure",
                value: "Auditable",
                note: "source, timestamp, match confidence",
              },
              { label: "Guessed values", value: "None", note: "missing data is labelled missing" },
            ]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="relative mt-6 overflow-hidden rounded-lg border border-border">
          <img
            src={studioImg}
            alt="Reseller sourcing desk with a dark analytics dashboard, a camera and a sneaker box ready to evaluate"
            width={1920}
            height={1088}
            loading="lazy"
            className="h-64 w-full object-cover sm:h-96"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <p className="label-meta absolute bottom-3 left-4">
            Illustrative example · not live data
          </p>
        </div>
        <div className="relative z-10 -mt-16 grid gap-4 px-2 md:grid-cols-3 sm:-mt-24">
          {STEPS.map((s, i) => (
            <article key={s.n} className="panel bg-card/95 p-5 backdrop-blur">
              <span className="num label-meta">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold">{s.t}</h3>
              <div className="mt-3 rounded-md border border-border bg-background p-3 font-mono text-xs">
                {i === 0 ? <StepIntent /> : i === 1 ? <StepCost /> : <StepVerdict />}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
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

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">Plans</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Flat per-seat pricing. We never take a percentage of your margin — that would reward
          optimistic numbers.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_TIERS.map((t) => (
            <div key={t.name} className={`panel p-5 ${t.highlight ? "border-border-strong" : ""}`}>
              <p className="label-meta">{t.name}</p>
              <p className="num mt-1 text-2xl font-semibold tracking-tight">{t.price}</p>
              <p className="text-xs text-muted-foreground">{t.cadence}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.body}</p>
              <Button
                asChild
                size="sm"
                variant={t.highlight ? "default" : "outline"}
                className="mt-4"
              >
                <Link to="/pricing">See what is included</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">From the blog</h2>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            All articles <ArrowRight className="inline size-3.5" />
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {POSTS.slice(0, 3).map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="panel block p-5 transition-colors hover:border-border-strong"
            >
              <span className="label-meta">{p.category}</span>
              <h3 className="mt-2 text-sm font-semibold leading-snug">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
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
