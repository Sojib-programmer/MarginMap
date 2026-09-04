# Add Project Knowledge for MarginMap

## Context
Settings → Knowledge is empty. That field is user-edited only — the agent cannot write to it directly. The repo-level equivalent, a root `AGENTS.md`, is read by the Lovable agent on every request and is version-controlled with the project. We do both: create `AGENTS.md` and provide paste-ready text for the Knowledge panel.

## Changes

### 1. Create `AGENTS.md` at repo root
A concise, durable knowledge file covering:

- **Product**: MarginMap — AI-assisted product-intelligence workspace. Users search products in plain language, get parsed intent, compared offers with landed cost, sold-comps economics (median/range, expected resale, profit, ROI), and a Buy/Watch/Pass recommendation.
- **Live domain**: `https://marginmap.assistant.bd` (SITE_URL used in SEO metadata, sitemap, robots).
- **Stack**: TanStack Start v1 + React 19 + Vite 7, Tailwind v4 via `src/styles.css`, shadcn/ui, Supabase (Lovable Cloud), Sonner toasts, TanStack Query.
- **Design system**: dark market-intelligence terminal aesthetic; semantic tokens only (no hardcoded color utilities); geometric electric-amber monogram via `src/components/brand-logo.tsx`.
- **Route map**: marketing routes (`/`, `/pricing`, pillar pages, `/contact`, legal) vs authenticated workspace under `/app/*` (noindex), auth at `/auth`.
- **Data model**: workspaces, workspace_members, plans, catalog (products/offers/sold comps — curated sample data, labeled as such), saved searches, deal evaluations, watchlists + price alerts, activity_log (append-only), usage_counters, source_refresh_runs, contact_messages, MFA backup codes.
- **Monetization tiers**: Free / Pro / Business / Enterprise with limits enforced server-side via `consume_quota()` and tier-limit helpers; UI mirrors in `src/lib/entitlements.ts`; reseller mode requires Pro+.
- **Security rules**: RLS everywhere; roles in `user_roles`-style membership (never on profiles); internal permission helpers live in the `private` schema; privileged work via `supabaseAdmin` loaded inside handlers only; SECURITY DEFINER RPCs are intentional and self-validating.
- **Connectors**: server-side registry with eBay Browse adapter; refresh via `/api/public/refresh.$source.ts`; catalog currently ships curated sample data labeled "Sample data | Updated today".
- **Rules for the agent**: never link to routes that don't exist; every public route needs its own `head()` metadata; `GRANT`s required on every new public table; keep build passing (`bunx tsgo --noEmit`).

### 2. Knowledge-panel text
Deliver a shortened paste-ready version of the above in chat for the user to drop into Settings → Knowledge.

## Verification
- `AGENTS.md` exists at repo root and is picked up by the agent (verifiable next session).
- No code behavior changes; typecheck unaffected.
