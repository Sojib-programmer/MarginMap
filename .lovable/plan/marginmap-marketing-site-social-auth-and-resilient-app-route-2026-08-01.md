# MarginMap: marketing site, social auth, and resilient app routes

## Current state (verified)

- Only two public pages exist: `/` (short landing) and `/auth`. No header, footer, or marketing sub-pages.
- `/auth` is email/password only — no Google, no Apple.
- Sonner `<Toaster />` is **already mounted** in `src/routes/__root.tsx`. No work needed there.
- Root `notFoundComponent` and `errorComponent` **already exist**; what's missing is `defaultNotFoundComponent` / `defaultErrorComponent` on the router and per-route boundaries — only `app.variant.$id.tsx` defines a `notFoundComponent`, and no `/app` route has `errorComponent` or `pendingComponent`.

## 1. Marketing site: shell + navigation

New `src/components/site-header.tsx` and `src/components/site-footer.tsx`, wrapped by a pathless layout `src/routes/_marketing.tsx` so every public page shares them (app routes keep the workspace shell).

- Header: MM mark, desktop nav with a "Platform" dropdown listing the pillar pages, Sign in + "Open workspace" CTAs, mobile sheet nav.
- Footer: 4 link columns (Platform, Use cases, Company, Legal), disclaimer, no fake social links.

## 2. Expanded homepage

Rebuild `/` as a full landing page in the terminal/market-intelligence direction already in `styles.css`: hero with live-looking metric strip, "how it works" three-step, pillar grid linking to the pillar pages, buyer-vs-reseller split section, evidence/trust section, methodology callout, FAQ, CTA band. All copy substantive, no lorem, no stock-photo filler — data-panel visuals built from existing primitives.

## 3. Eight pillar pages

Each is its own route with unique `head()` (title, description, og:title, og:description), an H1, sectioned long-form content, internal links, and an FAQ block with JSON-LD where it fits:

1. `/canonical-product-identity`
2. `/landed-cost`
3. `/sold-comps-vs-asking-price`
4. `/evidence-and-data-confidence`
5. `/reseller-margin-and-roi`
6. `/marketplace-fees`
7. `/condition-grading`
8. `/sourcing-workflow`

Plus supporting footer pages: `/about`, `/pricing`, `/faq`, `/contact`, `/privacy`, `/terms`, `/methodology`. Contact is a validated client-side form (no backend send unless you want one).

## 4. Google + Apple sign-in

- Call the social-login configuration tool to enable managed Google and Apple providers and generate `src/integrations/lovable`.
- In `/auth`, add provider buttons calling `lovable.auth.signInWithOAuth("google" | "apple", { redirect_uri: window.location.origin })`, handling `error` / `redirected` results, with a divider above the existing email/password form.
- Email/password stays enabled.

## 5. Toaster

Already mounted — I'll verify toasts render and leave it alone.

## 6. 404 + route fallbacks

- Redesign the root 404 into a helpful page: search box that routes to `/app/search`, links to the main pillar pages and workspace.
- Add `defaultNotFoundComponent` and `defaultErrorComponent` to `createRouter` in `src/router.tsx`.
- Add a catch-all `src/routes/$.tsx` so unmatched deep paths render the friendly page.

## 7. Loading + error states for every `/app` route

- Shared `src/components/states.tsx`: `PanelSkeleton`, `TableSkeleton`, `EmptyState`, `RouteError` (with `router.invalidate()` + `reset()` retry), `InlineSpinner`.
- Every `/app/*` route gets `errorComponent` and `notFoundComponent`; loader-backed routes get `pendingComponent`.
- Replace bare `isLoading` returns in overview, search, variant, compare, watchlists, evaluate, pipeline, alerts, settings with skeletons matching the final layout; mutation buttons get busy state; failures surface a retry action instead of a blank panel.

## Technical notes

- Pathless layout `_marketing.tsx` keeps URLs clean (`/landed-cost`, not `/marketing/landed-cost`).
- No `og:image` on `__root` or the layout; only leaf routes if a real absolute image exists.
- All new color/spacing via existing semantic tokens in `src/styles.css` — no hardcoded colors.
- Typecheck with `tsgo` after each batch.
