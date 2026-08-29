# Connector framework + workspace invitations UI

Two remaining audit items. Both ship without external credentials.

## Part A — Live connector framework (adapter disabled until keys exist)

Confirmed present already: `data_sources` carries `is_live`, `refresh_interval_minutes`, `last_refreshed_at`, `last_error_at`, `last_error_text`, `snapshot_date`, and `source_refresh_runs` exists with `status`, `rows_upserted`, `error_text`, `started_at`, `finished_at`. The plumbing around them is missing.

Build:

- **Refresh endpoint** at `src/routes/api/public/refresh/$source.ts`. Bearer-secret protected with a timing-safe compare against a generated `REFRESH_TASK_SECRET`; unauthenticated callers get 401 before the body is read. Opens a `source_refresh_runs` row (`running`), dispatches to the adapter, closes the row with `succeeded`/`failed`, rows upserted, and error text, and stamps `data_sources.last_refreshed_at` / `last_error_*`.
- **Adapter registry** in `src/lib/connectors/`: a typed `SourceAdapter` interface (`fetchOffers(variants) -> NormalizedOffer[]`), a shared upsert that writes `offers` with `retrieved_at`, `match_confidence`, and `data_source_id`, and deactivates offers no longer returned. Registry lookup by `data_sources.marketplace`.
- **eBay adapter stub** implementing the interface against the Browse API, but registered as `unavailable` when `EBAY_APP_ID`/`EBAY_CERT_ID` are absent. Calling refresh for it returns a clean `missing_credentials` failure run rather than throwing — the run row records why. When the keys land, the adapter flips on with no other change.
- **Manual refresh** for owners/admins: a "Refresh now" action per source on `/app/data-sources`, going through an authenticated server function that calls the same code path and writes to `activity_log`.
- **Health surface** on `/app/data-sources`: last 5 runs per source (status, duration, rows, error), consecutive-failure count, and an overdue warning when a live source has not refreshed within its stated interval. Sample sources show "no automatic refresh" as today.
- **Scheduling** documented but not activated: the endpoint URL and pg_cron statement recorded on the page for the operator to enable once a source is live. No cron job pointing at an adapter that can't authenticate.

## Part B — Workspace invitations UI (in-app, no email)

`workspace_invitations` exists with `email`, `role`, `expires_at`, `invited_by`, `accepted_at`/`accepted_by`, `revoked_at` — no token column, so acceptance matches the signed-in user's confirmed email server-side.

Build:

- **Members panel** on `/app/settings` (or a `/app/members` route if settings gets crowded): current members with role, join date, and the owner marked. Owner/admin only sees the management controls; auditors see a read-only list.
- **Invite form**: email + role (admin/editor/auditor). Server function enforces owner/admin, blocks inviting a role above the inviter, blocks duplicate pending invites and existing members, sets a 14-day expiry, and logs `invitation.sent`.
- **Pending invite list** with status chips (pending / expired / accepted / revoked) and a Revoke action for owner/admin, logged as `invitation.revoked`.
- **Acceptance flow**: after sign-in, a banner appears when a non-expired, non-revoked invite matches the user's confirmed email. Accepting calls a server function that re-verifies the email against the JWT claim, inserts the `workspace_members` row at the invited role, stamps `accepted_at`/`accepted_by`, and logs `invitation.accepted`. Declining stamps revoked.
- **Workspace switcher** in the sidebar once a user belongs to more than one workspace; `membershipQuery` currently hard-limits to the first membership, so it becomes a list plus a persisted active-workspace selection.
- **Role changes and removal**: owner/admin can change a member's role or remove them, never self-promote, never remove the owner, both logged.

## Technical notes

Migration adds RLS policies and grants for invitation reads (own-email pending invites readable by the invitee), plus security-definer functions `accept_workspace_invitation`, `revoke_workspace_invitation`, and `set_member_role` so no client-supplied role reaches a policy. All writes route through `createServerFn` with `requireSupabaseAuth`; the browser client keeps RLS-safe reads only. `REFRESH_TASK_SECRET` is generated, not user-supplied. eBay keys are requested only when you're ready for Part A's live phase.

## Sequencing

1. Invitations: migration, server functions, members UI, acceptance banner, workspace switcher.
2. Connector framework: endpoint, registry, run logging, health UI, manual refresh.
3. eBay adapter activation once credentials are supplied.
