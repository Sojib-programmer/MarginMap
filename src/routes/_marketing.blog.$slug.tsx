import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { CTABand, FaqBlock } from "@/components/marketing";
import { POST_BY_SLUG } from "@/content/posts";
import { PILLAR_BY_SLUG } from "@/content/pillars";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/blog/$slug")({
  loader: ({ params }) => {
    const post = POST_BY_SLUG[params.slug];
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Article not found — MarginMap" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const base = pageHead({
      path: `/blog/${loaderData.slug}`,
      title: loaderData.metaTitle,
      description: loaderData.description,
      type: "article",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: loaderData.title,
            description: loaderData.description,
            datePublished: loaderData.date,
            dateModified: loaderData.date,
            author: { "@type": "Organization", name: "MarginMap" },
            publisher: {
              "@type": "Organization",
              name: "MarginMap",
              url: "https://marginmap.assistant.bd",
            },
            mainEntityOfPage: `https://marginmap.assistant.bd/blog/${loaderData.slug}`,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: loaderData.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();

  return (
    <>
      <section className="grid-noise border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-meta">{post.category}</span>
            <span className="label-meta">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="label-meta">{post.readMinutes} min read</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-12">
          {post.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.table ? (
                <div className="panel mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {s.table.headers.map((h) => (
                          <th key={h} className="label-meta px-4 py-3 text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row.join("|")} className="border-b border-border last:border-0">
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={
                                ci === 0
                                  ? "px-4 py-2.5 text-muted-foreground"
                                  : "num px-4 py-2.5"
                              }
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Frequently asked</h2>
          <div className="mt-4">
            <FaqBlock items={post.faq} />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="label-meta">Keep reading</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {post.relatedPillars.map((slug) => {
              const rel = PILLAR_BY_SLUG[slug];
              if (!rel) return null;
              return (
                <Link
                  key={slug}
                  to={`/${slug}` as never}
                  className="panel p-4 transition-colors hover:border-border-strong"
                >
                  <span className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-verified" />
                    <span>
                      <span className="block text-sm font-medium">{rel.nav}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {rel.kicker}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </article>

      <CTABand />
    </>
  );
}
