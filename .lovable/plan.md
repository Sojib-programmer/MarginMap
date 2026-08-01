# Restore the database, then complete the MarginMap workspace

## What actually broke

The project is now pointed at a **different, empty Supabase project** (`mzmeepgamxldfsksaxmu`). Confirmed by query: `information_schema.tables` in `public` returns zero rows, and the generated `src/integrations/supabase/types.ts` has `Tables: { [_ in never]: never }`. That is the single cause of all ~55 typecheck errors across `catalog.ts`, `research.functions.ts` and every `/app/*` route — every `supabase.from("<table>")` call now resolves to `never`.

The original 379-line schema + RLS + seed migration is still on disk at `supabase/migrations/20260801002403_*.sql`, so nothing is lost — it just has to be replayed against the new project.

## Step 1 — Replay the schema (unblocks the build)

Re-apply the full migration against the current project, unchanged in substance:

- Enums: `role_mode`, `record_source_type`, `pipeline_status`
- Catalog: `categories`, `brands`, `products`, `product_variants`, `data_sources`, `offers`, `sale_comps`, `market_snapshots`
- User workspace: `profiles`, `searches`, `watchlists`, `watchlist_items`, `deal_evaluations`, `inventory_items`, `research_reports`, `research_evidence`, `alerts`
- GRANTs on every public table (`anon` SELECT on catalog only; `authenticated` full CRUD on user tables; `service_role` everywhere)
- RLS: catalog public-read, every user table scoped to `auth.uid()`
- `updated_at` triggers and the signup trigger that creates a `profiles` row
- Seed data: five categories (cameras, laptops, consoles, collectibles, guitars) with products, variants, offers, sold comps and market snapshots, every `data_sources` row flagged as demo

Table-name mapping vs the request — keeping existing names, since all app code and the seed already use them:

| Requested | Existing |
|---|---|
| canonical_products | `products` + `product_variants` |
| sold_comps | `sale_comps` |
| product_evaluations | `deal_evaluations` |
| profiles, searches, offers, watchlists, watchlist_items | unchanged |

Types regenerate after the migration runs; the ~55 errors clear at that point. No code changes are needed for step 1.

## Step 2 — Close the remaining workflow gaps

With the build green, finish what the workspace is missing against the requested flow:

1. **One recommendation verdict — Buy / Watch / Pass.** Today buyers see "Watch / wait" strings and resellers see "Source now / Thin edge / Pass". Normalize both into a single badge (Buy = verified, Watch = caution, Pass = destructive) with a one-line reason, shown on search rows, offer table, variant intel, compare and evaluate.
2. **Search results as a comparison table.** Search renders cards today. Add a table view (default) with one row per offer: offer, condition, item, ship, tax, marketplace fee, landed cost, median sold, resale estimate, profit, ROI, confidence, verdict. Card view stays as a toggle.
3. **Fee-inclusive landed cost.** Landed cost is item + shipping + tax today; add the marketplace-fee component as its own column, reusing the evaluator's fee schedules.
4. **Sold-comp block inline.** Median sold, low/high range, expected resale, profit and ROI surfaced on search rows and the variant page, not only in the evidence drawer.
5. **Provenance on every value.** Source name, retrieved timestamp, match confidence, and an explicit `estimated` / `missing` marker instead of a silent zero — one shared component used everywhere.
6. **Demo-data labeling.** Persistent "Demo data — no live marketplace connections" banner in the workspace shell, plus per-source demo badges in the evidence drawer and settings.
7. **Explicit save actions.** Named "Save this search", "Save evaluation" from search/variant rows, and "Add to watchlist" from any offer row (searches currently only auto-log).
8. **Loading / error / 404.** Wire the existing `src/components/states.tsx` skeletons and `RouteError` into every `/app/*` route, add `src/routes/$.tsx` as a friendly catch-all, and register `defaultErrorComponent` / `defaultNotFoundComponent` in `src/router.tsx`.

## Technical notes

- Verdict logic goes in `src/lib/scoring.ts` next to `buyerVerdict` / `evaluateDeal`; scoring weights are unchanged.
- Fee schedules move out of `app.evaluate.tsx` into `src/lib/scoring.ts` so search, compare and evaluate share one source of truth.
- New shared components: `RecommendationBadge`, `ProvenanceCell`, `ResultTable`, `DemoDataBanner`.
- Auth (email/password + Google/Apple) and the marketing site are untouched.
- No live scraping or external marketplace APIs.
