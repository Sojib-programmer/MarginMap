# Production-grade pass 2: finish the workspace decision flow

Search is done (ResultTable + economics + provenance + save-search + QueryBoundary). Everything below closes the remaining gap. No schema changes, no live data sources, marketing pages untouched.

## Confirmed current state

- `offerEconomics()` / `recommend()` are used only in `result-table.tsx` and `offer-table.tsx`.
- `QueryBoundary` / `errorComponent` are wired only in `app.search.tsx`.
- `app.compare.tsx` still calls the legacy `evaluateDeal` + `buyerScore` path and prints tax as `"not provided"` by hand instead of `ValueCell`.
- `use-workspace-actions.ts` exposes `useSaveSearch`, `useCreateWatchlist`, `useAddToWatchlist`, `useSaveEvaluation` — only the search one is called from a route today.

## 1. One economics path in the remaining decision views

| View | Change |
|---|---|
| `app.compare.tsx` | Drop `evaluateDeal`/`buyerScore`; each card renders the full chain from `offerEconomics()` + `recommend()` with `ValueCell` and `ProvenanceCell`, plus an "add to watchlist" action |
| `app.variant.$id.tsx` | Market metrics switch to `ValueCell`; offer table already shares the engine; add "save evaluation" for the best offer |
| `app.evaluate.tsx` | Keep the input controls, but the verdict panel reads fee schedule, profit, ROI and recommendation from the shared functions and persists via `useSaveEvaluation` |

Displayed chain, identical everywhere:

```text
item price -> shipping -> tax -> marketplace fees -> landed cost
-> median sold (low/high) -> expected resale -> estimated profit -> ROI
-> Buy / Watch / Pass + one-line reason
```

Absent numbers render as **missing**, derived ones as **estimated**. No financial value is ever printed as `$0` because the source omitted it.

## 2. Reliability on every remaining /app route

`app.index.tsx`, `app.compare.tsx`, `app.variant.$id.tsx`, `app.evaluate.tsx`, `app.watchlists.tsx`, `app.pipeline.tsx`, `app.alerts.tsx`, `app.settings.tsx` each get:

- `errorComponent: RouteError` on the route definition
- `QueryBoundary` (or the matching skeleton) around every data read
- an `EmptyState` with a concrete next action for the zero-row case

## 3. Watchlist and evaluation actions actually reachable

- Watchlists page: create-watchlist form wired to `useCreateWatchlist`, item removal, and target-price display.
- Add-to-watchlist available from compare cards, variant offers, and the search result table.
- Save-evaluation available from Evaluate and from the variant page.
- All go through the browser Supabase client with `user_id` from the session, so existing `auth.uid()` RLS enforces isolation. No policy changes.

## 4. Production hardening

- Per-route `head()` metadata check across `/app/*` (all noindex) and the marketing routes.
- Toast feedback on every mutation, invalidation of the affected queries.
- `tsgo --noEmit` clean, then a preview spot-check of compare, evaluate, and one save action.

## Technical notes

- No new dependencies, no new tables.
- `evaluateDeal` stays in `src/lib/scoring.ts` only if something still imports it; otherwise it is removed once Compare and Evaluate migrate.
- Presentation-only changes in routes; all shared math remains in `src/lib/scoring.ts`.
