import { createFileRoute, Link } from "@tanstack/react-router";

import { Disclaimer } from "@/components/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarginMap — Product intelligence for buyers and resellers" },
      {
        name: "description",
        content:
          "Search products in plain language, see landed cost against real completed sales, and check resale margin before you buy. Every number shows its evidence.",
      },
      { property: "og:title", content: "MarginMap — Product intelligence for buyers and resellers" },
      {
        property: "og:description",
        content:
          "Search products in plain language, see landed cost against real completed sales, and check resale margin before you buy. Every number shows its evidence.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    k: "Canonical identity",
    d: "Listings collapse into one product variant, so you compare the same thing across sources instead of ten near-duplicate titles.",
  },
  {
    k: "Landed cost, not sticker price",
    d: "Item + shipping + tax, shown per offer. Missing tax data is labeled missing, never guessed.",
  },
  {
    k: "Asking vs sold",
    d: "Fair market comes from completed sales with a recency-weighted median and outlier filtering — never from what sellers hope to get.",
  },
  {
    k: "Evidence on every claim",
    d: "Open the evidence drawer on any score: source, retrieval time, match confidence, and the raw record.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              MM
            </span>
            <span className="font-semibold tracking-tight">MarginMap</span>
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16">
          <p className="label-meta">Product intelligence workspace</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Know the real cost before you buy — and the real margin before you resell.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            MarginMap normalizes messy listings into canonical products, computes landed cost, and
            scores each offer against completed-sale comps. Two modes: Buyer optimizes the purchase,
            Reseller optimizes the exit.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Open the workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app/search" search={{ q: "full-frame mirrorless under $2000" }}>
                See a sample search
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <article key={p.k} className="panel p-5">
              <h2 className="text-sm font-semibold">{p.k}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </section>

        <section className="pb-20">
          <Disclaimer />
        </section>
      </main>
    </div>
  );
}
