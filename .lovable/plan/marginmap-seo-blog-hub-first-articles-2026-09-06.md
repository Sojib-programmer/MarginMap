# MarginMap SEO blog: hub + first articles

## Approach
Add a `/blog` section that reuses the existing marketing layout, design tokens, and `pageHead` SEO helper. Content lives in a typed content module (`src/content/posts.ts`, same pattern as `src/content/pillars.ts`) so posts stay in git, render at build time (fast, fully indexable HTML), and need no database or CMS.

## Routes & structure
- `src/routes/_marketing.blog.tsx` — blog index: post cards with title, excerpt, date, read time, category tag. Own `head()` (unique title/description/og), CollectionPage/ItemList JSON-LD.
- `src/routes/_marketing.blog.$slug.tsx` — article template: H1, byline/date, body sections, FAQ block, internal links to related pillar pages and the workspace CTA. Unique `pageHead` per post (type "article"), Article + FAQ JSON-LD, canonical URL on marginmap.assistant.bd.
- 404 on unknown slug via existing friendly fallback.

## First 6 posts (keyword-validated, Semrush US data)
1. **"eBay fee calculator: what sellers actually pay in 2026"** — 22,200/mo volume, difficulty 45. Targets the fee-calculator tool we already built; links to `/fee-calculator` as the interactive answer.
2. **"Sold comps vs asking price: how to read the market"** — 320/mo, difficulty 25 (easy win), aligns with `/sold-comps-vs-asking-price` pillar.
3. **"eBay vs Amazon selling fees compared"** — difficulty 0, very easy; links to `/marketplace-fees` and `/fee-calculator`.
4. **"What to resell for profit: a data-first framework"** — difficulty 0; links to `/reseller-margin-and-roi`.
5. **"How to calculate reselling profit (landed cost formula)"** — targets "how to calculate profit when reselling"; links to `/landed-cost` and `/fee-calculator`.
6. **"Arbitrage sourcing: building a repeatable buy list"** — difficulty 0; links to `/sourcing-workflow`.

Each post: 900–1,400 words of substantive copy (no filler), one table or worked numeric example, 3–5 FAQ items with JSON-LD, honest "Sample data" framing where product data appears, and a CTA band to the workspace.

## Wiring
- Footer: add "Blog" link under Company column.
- Sitemap: add `/blog` (priority 0.7, weekly) + each post URL (priority 0.6, monthly).
- Homepage: small "From the blog" section linking the 3 newest posts.

## Technical notes
- Semantic tokens only; reuse `PageHero`, `FaqBlock`, `CTABand`, `faqJsonLdScript`.
- Single H1 per post; dates in ISO for `datePublished` in Article JSON-LD.
- No `og:image` beyond existing `OG_IMAGE` via `pageHead`.
- Verify: `tsgo --noEmit`, then curl-render `/blog` and one post to confirm SSR HTML contains title/description/H1.
