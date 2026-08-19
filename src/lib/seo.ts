import { PILLAR_BY_SLUG } from "@/content/pillars";

export const SITE_URL = "https://marginmap.assistant.bd";
export const OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

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
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function organizationJsonLdScript() {
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "MarginMap",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.png`,
        image: OG_IMAGE,
        description:
          "Product intelligence for buyers and resellers: landed cost, completed-sale comps and resale margin with auditable evidence.",
        legalName: "Marketsync Global Ltd.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Kashidanga City Gate, Rajpara",
          addressLocality: "Rajshahi",
          postalCode: "6201",
          addressCountry: "BD",
        },
      }),
    },
  ];
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
