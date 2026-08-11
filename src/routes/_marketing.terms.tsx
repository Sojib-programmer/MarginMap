import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHero } from "@/components/marketing";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/terms")({
  head: () =>
    pageHead({
      path: "/terms",
      title: "Terms of use — MarginMap",
      description:
        "The terms covering use of the MarginMap workspace: acceptable use, the limits of our estimates, account responsibilities and changes to the service.",
    }),
  component: TermsPage,
});

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "Acceptance",
    body: [
      "By creating an account or using the MarginMap workspace you agree to these terms. If you are using it on behalf of an organisation, you confirm you are authorised to accept on its behalf.",
    ],
  },
  {
    heading: "The service, and what it is not",
    body: [
      "MarginMap produces estimates: landed cost, market value derived from observed completed sales, and margin projections based on fee schedules and inputs you supply. Estimates are informational.",
      "Nothing in the product is financial, investment, tax or legal advice. Marketplace fee schedules, tax treatment and shipping costs change, and observed sales are historical. You are responsible for verifying figures before committing money.",
      "We do not guarantee that a product will sell, that it will sell at the indicated price, or that a listing is authentic or accurately described by its seller.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You are responsible for activity under your account and for keeping your sign-in credentials secure. Accounts are for a named individual; team plans provide one seat per person rather than shared credentials.",
      "Notify us promptly if you believe your account has been accessed without authorisation.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Do not attempt to access other users' workspace data, probe or bypass access controls, scrape the catalog at scale, resell platform data as your own dataset, or use the service to facilitate fraudulent listings.",
      "Automated access outside the product interface requires prior written agreement.",
    ],
  },
  {
    heading: "Your content",
    body: [
      "You retain ownership of the data you enter — searches, watchlists, evaluations, pipeline items and notes. You grant us the limited right to process it in order to operate the service for you.",
      "We may use aggregate, non-identifying usage statistics to improve the product.",
    ],
  },
  {
    heading: "Availability and changes",
    body: [
      "The service is provided on an as-available basis. Features, catalog coverage, scoring weights and fee schedules may change as data sources and marketplace rules change.",
      "We will give reasonable notice of material changes to paid plan terms.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "To the maximum extent permitted by law, MarginMap is not liable for indirect or consequential losses, including lost profits or losses arising from a purchase or sale decision made using the product's estimates.",
    ],
  },
  {
    heading: "Termination",
    body: [
      "You may stop using the service and request deletion at any time. We may suspend accounts that breach the acceptable-use section or that put platform integrity at risk.",
    ],
  },
];

function TermsPage() {
  return (
    <>
      <PageHero
        kicker="Legal"
        title="Terms of use"
        lede="These terms are maintained by MarginMap and describe the basis on which the workspace is provided. Plain language, no hidden clauses about your data."
      />

      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  className="mt-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          See also our{" "}
          <Link to="/privacy" className="text-primary underline">
            privacy page
          </Link>{" "}
          and{" "}
          <Link to="/methodology" className="text-primary underline">
            methodology
          </Link>
          .
        </p>
      </div>
    </>
  );
}
