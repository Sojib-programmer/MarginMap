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

- **Free** $0: 5 searches/day, 3 watchlists, 2 marketplaces, no alerts, 30-day history.
- **Pro** $9.99/mo or $99/yr: unlimited searches, 50 watchlists, 10 alerts, all marketplaces, CSV export, 30-day history.
- **Business** $49.99/mo or $449/yr: up to 5 seats, unlimited watchlists/alerts, 1,000 API calls/mo, 90-day history.
- **Enterprise**: custom; unlimited seats/API, integrations/webhooks, SSO positioning, SLA.

Limits are enforced server-side (`consume_quota()`, `private.tier_limits()`, `private.workspace_limits()`, RLS); `src/lib/entitlements.ts` mirrors them for the UI.

**Early-access override (active):** Free workspaces get reseller mode — deal calculator, sourcing pipeline, CSV export — via `private.tier_limits('free')` (`reseller_mode: true`, `csv_export: true`, `history_days: 30`). `deal_evaluations` and `inventory_items` INSERT policies gate on `workspace_limits(...) ->> 'reseller_mode'`, not a plan enum. The UI labels this "Early access". Close it back to Pro only when the user says the first 100 users are onboarded.

## Payments (Stripe)

Wired in **sandbox/test mode only**; real charges stay off until the Stripe account is claimed and verified and the Lovable app is installed on the live account.

- `src/lib/stripe.server.ts` (`createStripeClient`, sandbox vs live keys via the Lovable connector gateway, `verifyWebhook` HMAC-SHA256), `src/lib/stripe.ts`, `src/lib/billing.ts` (`PRICE_IDS`, `PRICE_ENTITLEMENTS`), `src/lib/payments.server.ts`, `src/lib/payments.functions.ts`.
- UI: `stripe-embedded-checkout.tsx`, `payment-test-mode-banner.tsx`, `upgrade-button.tsx` (owner-gated), `/app/billing`.
- Webhook: `src/routes/api/public/payments/webhook.ts` — env param `sandbox|live`, insert-first idempotency against `payment_events` (23505 = duplicate), upserts `subscriptions` + workspace plan/billing dates.
- Tables: `subscriptions` (owner-readable RLS, service-role write), `payment_events` (deny-by-default, service-role only).

## Security rules (non-negotiable)

- RLS on every table; every `CREATE TABLE` in `public` is followed by `GRANT` statements in the same migration.
- Roles in a separate membership table; admin/role checks are server-side only — never client storage or hardcoded credentials.
- Internal permission helpers (`is_workspace_member`, `has_workspace_role`, `can_write`, `current_plan`, `shares_workspace`, `tier_limits`, `workspace_limits`) live in the non-exposed `private` schema.
- SECURITY DEFINER RPCs (`accept/decline_workspace_invitation`, `log_activity`, `consume_quota`, `current_tier_limits`, `hit_rate_limit`, `search_quota_charged`) are intentional and self-validating — do not "fix" them away. Policy helpers must keep `EXECUTE` for `authenticated`, since RLS runs them as the caller.
- `guard_workspace_insert_privileged_columns()` forces client-created workspaces to `free` with null billing fields; `consume_quota()` rejects amounts outside 1–100 and unknown metrics.
- Tenant isolation: every workspace-scoped read/write filters on the **active** workspace (`src/lib/workspace.ts` `scoped()`, `useWritableWorkspace()` in `use-workspace-actions.ts`) — never "the first membership".
- `supabaseAdmin` (bypasses RLS) is imported lazily inside handlers after verifying the caller; never for ordinary reads.
- Secrets via the secrets tool; publishable/anon keys only in client code.
- Known-intentional linter warnings: signed-in EXECUTE of SECURITY DEFINER helpers (×7) and leaked-password protection disabled (dashboard-only). Leave both unchanged.

## Connectors and data sources

- Server-side connector registry (`src/lib/connectors/registry.server.ts`, `run.server.ts`) with an eBay Browse adapter; refresh via `/api/public/refresh.$source.ts`, runs recorded in `source_refresh_runs`.
- Refresh integrity: link-based listing identity (replays update, never duplicate), single-flight lock per source, timeout + backoff retry, automatic retirement of listings a source stops returning, credential/token redaction in stored errors, rate limits keyed to the authenticated caller.
- All six `data_sources` rows are `is_live = false`; the live catalogue is 5 products / 13 offers / 63 `sale_comps`. Keep labelling it curated sample data. eBay API credentials (`EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET`) are **not** configured.

