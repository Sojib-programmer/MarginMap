# Close the decision-flow pass: Evaluate, Variant intel, legal footer

Three targeted changes. No schema changes, no new dependencies, no live data.

## Confirmed current state

- `app.evaluate.tsx` still runs the legacy `evaluateDeal()` path, prints raw `money2()` strings via a local `Line` helper, has no `recommend()` verdict, no provenance, no `QueryBoundary`/`errorComponent`, and hand-rolls its own Supabase insert instead of `useSaveEvaluation`.
- `app.variant.$id.tsx` renders market metrics through a local `Metric` component with plain `money()` — no missing/estimated labeling — and has a hand-rolled watchlist mutation, no save-evaluation action, and no `QueryBoundary`.
- `site-footer.tsx` legal column ends at the copyright line; no company registration block.

## 1. Evaluate — shared verdict panel

- Outcome panel switches to `offerEconomics()` + `recommend()` when an offer is loaded via `?offer=`, so the displayed chain matches Search, Compare and Variant exactly: item → shipping → tax → marketplace fees → landed cost → median sold (low/high) → expected resale → profit → ROI → Buy/Watch/Pass with one-line reason.
- The editable input form stays as-is; user overrides (repair, outbound shipping, packaging, returns reserve, marketplace) still drive the fee/cost side, and the manual-only case (no offer selected) keeps working off the typed inputs.
- Every money line renders through `ValueCell`: sourced, **estimated** for derived values, **missing** where the source gave no tax — never `$0` for absent data.
- `ProvenanceCell` under the header for the seeded offer: source name, retrieved timestamp, match confidence, listing link.
- `RecommendationBadge` replaces the free-text `result.verdict`; flags stay as caution chips.
- Save switches to the shared `useSaveEvaluation` hook (records recommendation, reason, fees, landed cost, sample size, flags). Add-to-pipeline stays.
- Route gets `errorComponent: RouteError`, `QueryBoundary` around the catalog and saved-evaluations reads, and an empty state on the saved list.

## 2. Variant intel — labeled metrics and save evaluation

- The four header metrics (comp median, comp range, completed sales, days to sell) render via `ValueCell` with state driven by sample size and confidence: no comps → **missing** with "no completed sales recorded"; modeled days-to-sell → **estimated**.
- Add a "Save evaluation" action for the best offer on the variant, using `offerEconomics()` + `recommend()` and the shared `useSaveEvaluation` hook, with the resulting verdict shown next to it via `RecommendationBadge`.
- Watchlist add switches to the shared `useAddToWatchlist` hook (keeps the target-price input).
- Route gets `errorComponent: RouteError` and `QueryBoundary` around catalog, reports and watchlists.

## 3. Footer legal block

Add the company registration line under the copyright in `site-footer.tsx`, as small muted text, semantically inside the footer's legal area:

```text
Marketsync Global Ltd. · Reg. No RAJC-2483/2025 · TIN 317774303960 ·
Trade Licence 01/13-2665 · Kashidanga City Gate, Rajpara, Rajshahi-6201,
Bangladesh · Incorporated under the Companies Act, 1994 (Act XVIII of 1994).
```

## Technical notes

- `evaluateDeal` is kept only for the fee/cost mechanics the calculator inputs need; the headline verdict and profit/ROI display come from `offerEconomics()`/`recommend()` so there is one displayed math path.
- All persistence goes through the browser Supabase client with the caller's `user_id`; existing `auth.uid()` RLS is unchanged.
- Close with `tsgo --noEmit` and a preview check of Evaluate, one variant page, and the footer.
