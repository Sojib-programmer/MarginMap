# MarginMap — Project Knowledge

## Product
MarginMap is an AI-assisted product-intelligence workspace. A user enters a product search in plain language; the app parses intent (product, category, variant, condition, budget ceiling, source preference), shows matching offers in a comparison table, computes landed cost (item + shipping + tax + marketplace fees), analyzes comparable sold listings (median sold price, low/high range, expected resale price, estimated profit, ROI %), and renders a clear **Buy / Watch / Pass** recommendation. Every value carries provenance: source, timestamp, match confidence, and estimated/missing flags.

## Domain & SEO
- Live custom domain: `https://marginmap.assistant.bd` — this is `SITE_URL` for canonical tags, `sitemap.xml`, `robots.txt`, and og URLs.
- Marketing routes are indexable; every public route MUST define its own `head()` (unique title/description/og). `__root.tsx` must NOT carry duplicate default title/description meta.
- `/app/*` workspace routes and `/auth` are private — keep them `noindex`.
- Single H1 per page; semantic HTML; alt text on images.

## Stack
- TanStack Start v1 + React 19 + Vite 7 (SSR, targets edge/worker runtime). No react-router-dom, no App.tsx switcher, no legacy entry-client/server files.
- Tailwind CSS v4 via `src/styles.css` (@import + @theme tokens; no tailwind.config.js). Web fonts load via `<link>` in `src/routes/__root.tsx` head, never as remote CSS @import.
- shadcn/ui components; Sonner for toasts (`<Toaster />` mounted once in `__root.tsx`).
- TanStack Query for data; route loaders use `queryClient.ensureQueryData` + `useSuspenseQuery`.
- Supabase (Lovable Cloud) for auth, database, storage. Social auth: Google + Apple enabled.
- Server logic: `createServerFn` from `@tanstack/react-start` in `*.functions.ts` files under client-safe paths (src/lib/ etc.); `*.server.ts` helpers are server-only. Raw HTTP/webhook/cron endpoints live under `src/routes/api/public/*` (bypasses site auth — always verify the caller inside the handler).
- Edge/worker runtime: no child_process, sharp, canvas, puppeteer, or Node-only packages in server functions.

## Design system
- Dark market-intelligence terminal aesthetic. Use semantic design tokens only — never hardcode `text-white`, `bg-black`, `bg-[#...]` etc. in components.
- Brand mark: geometric electric-amber monogram via `src/components/brand-logo.tsx`; used in header, footer, auth, sidebar, favicon.
- Catalog data is curated sample data and must be honestly labeled "Sample data | Updated today" — never presented as live marketplace data.

## Route map
- Marketing: `/`, `/pricing`, feature-pillar pages, `/contact` (working form → `contact_messages`), legal pages, friendly 404 fallback.
- Auth: `/auth` (email + Google + Apple).
- Workspace (`/app/*`, authenticated): search/intent, results comparison, deal evaluations, watchlists with target-price alerts, pipeline, billing, activity, data-sources, members/invitations.
- Never add a `Link`/`navigate` to a route file that doesn't exist — create the route in the same batch of edits.

## Data model (Supabase)
Workspaces + workspace_members (roles live here, never on profiles); plans/entitlements; catalog tables (products, offers, sold comps — curated sample); saved searches; deal evaluations; watchlists + price alerts; `activity_log` (append-only, writes only via `log_activity()` SECURITY DEFINER RPC); `usage_counters` (writes only via `consume_quota()`); `source_refresh_runs` (owner/admin read only); `contact_messages` (insert-only); MFA backup codes (hashed, unreadable).

## Monetization tiers (authoritative)
Free / Pro / Business / Enterprise. Old names (Research/Reseller/Team) are retired — do not reintroduce them.
- **Free** $0: 5 searches/day, 3 watchlists, 2 marketplaces, buyer mode only, no alerts/export.
- **Pro** $9.99/mo or $99/yr: unlimited searches, 50 watchlists, 10 alerts, all marketplaces, reseller mode, CSV export, 30-day history.
- **Business** $49.99/mo or $449/yr: up to 5 seats, unlimited watchlists/alerts, 1,000 API calls/mo, 90-day history.
- **Enterprise**: custom; unlimited seats/API, integrations/webhooks, SSO positioning, SLA.
Limits are enforced server-side (`consume_quota()`, tier-limit helpers, RLS); `src/lib/entitlements.ts` mirrors them for the UI. Reseller mode requires Pro+. Stripe checkout is not wired yet — upgrade CTAs route owners to `/contact`.

## Security rules (non-negotiable)
- RLS on every table; every `CREATE TABLE` in `public` is followed by `GRANT` statements in the same migration.
- Roles in a separate membership table; admin/role checks are server-side only — never client storage or hardcoded credentials.
- Internal permission helpers (`is_workspace_member`, `has_workspace_role`, `can_write`, `current_plan`, `shares_workspace`) live in the non-exposed `private` schema.
- SECURITY DEFINER RPCs (`accept/decline_workspace_invitation`, `log_activity`, `consume_quota`, `current_tier_limits`) are intentional and self-validating — do not "fix" them away.
- `supabaseAdmin` (bypasses RLS) is imported lazily inside handlers after verifying the caller; never for ordinary reads.
- Secrets via the secrets tool; publishable/anon keys only in client code.

## Connectors
Server-side connector registry with a production-ready eBay Browse adapter; refresh triggered via `/api/public/refresh.$source.ts`; runs recorded in `source_refresh_runs`. Amazon/Shopify connectors are progressive follow-ups. No live scraping without explicit request.

## Agent workflow rules
- Keep the build green: `bunx tsgo --noEmit` after meaningful edits; never edit `src/routeTree.gen.ts`.
- Verify fixes with the fastest relevant signal (build, Playwright smoke, console/network) before claiming done.
- Use semantic tokens, existing components (`FilterBar`, `PlanGate`, `RecommendationBadge`, `ValueCell`, `ProvenanceCell`, `result-table`), and `use-workspace-actions` hooks rather than rebuilding equivalents.