## Third-party integrations (connected)

- **Firecrawl** (`FIRECRAWL_API_KEY`) — primary server-side listing extraction in `src/lib/integrations.server.ts` (`extractListingWithFirecrawl`), used by `resolveListing` in `src/lib/listing.functions.ts` for Amazon/Shopify/Mercari/Etsy/eBay links. Direct API when the key starts with `fc-`, otherwise the Lovable connector gateway. Returns `null` rather than guessing a price.
- **PostHog** (`POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_REGION`) — server-side capture of listing-resolution events keyed to an anonymous account ID, never an email. Browser-side capture is intentionally **off** until it respects the cookie-consent choice.
- **Notion** (`NOTION_API_KEY`) — planned pipeline export; not implemented yet.
- **Composio** and **Browserbase** (`BROWSERBASE_API_KEY`) — keys stored; workflow triggers and headless/CAPTCHA fallback not implemented yet.
- n8n and Figma were skipped.

## Agent integration (MCP server)

MarginMap publishes its own MCP server at `src/routes/mcp.ts` with an OAuth consent screen (`src/routes/[.]lovable.oauth.consent.tsx`) and `.well-known/oauth-protected-resource`. Five tools in `src/lib/mcp/tools/`: `list_workspaces`, `list_watchlists`, `create_watchlist`, `list_pipeline`, `list_evaluations`. Everything runs as the signed-in user under their own RLS — auditors stay read-only. Manifest: `.lovable/mcp/manifest.json`.

## Acquisition, consent and attribution

- `/join` is the cold-traffic landing page; `/auth?mode=signup` opens directly on account creation with an explicit "check your inbox" state.
- Google Ads: account `5912631554` (BDT), conversion action `7790835007` "MarginMap sign-up", tag `AW-18470665560/7GrKCL_q-oIdENj6v-dE`.
- Consent: `src/lib/consent.ts` + `src/components/cookie-banner.tsx`. Region detection via `/cdn-cgi/trace`; the ads tag loads only after consent in EEA/UK/CH/Canada. Consent defaults script runs first in `__root.tsx` head. Footer has a "Cookie settings" entry; `/privacy` documents purposes and withdrawal.
- Pre-spend gaps: Google Ads billing, and routing Analytics through the consent check.

## Open work (launch remediation)

- **Phase 4** — billing source of truth: reconcile pricing copy, sandbox-test checkout/success/failure/cancel/downgrade/portal/webhook replay, verify customer + workspace before entitlement changes, align privacy copy with actual infrastructure.
- **Phase 5** — CI coverage for RLS/authorization, migrations, two-workspace isolation, quota abuse and entitlement bypass; backups/PITR, monitoring, restore drill.
- Dashboard overhaul (decision metrics + showcase scenarios) planned, not started.

## Agent workflow rules

- Keep the build green: `bunx tsgo --noEmit`, then `bun run check` (typecheck + lint at zero warnings + format + 48 Vitest unit tests + build) after meaningful edits. Never edit `src/routeTree.gen.ts`.
- Playwright: `tests/e2e/public.spec.ts` runs unauthenticated; `tests/e2e/workspace.spec.ts` fails loudly without auditor credentials rather than silently passing.
- Runtimes are pinned (Node 20.19.0 / npm 10.9.2); CI lives in `.github/workflows/quality-gates.yml`.
- Verify fixes with the fastest relevant signal (build, Playwright smoke, console/network) before claiming done.
- Use semantic tokens, existing components (`FilterBar`, `PlanGate`, `RecommendationBadge`, `ValueCell`, `ProvenanceCell`, `result-table`, `ListingLookup`), and `use-workspace-actions` hooks rather than rebuilding equivalents.
- Security scans: fix only the findings the user names by `internal_id`; mark them via `manage_security_finding`. Do not touch or ignore other findings.
- Never print, echo or paste secret values or test credentials into chat.
