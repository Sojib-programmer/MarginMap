# MarginMap payments: subscriptions and workspace entitlements

Built-in payments are enabled in the test environment. The product catalog now contains:

- Pro: $9.99/month or $99/year
- Business: $49.99/month or $449/year
- Enterprise remains contact-sales; Free requires no checkout

## 1. Secure billing data model

- Add a subscription ledger that stores test/live environment, human-readable price ID, provider customer/subscription IDs, status, billing dates, and cancellation state.
- Link each subscription to both the authenticated purchaser and the workspace being upgraded.
- Add explicit authenticated read grants, service-role write grants, RLS for workspace owners, and indexes/uniqueness needed for idempotent event processing.
- Keep `workspaces.plan`, billing dates, and provider IDs protected from client writes; only verified payment events may update them.
- Add a server-side entitlement helper that treats active, trialing, and valid end-of-period cancellations correctly.

## 2. Embedded checkout

- Add the pinned built-in payment libraries and shared gateway-backed payment client.
- Replace the current contact-page upgrade behavior with an embedded checkout inside `/app/billing`.
- Allow only the active workspace owner to start checkout; validate the selected tier and interval against a fixed server-side price map.
- Resolve or create the customer by authenticated user ID, attach the workspace ID and target tier to payment metadata, and reject duplicate active subscriptions.
- Use tax calculation and collection at checkout because the seller account is Singapore-based; registration, filing, and remittance remain the seller’s responsibility.
- Add a visible test-mode banner and a safe checkout return state. Missing live configuration must fail clearly rather than falling back incorrectly.

## 3. Verified subscription lifecycle

- Implement the required signed event endpoint at `/api/public/payments/webhook`.
- Verify every event signature and environment before processing it.
- Handle subscription creation, updates, cancellation, payment failure, renewal, and delayed event delivery idempotently.
- Translate the stable price IDs into `pro` or `business`, update the subscription ledger, then update the linked workspace’s protected entitlement fields through privileged server-only access.
- Preserve paid access through the current period when cancellation is scheduled; downgrade to Free only when entitlement actually expires or terminates.
- Record billing lifecycle changes in the append-only workspace activity log without exposing private payment payloads.

## 4. Billing management UX

- Show current subscription state, renewal/end date, interval, and payment-failure/cancellation notices on `/app/billing`.
- Add “Manage subscription” for payment method updates, invoices, and cancellation through the hosted customer portal.
- Keep owner-only billing controls; non-owner members can view plan entitlements but cannot purchase or manage the workspace subscription.
- Refresh workspace membership and billing data after a successful checkout so unlocked features appear without manual intervention.

## 5. Validation

- Add unit coverage for price-to-tier mapping and active-entitlement rules.
- Add focused tests for owner authorization, invalid price/workspace metadata, event idempotency, environment separation, and cancellation timing.
- Run TypeScript, lint, formatting, unit tests, and a browser smoke test of the test checkout and return flow.

## Live-payment boundary

This implementation makes the preview testable. Real charges remain disabled until the Stripe account is claimed, business verification is completed, the Lovable app is installed on the live account, and the Payments readiness check passes.
