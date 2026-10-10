# MarginMap production audit (read-only): findings and fix plan

Only read access was used. Every finding below was confirmed by reading the code unless it is marked *unverified*.

## Critical

**C1. Free Business plan through sandbox checkout (sandbox and live share one database)**
- `src/lib/payments.functions.ts`: the client chooses `environment`, and `z.enum(["sandbox","live"])` accepts either value.
- `src/routes/api/public/payments/webhook.ts`: `?env=sandbox` events update `workspaces.plan` in the production table. `PAYMENTS_SANDBOX_WEBHOOK_SECRET` is set.
- How it's exploited: any owner calls `createCheckoutSession({environment:"sandbox"})` and pays with the 4242 test card. The sandbox webhook then grants Pro or Business, which includes API keys and 1,000 calls.
- Fix: work out the environment on the server (one environment per deployment) and reject any mismatch. In the webhook, refuse to change a workspace plan from a sandbox event when the deployment is live. Store `environment` on workspaces and only let events from the same environment change it.

**C2. Live payments never activate (unchanged)**
- `PAYMENTS_LIVE_WEBHOOK_SECRET` isn't set, and the app's live endpoint isn't registered in Stripe. `verifyWebhook` throws, so customers pay and stay on Free.
- Fix: blocked until you choose one of the three provisioning options. After that, run a signed replay test.

## High

**H1. Refreshed offers are never attached to a product variant**
- `src/lib/connectors/run.server.ts` (around lines 97-122): `fetchOffers` takes the variant titles as queries, but the upsert payload has no `variant_id`. Every refreshed offer is orphaned, so search, comps and recommendations never see it. On top of that, `is_live = upserted > 0` labels a source "live" even though none of its data reaches users.
- Fix: the adapter should return the query or variant each row matched. Set `variant_id` and `match_confidence` from it, drop rows below a confidence threshold, and only mark a source live when attached rows exist.

**H2. Retiring stale listings can remove a whole source's catalogue**
- In the same file, the run deactivates everything older than the cutoff whenever `upserted > 0`. A partial run (for example, one query returns results and the rest time out) retires valid listings.
- Fix: only retire listings for queries that succeeded in this run.

**H3. Open redirect in billing return URLs**
- `src/lib/payments.functions.ts`: `returnUrl: z.string().url()` accepts any origin, and it is used as the Stripe checkout and portal return URL.
- Fix: only allow `SITE_URL` and preview origins, or build the URL on the server.

**H4. Currency is ignored in landed cost**
- Firecrawl and eBay return EUR (confirmed earlier: 30.89 EUR shown as dollars). `currency_code` is stored but neither `search-fallthrough.tsx` nor scoring converts it.
- Fix: mark non-USD values as estimated, or convert them with a dated exchange rate.

## Medium

- **M1. Webhook trusts metadata for the workspace ID** (`webhook.ts processSubscription`). The HMAC check proves the event came from Stripe. But a subscription's metadata can be set through the portal or the API on the account, and the customer isn't matched against `workspaces.stripe_customer_id`. Fix: when a workspace already has a `stripe_customer_id`, require the event's customer to match it.
- **M2. Out-of-order webhook events.** Plan updates have no ordering guard (`event.created` is never compared). A late `subscription.updated` can overwrite a later `deleted`. Fix: store the last event timestamp per subscription and skip older events.
- **M3. Burst limit is per workspace, not per key** (`api_gateway`, `hit_rate_limit('api:'||workspace)`). One leaked key can exhaust quota for every other integration in the workspace. `hit_rate_limit` also deletes old rows on every call, which adds write contention. Fix: add a per-key bucket and move cleanup to a cron job.
- **M4. Public `/contact` insert has no rate limit or CAPTCHA** (RLS allows inserts from anyone). Fix: route it through a server function with `hit_rate_limit` keyed on IP.
- **M5. MCP tools rely only on RLS for workspace membership** (`src/lib/mcp/tools/*`). This is correct today. But a missing membership check returns an empty list rather than "forbidden", and nothing tests it. Fix: check membership explicitly and add a two-workspace test.
- **M6. SSRF.** `listing.functions.ts` accepts `http:` and relies on Firecrawl to block internal addresses. Fix: allow only https, reject IP literals and private host names before calling out.

## Low

- **L1.** `api_log` runs a second hash lookup per request and records the endpoint as free text (capped at 100 chars). That's fine; just note the doubled hashing cost.
- **L2.** `getStripeEnvironment` throws when the client token is missing, which can crash checkout rendering. Show an empty state instead.
- **L3.** Dependency advisories (undici, js-yaml) are still open. They're low risk on the edge runtime.

## Tests and CI gaps (`tests/`, `.github/workflows/quality-gates.yml`)
- There are only unit tests for pure logic (7 files) and 2 end-to-end specs. Nothing tests RLS, two-workspace isolation, the webhook (signature, replay, ordering, environment mismatch), the API gateway (401/403/429, quota race), or the connector refresh.
- Add: pgTAP or SQL RLS tests, webhook fixture tests, gateway tests against a seeded key, and connector tests with a mocked adapter.

## Not verified
- How auth settings are configured in the hosted dashboard (this setup can't sign in).
- Live exploitability of C1 end to end. The code path is confirmed, but no transaction was run.

## Proposed fix order (on approval)
1. C1 (deny sandbox events from changing plans in a live deployment; server-side environment).
2. H1 + H2 (attach offers to variants, scope retirement to successful queries).
3. H3, M1, M2 (billing hardening), then H4.
4. M3-M6, then the test suite for the gaps above.
C2 stays blocked on your Stripe choice.
