import { createFileRoute } from "@tanstack/react-router";

import { CTABand, PageHero } from "@/components/marketing";
import { PILLARS } from "@/content/pillars";

export const Route = createFileRoute("/_marketing/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — MarginMap" },
      {
        name: "description",
        content:
          "How MarginMap resolves product identity, computes landed cost, estimates fair market value from completed sales, and scores data confidence.",
      },
      { property: "og:title", content: "Methodology — MarginMap" },
      {
        property: "og:description",
        content: "Identity resolution, landed cost, sold-comp estimation and confidence scoring.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://pixel-perfect-render-330.lovable.app/methodology",
      },
    ],
    links: [{ rel: "canonical", href: "https://pixel-perfect-render-330.lovable.app/methodology" }],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <>
      <PageHero
        kicker="Reference"
        title="Methodology"
        lede="Every estimate in MarginMap is produced by a rule you can read. This page is the index of those rules; each links to the full explanation."
      />
      <div className="mx-auto max-w-4xl px-4 py-14">
        <ol className="space-y-4">
          {PILLARS.map((p, i) => (
            <li key={p.slug} className="panel p-5">
              <span className="num label-meta">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-1 text-sm font-semibold">{p.nav}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-muted-foreground">
          Demo data comes from synthetic registered sources. Estimates are decision support, not a
          guarantee of availability, authenticity, taxes, fees, or resale outcome.
        </p>
      </div>
      <CTABand />
    </>
  );
}
