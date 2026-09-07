import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHero } from "@/components/marketing";
import { POSTS } from "@/content/posts";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/blog")({
  head: () => {
    const base = pageHead({
      path: "/blog",
      title: "Blog — reselling, fees, and market data — MarginMap",
      description:
        "Guides on marketplace fees, sold comps, reselling profit math, and sourcing workflows — written for buyers and resellers who move money on the answer.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "MarginMap blog",
            itemListElement: POSTS.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://marginmap.assistant.bd/blog/${p.slug}`,
              name: p.title,
            })),
          }),
        },
      ],
    };
  },
  component: BlogIndexPage,
});

function BlogIndexPage() {
  return (
    <>
      <PageHero
        kicker="Blog"
        title="Notes on fees, comps, and the math of resale"
        lede="Long-form guides for buyers and resellers: how marketplace fees actually stack, how to read sold comps, and how to turn sourcing into a repeatable system."
      />
      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="grid gap-4">
          {POSTS.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="panel block p-5 transition-colors hover:border-border-strong"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="label-meta">{p.category}</span>
                <span className="label-meta">
                  {new Date(p.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="label-meta">{p.readMinutes} min read</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
