# Complete the authenticated MarginMap workspace

Most of the requested stack already exists: Supabase auth, the full schema with RLS, seeded demo catalog, the intent parser, landed-cost/ROI scoring, and the `/app/*` routes (overview, search, variant intel, compare, watchlists, evaluate, pipeline, alerts, settings). This plan closes the gaps between what is built and what the request specifies, without rebuilding working parts.

## Schema decision

The database already has equivalent tables under different names. Keeping them (renaming would break every route and drop seeded data):

| Requested | Existing |
|---|---|
| canonical_products | products + product_variants |
| sold_comps | sale_comps |
| product_evaluations | deal_evaluations |
| profiles, searches, offers, watchlists, watchlist_items | same names, already present |

RLS is already enforced: catalog tables are public-read, all user tables are scoped to `auth.uid()`. No migration is needed unless the gaps below require one — none do.

## Gaps to close

### 1. One recommendation verdict: Buy / Watch / Pass
Today buyers see "Watch / wait"-style strings and resellers see "Source now / Thin edge / Pass". Add a single normalized verdict mapped from the existing role-aware score plus data confidence, rendered as a colored badge (Buy = verified, Watch = caution, Pass = destructive) with a one-line reason. Shown on search results, the offer table, variant intel, compare, and evaluate.

### 2. Search results as a real comparison table
Search currently renders result cards. Add a table view (default) with one row per matching offer and columns: offer, condition, item, ship, tax, marketplace fee, landed cost, median sold, resale estimate, profit, ROI, confidence, verdict. Card view stays available as a toggle for narrative context.

### 3. Fee-inclusive landed cost
Landed cost is item + shipping + tax today. Add the marketplace fee component (reusing the existing fee schedules from the evaluator) as its own column so buyers see the full acquisition cost and resellers see fees on both sides.

### 4. Explicit sold-comp block on every result
Surface median sold, low/high sold range, expected resale price, estimated profit, and ROI inline on search rows and the variant page — not only inside the evidence drawer.

### 5. Provenance on every value
Every displayed number gets source name, retrieved timestamp, match confidence, and an explicit `estimated` / `missing` marker instead of a silent zero (today a zero tax renders as "n/a" only in one table). A small shared provenance component handles this consistently.

### 6. Demo-data labeling
A persistent "Demo data — no live marketplace connections" banner in the workspace shell, plus a per-source badge in the evidence drawer and settings.

### 7. Save actions everywhere
Searches already auto-log. Add explicit "Save this search" (named), "Save evaluation" from search/variant rows, and "Add to watchlist" from any offer row — all writing to the existing user-scoped tables.

### 8. Loading, error and 404 handling
Wire the existing `src/components/states.tsx` skeletons and `RouteError` into every `/app/*` route, add `src/routes/$.tsx` as a friendly catch-all, and register `defaultErrorComponent` / `defaultNotFoundComponent` in `src/router.tsx`.

## Technical notes

- Verdict logic lands in `src/lib/scoring.ts` as a pure function next to `buyerVerdict` / `evaluateDeal`; no scoring weights change.
- Fee schedules move from `app.evaluate.tsx` into `src/lib/scoring.ts` so search, compare and evaluate share one source of truth.
- New shared components: `RecommendationBadge`, `ProvenanceCell`, `ResultTable`, `DemoDataBanner`.
- No database migration; no changes to auth or the marketing site.
