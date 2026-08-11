# Final production-readiness verification

Everything is built. This pass is pure verification + hardening. No new features, no schema changes, no marketing pages.

## Current state

- All workspace routes exist and use the shared economics engine (`offerEconomics()` + `recommend()`).
- All authenticated actions (save search, save evaluation, create watchlist, add to watchlist) are wired and RLS-protected.
- Error boundaries, loading states, empty states, and the 404 catch-all are in place.
- Marketing pages, footer, and company registration block are complete.
- Security scan results are clean but stale (most recent 3 days ago).

## Verification steps

1. **Fresh security scan**
   - Run `security--run_security_scan` and confirm no critical findings before publishing.
   - Re-check any stale scanner results.

2. **Quality gates**
   - `npm run typecheck`
   - `npm run lint`
   - `npm run format:check`
   - `npm run build`
   - All must pass with no warnings or errors.

3. **Production smoke test**
   - Navigate marketing homepage, pillar pages, and footer pages.
   - Sign in via the /auth flow.
   - Run a sample search, verify the comparison table, intent panel, and save-search action.
   - Open a variant, verify metrics labeling and save-evaluation.
   - Compare offers, add to watchlist, create a watchlist.
   - Verify toasts and error boundaries.

4. **Deployment check**
   - If not already published, publish after security/typecheck/build are clean.
   - Confirm the live URL serves the latest build and deep links work.

5. **Final polish checklist**
   - No remaining `console.log` / debug statements in production UI paths.
   - All route `head()` metadata present and no placeholder text.
   - OG/Twitter tags present on marketing index.
   - Demo-data banner visible in the authenticated workspace.
   - Footer legal text renders correctly.

## Outcome

After these steps pass, the project can be declared production-ready and published.
