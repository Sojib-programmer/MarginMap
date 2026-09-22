import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { FaqBlock, PageHero, StatStrip, faqJsonLd } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { pageHead } from "@/lib/seo";

const FAQ = [
  {
    q: "What does the free plan actually include?",
    a: "Reseller mode in full during early access: the deal calculator, sourcing pipeline, CSV export and 30 days of history, plus 5 searches a day and 3 watchlists. No card required.",
  },
  {
    q: "Is the catalogue live marketplace data?",
    a: "Not yet. The built-in catalogue is a curated sample while live marketplace sources are being connected. The paste-a-listing calculator works on any item you bring, and every figure shows its source, timestamp and confidence.",
  },
  {
    q: "What happens after the first 100 accounts?",
    a: "Reseller mode moves behind the Pro plan for new signups. Accounts created during early access keep the tools they signed up with.",
  },
  {
    q: "How is the resale verdict calculated?",
    a: "Landed cost (item, shipping, tax, marketplace fees) against completed-sale comps, producing net proceeds, profit, ROI and a Buy, Watch or Pass verdict. The methodology page shows the full formula.",
  },
];

export const Route = createFileRoute("/_marketing/join")({
  head: () => {
    const head = pageHead({
      path: "/join",
      title: "Free reseller tools — early access — MarginMap",
      description:
        "Free during early access: landed-cost and ROI calculator, sourcing pipeline, watchlists and CSV export. Paste any listing and get a Buy, Watch or Pass verdict with the evidence behind it.",
    });
    return {
      ...head,
      scripts: [{ type: "application/ld+json", children: faqJsonLd(FAQ) }],
    };
  },
  component: JoinPage,
});

const STATS = [
  {
    label: "Cost to start",
    value: "$0",
    note: "No card, no trial timer. Free plan stays free.",
  },
  {
    label: "Reseller mode",
    value: "Unlocked",
    note: "Free for the first 100 accounts, then Pro only.",
  },
  {
    label: "Every number",
    value: "Sourced",
    note: "Source, timestamp, confidence and estimated flags.",
  },
];

const INCLUDED = [
  "Landed cost: item, shipping, tax and marketplace fees in one figure",
  "Completed-sale comps: median, range and expected resale price",
  "Net profit, ROI and a Buy / Watch / Pass verdict",
  "Paste an eBay or Amazon listing and evaluate it directly",
  "Sourcing pipeline and watchlists with target prices",
  "CSV export and 30 days of history",
];

function JoinPage() {
  const cta = (label: string) => () => trackEvent("cta_click", { location: "join", label });

  return (
    <div>
      <PageHero
        kicker="Early access — first 100 accounts"
        title="Know the margin before you buy it"
        lede="MarginMap turns a listing into a decision: landed cost against completed sales, net profit and ROI after fees, and a Buy, Watch or Pass verdict you can audit line by line. Reseller mode is free while we onboard our first 100 accounts."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }} onClick={cta("hero_signup")}>
              Create a free account <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/fee-calculator" onClick={cta("hero_calculator")}>
              Try the fee calculator first
            </Link>
          </Button>
        </div>
        <StatStrip items={STATS} className="mt-10" />
      </PageHero>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight">What you get on the free plan</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="panel flex items-start gap-3 p-4 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Limits on the free plan: 5 searches a day, 3 watchlists, no price alerts. The built-in
          catalogue is a curated sample while live marketplace sources are being connected — the
          calculator works on any listing you paste.
        </p>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-xl font-semibold tracking-tight">How a decision gets made</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Bring the item",
                body: "Paste a listing URL or type the item and price. Condition and marketplace come along with it.",
              },
              {
                step: "02",
                title: "See the true cost",
                body: "Item, inbound shipping, tax, prep, outbound shipping and marketplace fees resolve into one landed cost.",
              },
              {
                step: "03",
                title: "Get the verdict",
                body: "Completed-sale comps set the expected resale price. Profit, ROI and days-to-sell drive Buy, Watch or Pass.",
              },
            ].map((s) => (
              <li key={s.step} className="panel p-5">
                <p className="label-meta">{s.step}</p>
                <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight">Questions before you sign up</h2>
        <div className="mt-4">
          <FaqBlock items={FAQ} />
        </div>
      </section>

      <section className="panel grid-noise mx-auto my-16 max-w-4xl p-8 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Claim an early-access account</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Free, no card, and reseller mode stays unlocked for the accounts created during early
          access.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }} onClick={cta("footer_signup")}>
              Create a free account <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/methodology">Read the methodology</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
