# MarginMap — Public Launch Remediation

Your draft holds up. I verified the P0 claims against the live database and code rather than taking them on faith; three of four are confirmed exactly as you described, one needs a correction, and one item in Phase 5 is smaller than stated.

## Verified findings

| Claim | Status |
| --- | --- |
| Workspace plan injection | **Confirmed.** The insert rule on workspaces only checks that the creator is the owner. Plan, Stripe IDs and billing dates are all client-settable at creation time. The guard that blocks those fields only runs on edits, never on creation. |
| Negative quota manipulation | **Confirmed.** The quota routine accepts any amount, including negatives, so a caller can refund their own usage and search without limit. |
| Active-workspace isolation | **Confirmed.** Workspace list queries fetch every row the member can see across all their workspaces, with no filter on the selected one. A user in two workspaces sees mixed watchlists, inventory, evaluations, alerts, searches and reports. |
| Marketplace restriction is UI-only | **Confirmed.** Any signed-in user can read all offers directly; the Free-tier marketplace cap exists only in the interface. |
| Formatting drift | **Overstated.** One generated file is unformatted, not a broad drift. Small fix. |
| Paused source exclusion | **Unverified.** Offers are filtered on their own active flag, but not by whether their source is paused. Confirming this is the first step of Phase 3. |

## Plan

### Phase 0 — Baseline
Record current migration state, add the launch checklist and regression matrix. No behaviour changes; the two recent security fixes stay exactly as they are.

### Phase 1 — Launch-blocking authorization (P0)
1. **Workspace creation**: force new workspaces to Free and reject any client-supplied plan, ownership or billing field at creation. Paid changes only through the trusted billing path.
2. **Quota**: reject zero, negative and absurdly large amounts; usage becomes monotonic.
3. **Isolation**: every workspace-scoped read and write is filtered by the active workspace — watchlists and items, inventory, evaluations, alerts, searches, reports, activity. Role checks resolve against that same workspace.

Each gets a direct database-level regression test that bypasses the interface.

### Phase 2 — Server-side entitlements
Move marketplace caps, watchlist and alert limits, export and plan permissions behind trusted server paths or scoped views. Exclude paused sources from results. Tests call the API and database directly, not the UI.

### Phase 3 — Refresh and data integrity
Decide global vs workspace-owned sources (recommendation: global, service-scheduled). Manual refresh stays Business owner/admin. Add offer identity uniqueness, idempotency, timeouts, retry/backoff, stale-offer deactivation, error redaction, failure alerting. Rate-limit keys derive from the authenticated caller, never from caller-supplied strings.

### Phase 4 — Billing, privacy, production config
Pick one source of truth for activation and reconcile pricing copy, billing screen, AGENTS.md and webhook behaviour against it. Sandbox-exercise checkout, success, failure, cancellation, downgrade, portal and webhook replay. Webhooks verify customer and workspace before changing entitlements. Privacy copy reflects the actual external Supabase infrastructure. Required secrets documented by name only.

### Phase 5 — Quality gates and launch verification
Fix the one formatting file. Authenticated E2E fails loudly when credentials are absent instead of skipping. CI gains RLS/authorization, migration, two-workspace isolation, quota-abuse and entitlement-bypass coverage. Correct the stale CI doc reference. Confirm backups/PITR, error monitoring, uptime and refresh alerts. Final smoke test across marketing, auth, workspace creation, search, watchlists, billing, sign-out, 404, robots and sitemap.

### Launch gate
No public launch until every Phase 1 and Phase 2 item is fixed **and** covered by a test that bypasses the UI.

## Technical notes

- Workspace creation hardening extends the existing privileged-column guard to INSERT, or moves creation behind a SECURITY DEFINER routine that ignores client-supplied plan/billing values. The automatic workspace created on signup already hardcodes Free and is unaffected.
- Quota hardening amends `consume_quota` with an amount range check.
- Isolation is a client-side query-shape fix (`src/lib/workspace.ts` and the workspace action hooks) plus a defensive scoped read path; RLS already prevents cross-tenant leaks, this is cross-*workspace* mixing for one legitimate user.
- Marketplace enforcement needs the offer read path to go through a server function that applies the plan's marketplace allowance, since a blanket authenticated read policy cannot express it.

## Sequencing

Phase 1 alone clears the three P0 authorization defects and is the shortest path to a defensible launch posture. Phase 2 is the second hard gate. Phases 3–5 can proceed in parallel with beta traffic if you choose.
