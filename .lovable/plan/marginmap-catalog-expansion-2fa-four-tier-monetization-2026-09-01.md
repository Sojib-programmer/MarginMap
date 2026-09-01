# MarginMap: Catalog Expansion, 2FA, Four-Tier Monetization

Phases 1–4 of the spec. Growth/email (Phase 5) is out of scope.

## 1. Tier model replacement

Current live model is `research / reseller / team` at $0 / $29 / $79, gated in three
places only (evaluate, pipeline, sidebar nav). It gets replaced by:

| Tier | Price | Searches/day | Watchlists | Alerts | Sources | Modes | Export | History |
|---|---|---|---|---|---|---|---|---|
| Free | $0 | 5 | 3 | 0 | 2 of 3 | Buyer only | none | — |
| Pro | $9.99/mo, $99/yr | unlimited | 50 | 10 | all 3 | Buyer + Reseller | CSV | 30d |
| Business | $49.99/mo, $449/yr | unlimited | unlimited | unlimited | all 3 | both | CSV + PDF | 90d |
| Enterprise | contact sales | unlimited | unlimited | unlimited | all 3 | both | all | full |

Business adds: up to 5 seats, bulk CSV price checker, 1,000 API calls/month,
analytics dashboard, margin benchmarking. Enterprise adds: unlimited seats and API,
SSO/SAML positioning, webhooks, SLA.

Existing workspaces migrate: `research → free`, `reseller → pro`, `team → business`.

## 2. Enforcement (database first, UI second)

Quotas are enforced server-side; the UI only explains a refusal.

- New enum `plan_tier` values, `workspaces` gains `tier_expires_at`,
  `billing_cycle_start/end`, `stripe_customer_id`, `stripe_subscription_id`,
  `billing_interval`.
- New `usage_counters` table keyed on (workspace_id, metric, period_start) for
  daily searches and monthly API calls, incremented through a SECURITY DEFINER
  `consume_quota()` that raises when the tier limit is hit. Daily reset is
  implicit via `period_start = current_date` — no cron needed.
- Watchlist, alert, and seat caps enforced by `BEFORE INSERT` validation triggers
  reading the workspace tier.
- Free tier's "2 of 3 marketplaces" enforced in the catalog query layer plus an RLS
  predicate on the offers read path so the third marketplace is genuinely absent,
  not hidden client-side.

## 3. Paywall UX

Replace `ResellerPlanGate` with a generic `PlanGate feature tier` plus an inline
`QuotaBanner` (searches used today / cap). Upsell copy per spec: search cap hit,
export locked, watchlist cap, alerts locked, reseller-mode toggle locked. Every gate
links to the upgrade flow rather than dead-ending.

## 4. Stripe

Enable Lovable's built-in Stripe payments (no keys needed from you), create the four
products with monthly + annual prices, then wire Checkout and a webhook that writes
`plan`, `billing_interval`, cycle dates, and Stripe IDs onto the workspace row.
Enterprise routes to `/contact` instead of checkout. Annual savings badges (17% / 25%)
shown on both the marketing pricing page and `/app/billing`.

Sandbox/test mode first; you claim the account before live charges.

## 5. Two-factor authentication

Supabase MFA (TOTP) in Settings → Security: enroll with QR, verify 6-digit code,
generate and display one-time backup codes stored hashed in a new `mfa_backup_codes`
table (verified server-side, never readable by the client). Login flow gains an MFA
challenge step when an enrolled factor exists. Email codes are not implemented —
Supabase TOTP plus backup codes covers the recovery path; email OTP would need a
second delivery channel.

## 6. Catalog expansion

Ten new categories (smartphones/tablets, headphones & audio, gaming accessories,
wearables, computer components, networking, photography accessories, musical
instruments, vintage electronics, industrial tools) for 15 total, with 100–200 curated
variants spread across Amazon/eBay/Shopify offers plus sold comps and market snapshots
so scoring works everywhere. Data carries the existing curated-snapshot provenance
labeling with today's date, and category pages show a "live pull available on Pro"
call to action. Connectors stay on the existing eBay adapter; Amazon/Shopify adapters
are stubbed in the registry for progressive rollout.

Search gains: category selector with icons, brand filter, price range, condition,
marketplace checkboxes, profit-margin threshold, sort by profit/price/confidence,
autocomplete over the catalog with locally stored recent searches, and a
"Best Deals Today" widget on `/app`.

## 7. Legal & compliance

Add the informational-use disclaimer (non-affiliation with Amazon/eBay/Shopify) to
result surfaces and footer. Privacy and Terms updated for data sourcing disclosure,
recurring billing, 30-day refund policy, and GDPR/CCPA statements. Connector runner
gains rate limiting and a robots.txt compliance check. Legal counsel review is yours
to arrange — this delivers the copy and the technical controls.

## Technical notes

- Migrations: enum swap on `workspaces.plan` (add values, backfill, drop old),
  `usage_counters`, `mfa_backup_codes`, cap-enforcement triggers, `consume_quota()`
  and `current_tier_limits()` in the `private` schema per existing convention.
- Every new public table gets explicit GRANTs plus RLS scoped to workspace membership.
- Stripe webhook lands at `src/routes/api/public/stripe-webhook.ts` with signature
  verification before any write; checkout session creation is a `createServerFn`.
- Quota consumption is called from the search server path, not the client.
- All mutations continue writing to `activity_log`.

## Out of scope

Email onboarding sequences, referral program, mobile app, cohort analytics, chat
widget, and the public API surface for Business tier (quota counter is built; the
endpoints themselves are a later round).
