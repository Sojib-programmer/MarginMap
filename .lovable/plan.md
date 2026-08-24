# Audit remediation: provenance, entitlements, workspace roles, audit trail

Confirmed by inspection before writing this plan:

- All 13 offers carry the identical `retrieved_at` of 2026-08-01 09:31:28 UTC — the catalog is genuinely frozen, so "Data as of 8/1/2026" is accurate and the dataset is 23 days stale.
- There is no plan, entitlement, membership, workspace, or activity-log table in the database. "Research plan" in the sidebar is a static marketing link to `/pricing`.
- Reseller-only pages are hidden only by a nav filter in the app shell; `/app/evaluate` and `/app/pipeline` have no guard and are reachable by URL.
- Buyer/Reseller mode is client-only state in `localStorage` (`marginmap.role_mode`), mirrored to `profiles.default_role`.
- There is no `/app/billing` route, so it falls through to the catch-all 404.

## Phase 1 — Truthful data provenance and staleness (ship first)

- Per-source freshness, not one global line. Each data source gets a `last_refreshed_at` and a stated `refresh_interval`; offer and comp rows display the source name, its own retrieval timestamp, and relative age.
- Staleness thresholds: fresh (< 24h), aging (1–7 days), stale (> 7 days). Stale rows get an explicit warning chip, and any Buy verdict computed from stale comps is downgraded to Watch with the reason "pricing evidence older than N days".
- A `/app/data-sources` page (also linked from Settings and the methodology pillar) listing every source: type, marketplace, sample vs live status, refresh interval, last refresh, last failure, terms/attribution link.
- Catalog copy states plainly: curated sample dataset, static until live connectors are enabled, with the exact snapshot date.
- Duplicate-looking products get disambiguated in listings by variant attributes so repeated titles read as distinct variants.

## Phase 2 — Live eBay connector and scheduled refresh

- A server route under `/api/public/refresh/ebay` (secret-header protected) plus a server function that pulls eBay Browse API listings for tracked variants, upserts offers, and stamps `retrieved_at` and the source's `last_refreshed_at`.
- Scheduled by pg_cron hitting the stable project URL. Every run writes to a `source_refresh_runs` table: started, finished, rows upserted, error.
- Requires eBay production credentials (App ID / Cert ID) stored as secrets — Phase 2 does not start until those are supplied.

## Phase 3 — Additional sources and data-quality monitoring

- Second connector plus a refresh-health surface on the data-sources page: consecutive failures, last successful run, rows-changed anomaly flags, and an in-app warning banner when a source has not refreshed within its stated interval.

## Workspaces, roles and plan entitlements (backend-enforced)

- `workspaces` (owner, name, plan: research | reseller | team) and `workspace_members` (workspace, user, role: owner | admin | editor | auditor). Roles live in their own table — never on profiles.
- `workspace_invitations` with email, role, token hash, expiry, accepted_at. Owner/admin only; accepting is verified server-side against the signed-in user's confirmed email.
- Security-definer functions `has_workspace_role(workspace, user, roles[])`, `current_plan(workspace)`, and `can_write(workspace, user)`. Every RLS policy on user data is rewritten to route through them; no policy reads a client-supplied role.
- Auditor is read-only at the database level: SELECT only, no insert/update/delete on any workspace table, no settings, membership, or billing writes. Editors write data but not membership. Admins manage members and settings but not ownership transfer. No one can grant themselves a role they do not already have — self-promotion is blocked in the policy, not the UI.
- Plan gating is enforced in policies and server functions: the deal calculator, pipeline, and alert count limits check `current_plan()` server-side. Hiding a nav item is presentation only, never the boundary.
- Existing user data is migrated into a personal workspace per user, owner role.

## Billing and navigation

- New `/app/billing`: current plan, entitlement list, seat count, and a "Contact us to upgrade" action that opens the contact flow. No checkout, no fake Stripe.
- Sidebar "Research plan" card is replaced by the real plan badge read from the workspace, linking to `/app/billing`.
- Pricing CTAs on marketing pages route signed-in users to `/app/billing` and signed-out users to `/auth`, instead of dead-ending.
- Locked features render a clear "not included in your plan" state and a server-side 403 if called directly; entitled features are never hidden without explanation.
- Pipeline navigation is made consistent: single entry point, stable route params, and the same guard behaviour on direct URL entry as on in-app navigation.

## Analysis mode

- Buyer/Reseller is relabelled "Analysis mode", persisted to `profiles.default_role`, and documented in the UI as affecting calculations and layout only. It grants nothing. Switching it is logged like any other settings change but never touches permissions, ownership, or billing.

## Audit trail

- `activity_log`: workspace, actor user, action, target type, target id, metadata jsonb, created_at. Append-only — INSERT permitted through a security-definer writer, no UPDATE or DELETE policy for anyone, workspace-isolated on read.
- Logged events: invitations sent/accepted/revoked, role changes, settings changes, analysis-mode changes, evaluations saved, watchlist and alert changes, pipeline status transitions, deletions, plan changes.
- Metadata is field-level diffs only. No passwords, tokens, session data, or raw credentials ever enter the log — enforced by an allowlist in the writer function.
- `/app/activity` view: filterable by actor, action type and date, visible to every member including auditors (read-only), never crossing workspace boundaries.

## Account hygiene

- The `retdyfugihoj…` auditor login is replaced by a proper invited Auditor member of a demo workspace with a clean display name, and profile defaults are surfaced as editable rather than hard-coded US/USD.
- Settings shows the real subscription state read from the workspace, not placeholder copy.

## Technical notes

Migrations create `workspaces`, `workspace_members`, `workspace_invitations`, `activity_log`, `source_refresh_runs`, plus the `has_workspace_role` / `current_plan` / `log_activity` security-definer functions, with GRANTs and RLS on every new table. All privileged reads and writes move behind `createServerFn` with `requireSupabaseAuth`; the browser client keeps only RLS-safe reads. Phase 1 ships independently of Phases 2–3 and does not need external credentials.

## Suggested sequencing

1. Phase 1 provenance and staleness, plus billing route and navigation fixes (no credentials needed).
2. Workspaces, roles, entitlements, invitations, audit log.
3. Phase 2 eBay connector once credentials exist, then Phase 3 monitoring.
