# Finish the marketing surface, auth, fallbacks, and /app states

Verified current state: `PILLARS` (8 entries with full copy, stats, sections, FAQ, related) and `PillarPage`/`faqJsonLd` already exist; `_marketing.tsx` layout renders header+footer around `<Outlet />`; only `_marketing.index.tsx` and `_marketing.methodology.tsx` exist as leaves, so every other header/footer link 404s. `__root.tsx` has `notFoundComponent`/`errorComponent`; `router.tsx` has no defaults and there is no `$.tsx`. `/auth` is email/password only. Sonner is already mounted — no work.

## 1. Eight pillar routes

One leaf per slug under the marketing layout:

```text
_marketing.canonical-product-identity.tsx
_marketing.landed-cost.tsx
_marketing.sold-comps-vs-asking-price.tsx
_marketing.evidence-and-data-confidence.tsx
_marketing.reseller-margin-and-roi.tsx
_marketing.marketplace-fees.tsx
_marketing.condition-grading.tsx
_marketing.sourcing-workflow.tsx
```

Each: `createFileRoute("/_marketing/<slug>")`, `head()` built from the pillar's `metaTitle`/`description` plus `og:title`, `og:description`, `og:type`, `twitter:card`, and the FAQ JSON-LD via `faqJsonLd(pillar.faq)` in `scripts`. Body is `<PillarPage pillar={PILLAR_BY_SLUG[slug]} />`. No `og:image` (no real absolute asset).

## 2. Footer/company pages

`_marketing.about.tsx`, `_marketing.pricing.tsx`, `_marketing.faq.tsx`, `_marketing.contact.tsx`, `_marketing.privacy.tsx`, `_marketing.terms.tsx` — each with its own unique `head()` and substantive copy built from `PageHero`, `StatStrip`, `FaqBlock`, `CTABand`.

- About: positioning, who it's for, how the product is built, methodology link.
- Pricing: three tiers (Free research, Reseller, Team) with real feature deltas and an FAQ; buttons route to `/auth`.
- FAQ: aggregated cross-pillar questions with JSON-LD.
- Contact: client-side validated form (name, email, topic, message) with sonner success/error and inline field errors; no backend send.
- Privacy / Terms: app-owned, factual copy — data collected, where it's stored, retention, deletion requests, user responsibilities. Explicitly no certification or compliance claims; shared-responsibility wording and a "maintained by MarginMap" qualifier.

## 3. Google + Apple sign-in in /auth

Above the existing email/password form: two provider buttons calling `lovable.auth.signInWithOAuth("google" | "apple", { redirect_uri: window.location.origin })`, handling `result.redirected` (return) and `result.error` (toast), then navigating to `/app` on token success. Divider "or continue with email". Per-provider busy state; email/password untouched.

## 4. Catch-all + router defaults

- `src/routes/$.tsx` — friendly not-found page: headline, search input that navigates to `/app/search?q=…`, links to the main pillar pages, workspace, and home. Renders standalone (outside the marketing layout) but reuses header/footer components.
- `src/router.tsx` — add `defaultNotFoundComponent` and `defaultErrorComponent` to `createRouter`, sharing the same components as the root boundaries.

## 5. Loading + error states across /app

Wire `src/components/states.tsx` into every workspace route:

- Add `errorComponent: RouteError` and `notFoundComponent: RouteNotFound` to `app.index`, `app.search`, `app.compare`, `app.watchlists`, `app.evaluate`, `app.pipeline`, `app.alerts`, `app.settings`, `app.variant.$id`.
- Replace bare/absent loading returns with layout-matching skeletons: `CardGridSkeleton` (overview, search results), `TableSkeleton` (offers, evaluations, alerts), `PanelSkeleton` (settings, watchlist panels), kanban column skeletons in pipeline.
- Route query bodies through `QueryBoundary` where it fits, with `EmptyState` copy per surface (no results, empty watchlist, empty pipeline column, no alerts).
- Mutation buttons (status change, remove, save evaluation, create watchlist, run research) get `disabled` + `InlineSpinner`/busy label while pending; failures toast and stay recoverable.

## Technical notes

- Pillar slugs stay top-level URLs via the pathless `_marketing` layout.
- `PILLAR_BY_SLUG` lookups are non-null at build; each route passes its literal slug.
- No hardcoded colors — existing semantic tokens only.
- `tsgo` typecheck after each batch of route writes.
