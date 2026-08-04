# Finish the workspace reliability + decision-flow pass

Everything below builds on what already exists: `offerEconomics()` / `recommend()` in `src/lib/scoring.ts`, and `RecommendationBadge` / `ValueCell` / `ProvenanceCell` / `DemoDataBanner` in `src/components/primitives.tsx`, plus the skeleton/error/empty set in `src/components/states.tsx`. No schema changes, no new data sources, marketing pages untouched.

## 1. Catch-all and router defaults

- New `src/routes/$.tsx` — splat route rendering a friendly not-found page with links back to the marketing home and the workspace.
- `src/router.tsx` gains `defaultNotFoundComponent` (wrapping `RouteNotFound`) and `defaultErrorComponent` (wrapping `RouteError`), so any route without its own boundary degrades gracefully instead of blanking.

## 2. State wiring across `/app/*`

Every authenticated route gets the same treatment: `QueryBoundary` (or the matching skeleton) around its data reads, an `EmptyState` with a concrete next action when there are zero rows, and `errorComponent: RouteError` on the route definition so a failed fetch shows a retry button rather than a crash.

Routes covered: overview, search, variant detail, compare, watchlists, evaluate, pipeline, alerts, settings.

## 3. Demo-data banner

`DemoDataBanner` mounts once in the authenticated `AppShell`, above the route outlet, stating plainly that listings, prices, comps, and recommendations are sample data and not live market data. Per-source demo badges stay where they already are in the evidence drawer.

## 4. One economics path in every decision view

Search, Variant, Compare, and Evaluate all switch to `offerEconomics()` + `recommend()`. Each offer row/card exposes the full chain, in this order:

```text
item price → shipping → tax → marketplace fees → landed cost
→ median sold (low/high) → expected resale → estimated profit → ROI
→ Buy / Watch / Pass + one-line reason
```

- Search becomes a comparison table (one row per offer) with those columns; the existing card layout stays available as a toggle.
- `src/components/offer-table.tsx` drops its local `evaluateDeal` call and reads the same economics object.
- Compare cards show the identical field set so the numbers agree with search.
- Evaluate keeps its input controls but sources its fee schedule and verdict from the shared functions.

## 5. Provenance everywhere

`ProvenanceCell` (source name, retrieved timestamp, match confidence) attaches to every offer and comp surface. `ValueCell` renders any absent number as **missing** and any derived number as **estimated** — no financial value is ever printed as `$0` because the source omitted it. Tax is the main case today.

## 6. Authenticated save actions

Four working mutations against the existing tables, each with success/error toasts via sonner and a query invalidation:

| Action | Table |
|---|---|
| Save this search | `searches` |
| Save evaluation | `deal_evaluations` |
| Create watchlist | `watchlists` |
| Add offer/evaluation to watchlist | `watchlist_items` |

All go through the browser Supabase client with `user_id` set from the current session, so the existing `auth.uid()` RLS policies enforce isolation. No policy changes needed — the current policies already scope every one of these tables to the owner.

## 7. Verification

`tsgo --noEmit` must be clean before the turn ends, and I'll spot-check the search table and a save action in the running preview.

## Technical notes

- No new dependencies.
- Shared verdict/economics logic stays in `src/lib/scoring.ts`; only presentation moves into components.
- New components if needed: `ResultTable` for the search comparison view; everything else reuses existing primitives.
- `src/routes/index.tsx` does not exist in this project — `/` is served by `_marketing.index.tsx`, so the splat route adds no conflict.
