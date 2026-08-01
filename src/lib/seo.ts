import { PILLAR_BY_SLUG } from "@/content/pillars";

export const SITE_URL = "https://pixel-perfect-render-330.lovable.app";

export function pageHead({
  path,
  title,
  description,
  type = "website",
}: {
  path: string;
  title: string;
  description: string;
  type?: string;
}) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function faqJsonLdScript(items: { q: string; a: string }[]) {
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    },
  ];
}

export function pillarHead(slug: string) {
  const pillar = PILLAR_BY_SLUG[slug]!;
  const base = pageHead({
    path: `/${slug}`,
    title: pillar.metaTitle,
    description: pillar.description,
    type: "article",
  });
  return { ...base, scripts: faqJsonLdScript(pillar.faq) };
}
