# Make /app real, then make it worth paying for

## What I checked first

The live database right now holds: **5 products, 7 variants, 13 offers, 63 sold comps, 6 data sources — none of them live**. Across both accounts there are **0 watchlists, 0 saved deal evaluations, 3 searches ever**.

So the reaction is correct, and it is not a design problem. Searching "decore" returns nothing because the catalogue contains five items. Every screen in `/app` is a correctly-built shell wrapped around a catalogue too small to answer a real question. No amount of polish fixes that.

## Would anyone pay for this today?

No. A buyer/reseller pays for one thing: *"should I buy this specific item, right now, at this price?"* Today the app can only answer that question for 5 products it happens to know. A user's first search misses, and they leave. Pricing tiers, watchlists, alerts and billing are all built on top of an answer the product cannot yet give.

The honest read: the plumbing (auth, workspaces, permissions, quotas, billing, provenance) is ahead of the product. The gap is **coverage and a first-run moment that works every time**.

## The pivot that makes it payable

Stop requiring the catalogue to contain the item. Let the user bring the item.

**Paste a listing URL (or an item title) → MarginMap returns the verdict.** Landed cost, sold comps, resale price, profit, ROI, Buy/Watch/Pass — for whatever they paste. This works on day one with zero catalogue, it is the exact moment of need, and it is the thing a reseller will pay $9.99 for.

Browsing a curated catalogue becomes secondary discovery, not the front door.

## Plan

### Phase 1 — Stop the false promise (small, immediate)
- Restore the site title and description to **"MarginMap — Product intelligence for buyers and resellers"** and its original description, everywhere they are defined.
- Replace the dead-end "No canonical products matched" screen with an honest one: what the catalogue currently covers, plus the paste-a-link entry point as the primary action.
- Add a visible "Sample catalogue — 5 products while live sources come online" marker in the workspace, not just on cards.

### Phase 2 — Paste-a-link evaluation (the product)
- New workspace entry: paste an eBay/Amazon listing URL, or type an item + price.
- Server resolves the listing (eBay Browse adapter already exists and is production-ready), extracts price, shipping, condition, seller.
- Computes landed cost (item + shipping + tax + marketplace fees) and pulls sold comps for the matched item.
- Returns median/low/high sold, expected resale, profit, ROI %, and the Buy/Watch/Pass verdict — with the existing provenance, confidence and estimated/missing flags.
- Everything saveable to a watchlist or pipeline, so the existing screens finally have data flowing into them.

### Phase 3 — Turn the lights on
- Enable the eBay source for real (credentials + the scheduled refresh that is already scaffolded but never scheduled).
- Grow the catalogue from 5 products to a few hundred in the categories already claimed (cameras, laptops, consoles, collectibles, guitars), so browsing is not an instant miss.
- Replace "Sample data" labelling with real freshness timestamps once live data lands.

### Phase 4 — Only then, monetise
- Re-point the paywall at the thing people value: free = a handful of evaluations per day; Pro = unlimited evaluations, alerts, export.
- Turn on the Stripe checkout that is already built and tested in sandbox.

## Recommended sequencing

Phase 1 today. Phase 2 is the one that decides whether this is a business — I would do it next and put it in front of five real resellers before touching pricing or design polish. Phase 3 and 4 follow the evidence from those five conversations.

## Technical notes

- Title/description revert: `src/routes/_marketing.index.tsx` head(), via the existing `pageHead` helper. No new metadata plumbing, no og:/twitter: changes beyond mirroring.
- Paste-a-link: a new `createServerFn` in `src/lib/` reusing the existing connector registry, scoring logic and `consume_quota()` charging; no new tables needed beyond reusing `offers` / `deal_evaluations`.
- Live source: `data_sources.is_live` is `false` for all 6 rows; needs the eBay credentials secret plus a scheduler hitting the existing `/api/public/refresh.$source` route with `SOURCE_REFRESH_SECRET`.
- Launch-remediation Phases 4 and 5 (billing source of truth, isolation/quota CI, backups) remain open and are unaffected by this plan.
