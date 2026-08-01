import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PILLAR_BY_SLUG, type Pillar } from "@/content/pillars";
import { cn } from "@/lib/utils";

export function PageHero({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="grid-noise border-b border-border">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="label-meta">{kicker}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{lede}</p>
        {children}
      </div>
    </section>
  );
}

export function StatStrip({
  items,
  className,
}: {
  items: { label: string; value: string; note: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {items.map((s) => (
        <div key={s.label} className="panel p-4">
          <dt className="label-meta">{s.label}</dt>
          <dd className="num mt-1 text-2xl font-semibold tracking-tight">{s.value}</dd>
          <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
        </div>
      ))}
    </dl>
  );
}

export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {f.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function CTABand({
  title = "Run one product through it",
  body = "Open the workspace, search in plain language, and open the evidence drawer on the first number you doubt.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="panel grid-noise mx-auto my-16 max-w-4xl p-8 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/auth">
            Open the workspace <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/methodology">Read the methodology</Link>
        </Button>
      </div>
    </section>
  );
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}

export function PillarPage({ pillar }: { pillar: Pillar }) {
  return (
    <>
      <PageHero kicker={pillar.kicker} title={pillar.title} lede={pillar.lede}>
        <StatStrip items={pillar.stats} className="mt-8" />
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-12">
          {pillar.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.list ? (
                <dl className="mt-5 space-y-3">
                  {s.list.map((li) => (
                    <div key={li.term} className="panel flex gap-3 p-4">
                      <Check className="mt-0.5 size-4 shrink-0 text-verified" />
                      <div>
                        <dt className="text-sm font-medium">{li.term}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {li.detail}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Frequently asked</h2>
          <div className="mt-4">
            <FaqBlock items={pillar.faq} />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="label-meta">Keep reading</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {pillar.related.map((slug) => {
              const rel = PILLAR_BY_SLUG[slug];
              return (
                <Link
                  key={slug}
                  to={`/${slug}` as never}
                  className="panel p-4 transition-colors hover:border-border-strong"
                >
                  <span className="block text-sm font-medium">{rel?.nav ?? "Methodology"}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {rel?.kicker ?? "How the numbers are produced"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <CTABand />
    </>
  );
}
