# MarginMap — Production Readiness Audit (read-only)

No files, database rows, findings, or deployments were changed. Verdict is at the end.

## Verdict

**Ready for private beta only. Not ready for public launch.**

Security posture is genuinely good (RLS everywhere, private-schema helpers, no anon read leaks on user data). What blocks a public launch is commercial and operational: paid limits are not enforced, the catalog is 5 products frozen 37 days ago, and CI fails on the current tree.

---

## 1. Build, typecheck, lint, format, CI

| Check                                                | Result                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bunx tsgo --noEmit`                                 | PASS — clean                                                                                                    |
| `bunx eslint . --max-warnings=0`                     | **BLOCKER** — 53 problems (39 errors, 14 warnings)                                                              |
| `bunx prettier --check .`                            | **BLOCKER** — 12 files unformatted                                                                              |
| CI (`.github/workflows/ci.yml`, `quality-gates.yml`) | **BLOCKER** — both run `npm run check`, which runs typecheck + lint + `format:check`; the current tree fails it |
| Tests                                                | **WARNING** — no test runner, no test files, zero automated regression coverage                                 |

Offending files include `src/routes/_marketing.blog.$slug.tsx`, `_marketing.contact.tsx`, `_marketing.fee-calculator.tsx`, `src/routes/app.evaluate.tsx`, `src/content/posts.ts`, `src/components/app-shell.tsx`, `src/lib/membership.tsx`. All errors are `prettier/prettier` (auto-fixable); the 14 warnings are `react-refresh/only-export-components` (cosmetic).

Two CI workflows duplicate the same job — redundant minutes, and no workflow gates deployment.

## 2. Routes

Curled all public routes plus `/app` and `/auth` on the dev server: `/`, `/pricing`, `/blog`, `/fee-calculator`, `/contact`, `/robots.txt`, `/sitemap.xml`, `/app`, `/auth` all return 200. PASS.

**WARNING — soft 404:** `/nonexistent-page` returns HTTP **200** with the friendly not-found page. Search engines treat this as a valid page. Needs a real 404 status from the root `notFoundComponent` path (confirm against a production build, as dev SSR can mask status codes).

## 3. Auth and server-function authorization

- `_authenticated`-style gating plus `requireSupabaseAuth` middleware on `runResearch` and `refreshSource`. PASS.
- `submitContactMessage` is deliberately public and Zod-validated (`src/lib/contact.functions.ts`). Correct by design.
- **WARNING — over-broad authorization on `refreshSource`** (`src/lib/sources.functions.ts:19-33`): it checks that the caller is `owner`/`admin` of _any_ workspace, not of one entitled to that source. Since `handle_new_user()` makes every new signup the owner of their own workspace, **every signed-in user can trigger connector refreshes** on global `data_sources`. That is an outbound-API cost and rate-limit abuse vector.
- `supabaseAdmin` in `research.functions.ts` is imported lazily inside the handler after auth. PASS.

## 4. Database security

- RLS enabled on **all 26** public tables; every user-owned table carries 4 workspace-scoped policies using `private.is_workspace_member` / `private.can_write`. PASS.
- Fail-closed tables verified: `activity_log` (`ALL … USING false` + `log_activity()` only), `contact_messages` (`SELECT … false`, anon INSERT only), `mfa_backup_codes` (`SELECT … false`), `usage_counters` (RPC-only writes), `source_refresh_runs` (`anon SELECT = false`, admin-only read). PASS.
- Anon-readable tables are catalog only: `brands`, `categories`, `products`, `product_variants`, `offers`, `sale_comps`, `market_snapshots`, `data_sources`. Appropriate.
- Supabase linter: 6 warnings — 5 intentional `SECURITY DEFINER` RPCs (`consume_quota`, `log_activity`, invitations, `current_tier_limits`), and **WARNING: leaked-password protection is still disabled** (Dashboard → Auth → Password Security; a one-click fix that has been open across several audits).
- No storage buckets. Secrets are server-side; `.env` contains only URL/publishable/project-id values. PASS.
- **WARNING:** `SOURCE_REFRESH_SECRET` is not present in the secrets list, so `/api/public/refresh/$source` returns 503 in production — the scheduled path is inert. The handler itself is correct (constant-time compare of SHA-256 digests, UUID validation, 401 on mismatch).

## 5. Data integrity and honesty

**BLOCKER — the catalog is not launch-grade.** Live counts:

- 5 products, 13 offers, 63 sold comps
- All 6 `data_sources`: `is_live = false`, `snapshot_date = 2026-08-01`, `last_refreshed_at = 2026-08-01`
- `source_refresh_runs`: **0 rows** — no refresh has ever run
- `auth.users`: 1 (the auditor account)

Labeling is honest — `src/lib/freshness.ts` classifies anything over 7 days as "Stale · Nd old", emits `stalenessCaveat()`, and `scoring.ts` downgrades verdicts on stale evidence. Nothing pretends to be live, and no "Updated today" string exists in the code. But a paid product cannot ship a 5-product catalog whose every number renders in destructive red as 37 days stale. The approved expansion to 15 categories / 100–200 products was never executed.

## 6. AI, quotas, billing, payments

- **BLOCKER — plan limits are not enforced on searches.** `consumeQuota()` exists in `src/lib/entitlements.ts:256` and the `consume_quota()` RPC is correct and fail-closed, but **nothing calls it**. Only `usageQuery` (read-only display) is used, in `app-shell.tsx` and `app.billing.tsx`. The advertised Free limit of 5 searches/day is decorative; watchlist/alert/seat caps _are_ enforced by triggers, and Pro-gated writes _are_ enforced in RLS `WITH CHECK`.
- **WARNING — AI gateway error semantics not handled.** `src/lib/research.functions.ts` catches only `NoObjectGeneratedError`; there is no branching on 402 (out of credits), 403 (blocked), 429 (`Retry-After`), or 5xx. Users will see raw errors; a credit exhaustion looks like a generic crash.
- **WARNING — payments not wired.** `stripe_customer_id` / `stripe_subscription_id` columns exist, `upgrade-button.tsx` honestly routes owners to `/contact`, and there is no checkout, no webhook endpoint, no subscription lifecycle. Honest, but there is no way to actually collect money — so nothing gates revenue today.

## 7. Scheduled refresh and reliability

No `pg_cron` extension installed, no scheduler configured, no refresh secret set, zero recorded runs. The connector framework and eBay adapter exist but have never executed against production. **BLOCKER for any "live data" marketing claim**; acceptable for a beta that says "curated sample".

## 8. SEO, legal, support

- `robots.txt` correct: crawlers allowed, `/app` and `/auth` disallowed, sitemap declared at the live domain. PASS.
- `sitemap.xml`: 24 URLs, all public. PASS.
- Unique `head()` per public route; blog, pillars, pricing, fee calculator all render. PASS.
- `/privacy` and `/terms` exist; `/contact` writes to `contact_messages`. PASS.
- **WARNING:** the contact form has no rate limit, no captcha, and an anon `INSERT … WITH CHECK true` policy — an open spam sink for the staff inbox.
- **WARNING:** soft 404 (see §2).

## 9. Observability, backups, migrations

- 20 sequential migrations, all applied and consistent with the live schema. PASS.
- `activity_log` gives an append-only in-app audit trail. PASS.
- **WARNING:** no error tracking (Sentry or equivalent), no uptime monitoring, no structured server logging beyond `console.error`, no alerting on connector failures.
- **WARNING:** backup/PITR posture is a Supabase project-plan setting that cannot be read from here — confirm PITR is on before taking real customer data.

---

## Blocker summary (must clear before public launch)

1. Lint + format failures break CI on the current tree.
2. Search quota (`consume_quota`) never called — paid tier limits are unenforceable.
3. Catalog is 5 products, frozen 37 days, zero refresh runs, no live source.
4. No scheduler, no `SOURCE_REFRESH_SECRET` — refresh endpoint is inert in production.

## Warning summary

Over-broad `refreshSource` authorization · leaked-password protection off · AI gateway 402/403/429 unhandled · no payment collection · contact form unthrottled · soft 404 · no tests · no observability · backups unverified · duplicate CI workflows.

**Private beta is defensible today** — the security model holds, the data is labeled honestly, and the app functions. Public launch is not, until the four blockers close.
