# MarginMap — Phase 1 + Phase 2 (Security/Tenancy + Release Engineering)

Scope is exactly what you flagged as the immediate next step. Phases 0, 3–6 are not touched here; Stripe stays unwired and the catalog stays curated-sample and labeled as such.

## What is actually broken (verified against the live database and repo)

- `workspaces` has one UPDATE policy, `owner updates workspace`, granted to `authenticated` with no column restriction. Any workspace owner or admin can set `plan`, `tier_expires_at`, `billing_cycle_*`, `stripe_customer_id`, `stripe_subscription_id`, and `owner_id` directly from the browser. This is free Enterprise for anyone who opens devtools.
- `consume_quota()` exists and is correct, but the only reference in the codebase is the `consumeQuota` wrapper in `src/lib/entitlements.ts`. Nothing calls it. Search limits are decorative.
- `runResearch` (`src/lib/research.functions.ts`) requires a session and nothing else — no plan gate, no quota, no timeout, no per-user rate limit. One signed-in free account can burn the AI budget.
- `refreshSource` (`src/lib/sources.functions.ts`) checks owner/admin of *any* workspace. Every signup owns a workspace, so every user can trigger connector refreshes.
- `contact_messages` INSERT policy is `with_check: true` for `anon`. Open spam sink.
- Data is already workspace-shared at the RLS layer (`private.is_workspace_member` everywhere). The privacy copy is what is wrong, not the model.
- `npm run check` fails: 39 lint errors (all `prettier/prettier`), 14 `react-refresh` warnings, 12 unformatted files. Two duplicate CI workflows. Zero tests, no test runner.

## Phase 1 — Security and tenancy

### 1.1 Lock billing and ownership columns
Migration:
- Drop the blanket UPDATE policy on `workspaces`; replace with an owner/admin policy plus a `BEFORE UPDATE` trigger that rejects any change to `plan`, `tier_expires_at`, `billing_cycle_start`, `billing_cycle_end`, `stripe_customer_id`, `stripe_subscription_id`, `owner_id` unless the session is `service_role`. Owners keep `name`, `billing_interval` is read-only until Stripe lands.
- `REVOKE UPDATE (plan, owner_id, stripe_customer_id, stripe_subscription_id, tier_expires_at, billing_cycle_start, billing_cycle_end) ON public.workspaces FROM authenticated;` as defence in depth.
- Ownership transfer moves to a new SECURITY DEFINER RPC `transfer_workspace_ownership(_workspace_id, _new_owner)` that validates the caller is the current owner and the target is a member, and logs to `activity_log`.
- Audit and drop any remaining `EXECUTE` grants to `anon`/`authenticated` on `private.*` helpers.

### 1.2 Enforce quotas server-side
- New `src/lib/search.functions.ts` with `runSearch` behind `requireSupabaseAuth`: resolves the caller's active workspace, verifies membership, calls `consume_quota(workspace_id,'searches')`, then persists the `searches` row. The client stops writing `searches` directly and stops calling `consumeQuota` from the browser.
- Add an RLS `WITH CHECK` on `searches` INSERT so a row cannot be written without a matching same-day `usage_counters` row — the quota becomes structurally unskippable, not just enforced by convention.
- `runResearch` gains: workspace resolution + membership check, `atLeast(plan,'pro')` gate for reseller-mode reports, a `consume_quota(...,'api_calls')` charge, and an `AbortSignal` timeout on the gateway call.

### 1.3 Rate limiting and abuse control
- New `public.rate_limits(bucket_key, window_start, count)` table, service-role only, plus a `private.hit_rate_limit(_key, _limit, _window)` helper returning allow/deny.
- Applied to: search (per user), AI research (per user and per workspace), connector refresh (per source), contact submissions (per IP hash and per email, plus a hidden honeypot field and a minimum time-on-form check).
- Deny paths return typed errors that the UI renders as 429/402/403 copy rather than a raw crash. `research.functions.ts` also branches on gateway 402 / 403 / 429 (respecting `Retry-After`) / 5xx.

### 1.4 Scope refresh authorization
- `refreshSource` takes the workspace id, verifies owner/admin **of that workspace**, and verifies the workspace is entitled to that source before running. Every attempt — allowed, denied, failed — records a `source_refresh_runs` row and an `activity_log` entry.

### 1.5 Tenancy alignment
- Keep the workspace-shared model (it is what RLS already implements). Rewrite the relevant paragraphs in `/privacy` and `/terms` to state plainly that searches, evaluations, watchlists, and pipeline data are visible to every member of the workspace, and describe the AI processing path (evidence sent to the Lovable AI Gateway, reports stored per workspace).

### 1.6 Cross-tenant test suite
- SQL-level RLS tests asserting that anon, a non-member, an auditor, an editor, an admin, and an owner each see exactly what they should across every user-owned table, including negative cases for plan escalation and cross-workspace reads.

**Exit gate:** no cross-workspace read/write, no client-side plan mutation, no unmetered AI or search, refresh restricted to the owning workspace.

## Phase 2 — Code quality and release engineering

### 2.1 Green the tree
- Run Prettier over the repo, fix the 39 lint errors, and either silence the 14 `react-refresh` warnings per-file with justification or split the offending modules.
- Delete `.github/workflows/ci.yml`, keep `quality-gates.yml` as the single workflow; add `test` and `test:e2e` steps, pin Node 20.x and the package manager, and cache correctly.

### 2.2 Unit tests (Vitest)
Coverage for `src/lib/freshness.ts`, `src/lib/scoring.ts` (including the stale-evidence downgrade), `src/lib/intent.ts`, landed-cost and ROI maths, `src/lib/entitlements.ts` (limits, `allowedMarketplaces`, `parsePlanError`), and the new quota/rate-limit helpers.

### 2.3 End-to-end tests (Playwright)
Signup, login, logout, OAuth callback shape, search plus quota exhaustion on Free, watchlist and evaluation CRUD, invitation accept/decline and role enforcement, connector refresh authorization (positive and negative), AI analysis happy path and quota denial, billing page state, and a real HTTP 404 on an unknown path.

### 2.4 Fix the soft 404
`/nonexistent-page` currently returns 200. Make the root not-found path emit a genuine 404 status and assert it in the e2e suite.

**Exit gate:** `check`, `build`, unit tests, and e2e all green in one CI run on a clean checkout.

## Technical notes

- All new server logic uses `createServerFn` in `*.functions.ts` under `src/lib/`; no Supabase Edge Functions.
- Every new table gets `CREATE TABLE` → `GRANT` → `ENABLE RLS` → policies in the same migration. `rate_limits` grants nothing to `anon`/`authenticated`.
- Quota and rate-limit state lives in Postgres, not memory — server functions run on stateless workers.
- Stripe remains unwired; upgrade CTAs keep routing owners to `/contact`. Once webhooks exist they become the only writer of the now-locked billing columns, which is exactly why they are locked first.
- Delivered as a sequence of migrations plus code changes, with `bunx tsgo --noEmit` and the test suite run after each block.
