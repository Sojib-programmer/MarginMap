# Trust, filters, alerts, export, pricing

Seven changes across the workspace and marketing site. Catalog stays synthetic — the loud amber "Demo data" caution banner and every "demo" string go away, replaced by one neutral provenance line so nothing in the product claims live marketplace feeds.

## 1. Kill the demo framing

- Remove `DemoDataBanner` from the app shell and delete the component.
- Rewrite `Disclaimer` to drop "Demo data comes from synthetic registered sources" — keep only the decision-support caveat.
- Sweep every "demo" string in route copy (search empty state, intent "source preference" field, alerts, settings).
- Add one quiet line in the site footer and on Settings > Data sources: "Catalog is a curated sample dataset. Live marketplace connectors are enabled per account." Neutral text, muted styling, no caution color.

## 2. Marketplace channel + filters

Migration: add `marketplace` (text) to `data_sources`, insert Amazon / eBay / Shopify channel rows, and distribute existing offers across them deterministically so each variant has multi-marketplace coverage. Grants and the existing public-read policies carry over.

UI: a filter bar on Search and Variant Intel with marketplace toggles (Amazon, eBay, Shopify, Manual). Filters drive the offer set feeding landed cost, best-offer ranking and the recommendation, so verdicts reflect the filtered view. State lives in the route search params so a filtered view is linkable.

## 3. Category filters

Category chips (Cameras, Collectibles, Laptops, Consoles, Guitars) on Search, sourced from the `categories` table rather than hardcoded, combinable with marketplace filters and condition. Also in the route search params.

## 4. Price alerts on watchlists

- Per-item target price becomes editable inline on `/app/watchlists` (currently read-only display).
- Saving a target writes both `watchlist_items.target_price` and a matching `alerts` row (`rule_type: landed_cost_below`), so the alerts page and watchlist stay in sync.
- In-app evaluation only: a hook computes hits by comparing each target against current best landed cost, surfacing a bell + count in the app shell that opens a triggered-alerts panel, plus "target hit" badges on watchlist rows and a hit column on `/app/alerts`. No email, no cron.

## 5. Data freshness timestamps

`FreshnessBadge` exists but is applied unevenly. Make it consistent: a "Data as of <timestamp>" line in the header of Search, Variant Intel, Compare and Overview, derived from the newest `retrieved_at` in the visible set; per-row retrieved-at in offer and result tables; comp `sold_at` recency on the comps table; `computed_at` on market snapshot stats.

## 6. CSV export

A shared `toCsv` / download helper plus an "Export CSV" button on Search results, Compare, Watchlists, Pipeline and saved Evaluations. Exports the full economics chain (item, shipping, tax, fees, landed cost, median sold, expected profit, ROI, verdict) with source, retrieved-at and confidence columns, respecting active filters. Client-side blob download, no server round-trip.

## 7. Surface pricing

Tiers stay as published (Research free / Reseller $29 / Team $79). Add: Pricing in the primary site header nav, a three-tier pricing section on the homepage linking to `/pricing`, and an upgrade CTA in the app sidebar footer pointing at `/pricing`. No checkout wiring.

## Technical notes

- One migration: `data_sources.marketplace` column, marketplace rows, offer reassignment. No RLS change — catalog stays public-read, alerts and watchlists stay `auth.uid()`-scoped.
- Filter state via `validateSearch` on `/app/search`; filtering happens in `src/lib/catalog.ts` selectors so scoring stays a pure function of the filtered offers.
- Alert evaluation is a client hook over the already-loaded catalog + alerts queries — no new server function.
- Verification: typecheck, lint, format, production build, and a browser pass over search filtering, CSV download, alert hits and the pricing surfaces.
