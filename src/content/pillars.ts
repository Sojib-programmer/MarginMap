export type PillarSection = {
  heading: string;
  body: string[];
  list?: { term: string; detail: string }[];
};

export type Pillar = {
  slug: string;
  nav: string;
  title: string;
  metaTitle: string;
  description: string;
  kicker: string;
  lede: string;
  stats: { label: string; value: string; note: string }[];
  sections: PillarSection[];
  faq: { q: string; a: string }[];
  related: string[];
};

export const PILLARS: Pillar[] = [
  {
    slug: "canonical-product-identity",
    nav: "Canonical product identity",
    title: "Canonical product identity: one product, not forty listings",
    metaTitle: "Canonical Product Identity — MarginMap",
    description:
      "How MarginMap collapses messy marketplace titles into one canonical variant so price comparisons describe the same physical thing.",
    kicker: "Data foundation",
    lede: "Every price question starts with an identity question. If two listings are not the same product in the same configuration, comparing their prices produces a number that looks precise and means nothing.",
    stats: [
      { label: "Match tiers", value: "4", note: "identifier, model+config, fuzzy, unresolved" },
      {
        label: "Confidence floor",
        value: "0.55",
        note: "below this a listing never joins a comp set",
      },
      { label: "Variant axes", value: "6", note: "model, storage, color, region, kit, generation" },
    ],
    sections: [
      {
        heading: "The problem: titles are marketing copy, not identifiers",
        body: [
          'A single camera body appears on marketplaces as "Sony A7IV Body Only MINT", "a7 iv 33mp full frame ILCE-7M4", and "Sony Alpha 7 IV + 2 batteries + 128GB card". These are three different economic objects — one is a bare body, one is a bundle — but a naive text search treats them as interchangeable and reports a price spread that is actually a bundling difference.',
          "Marketplace category trees do not solve this. They are optimized for browsing, not for equivalence. A category can contain body-only listings, kits, and broken units side by side.",
        ],
      },
      {
        heading: "How resolution works",
        body: [
          "MarginMap resolves each raw listing to a canonical product variant through an ordered cascade. Higher tiers are trusted absolutely; lower tiers carry a confidence penalty that flows into every downstream score.",
        ],
        list: [
          {
            term: "Tier 1 — structured identifier",
            detail:
              "GTIN, UPC, EAN, MPN or platform catalog ID present and valid. Deterministic match, confidence 1.0.",
          },
          {
            term: "Tier 2 — model plus configuration",
            detail:
              "Extracted model code plus resolved variant axes (storage, region, generation). Confidence 0.85–0.95.",
          },
          {
            term: "Tier 3 — fuzzy title match",
            detail:
              "Normalized token overlap against known variant aliases, penalized for unmatched tokens that indicate bundles or accessories. Confidence 0.55–0.85.",
          },
          {
            term: "Tier 4 — unresolved",
            detail:
              "Listing is retained as raw evidence but is excluded from comps, medians and scores. It never silently inflates or deflates a market estimate.",
          },
        ],
      },
      {
        heading: "Bundles are separated, not averaged",
        body: [
          "Extra batteries, memory cards, extended warranties and shipping insurance all move the observed price without changing the product. MarginMap detects accessory tokens and either splits the bundle into a base variant with an itemized add-on set, or drops the listing to Tier 4 when the split cannot be made honestly.",
          "This matters most on the sell side. A reseller who prices against bundle comps consistently overestimates what a bare unit will fetch.",
        ],
      },
      {
        heading: "Why confidence travels with the number",
        body: [
          "Identity confidence is not discarded after matching. It is one of the inputs to the data confidence factor in both the buyer score and the reseller evaluation, and it is displayed in the evidence drawer next to every offer. A median built from Tier 3 matches is labelled as such rather than presented with the same authority as one built from verified identifiers.",
        ],
      },
    ],
    faq: [
      {
        q: "What happens when a listing cannot be matched?",
        a: "It is stored and viewable as raw evidence, flagged unresolved, and excluded from every statistic. MarginMap prefers a smaller honest comp set over a larger contaminated one.",
      },
      {
        q: "Do regional variants get merged?",
        a: "No. Region is a variant axis. A US-market unit and a grey-import unit have different warranty, voltage and resale characteristics, so they are separate canonical variants.",
      },
      {
        q: "Can I see which tier a match used?",
        a: "Yes. Open the evidence drawer on any offer or comp and the match tier, confidence, and raw source record are shown together.",
      },
    ],
    related: ["landed-cost", "evidence-and-data-confidence", "condition-grading"],
  },
  {
    slug: "landed-cost",
    nav: "Landed cost",
    title: "Landed cost: the only price worth comparing",
    metaTitle: "Landed Cost Calculation — MarginMap",
    description:
      "Item price plus shipping plus tax, computed per offer. How MarginMap handles unknown tax, free-shipping thresholds and cross-border charges without guessing.",
    kicker: "Buy-side economics",
    lede: "Sticker price is the least informative number on a listing page. The number that decides whether a purchase is good is landed cost: what leaves your account when the transaction settles.",
    stats: [
      { label: "Components", value: "3", note: "item, shipping, tax" },
      { label: "Never estimated", value: "Tax", note: "unknown tax is labelled, not modelled" },
      {
        label: "Typical spread",
        value: "8–22%",
        note: "gap between cheapest sticker and cheapest landed",
      },
    ],
    sections: [
      {
        heading: "The formula",
        body: [
          "Landed cost = item price + shipping + tax. Each term is sourced independently and each carries its own availability flag. When a term is unavailable, MarginMap shows the partial total and marks it partial — it does not silently substitute an average.",
        ],
        list: [
          {
            term: "Item price",
            detail:
              "The seller's current asking price in the offer currency, excluding promotional strikethroughs that are not actually applied at checkout.",
          },
          {
            term: "Shipping",
            detail:
              "Destination-aware. Free-shipping thresholds are evaluated against the item price rather than assumed.",
          },
          {
            term: "Tax",
            detail:
              "Applied where the source publishes a rate or the destination rule is unambiguous. Otherwise flagged as unknown.",
          },
        ],
      },
      {
        heading: "Why the cheapest sticker is often not the cheapest purchase",
        body: [
          "Ordering by item price reorders once shipping is added and reorders again once tax is applied. On mid-priced electronics the gap between the cheapest sticker and the cheapest landed cost routinely runs 8 to 22 percent, and the winner changes in roughly a third of comparisons.",
          "MarginMap sorts and scores exclusively on landed cost, so the ranking you see is the ranking you would experience at checkout.",
        ],
      },
      {
        heading: "Missing data is labelled, never imputed",
        body: [
          "Imputed tax is the single easiest way to make a tool feel authoritative and be wrong. A guessed rate that is two points off turns a thin margin into a loss and the user never sees the assumption that caused it.",
          "When a tax rate is unavailable, the offer carries a visible unknown-tax flag, the comparison notes that totals are not strictly comparable, and data confidence drops. The decision stays with you, informed.",
        ],
      },
      {
        heading: "Cross-border and returns",
        body: [
          "Import duty, customs handling and currency conversion are treated as first-class cost lines when the corridor is known. Return shipping is not folded into landed cost, because it is conditional — it appears instead as a risk note on the offer, alongside the seller's stated return window.",
        ],
      },
    ],
    faq: [
      {
        q: "Does landed cost include marketplace fees?",
        a: "No. Fees are a sell-side cost and belong to the reseller evaluation, not the purchase price. Mixing them produces double-counting.",
      },
      {
        q: "What currency is used?",
        a: "Your workspace currency, set in Settings. Conversions use the rate captured at retrieval time and the timestamp is shown in the evidence drawer.",
      },
      {
        q: "Why do two offers with the same item price have different landed costs?",
        a: "Different shipping origin, different destination tax treatment, or one qualifies for a free-shipping threshold and the other does not.",
      },
    ],
    related: ["sold-comps-vs-asking-price", "marketplace-fees", "reseller-margin-and-roi"],
  },
  {
    slug: "sold-comps-vs-asking-price",
    nav: "Sold comps vs asking price",
    title: "Sold comps versus asking price: what the market actually paid",
    metaTitle: "Sold Comps vs Asking Price — MarginMap",
    description:
      "Fair market value from completed sales using a recency-weighted median with outlier filtering — never from active listings.",
    kicker: "Market truth",
    lede: "Active listings tell you what sellers hope to receive. Completed sales tell you what buyers agreed to pay. Only one of those is a market price.",
    stats: [
      { label: "Comp window", value: "90d", note: "with exponential recency weighting" },
      { label: "Outlier rule", value: "1.5 IQR", note: "trimmed before the median is computed" },
      { label: "Minimum sample", value: "5", note: "below this the estimate is marked thin" },
    ],
    sections: [
      {
        heading: "Asking price is a biased sample",
        body: [
          "The pool of active listings is survivorship-biased in the wrong direction: reasonably priced units sell and leave the pool, while overpriced units persist and accumulate. Averaging what remains systematically overstates value, and the bias grows with how long you look.",
          "For slow-moving or collectible categories the distortion can exceed 30 percent. Any tool that quotes 'market price' from active listings is quoting the price of items the market has already declined.",
        ],
      },
      {
        heading: "The estimator",
        body: [
          "MarginMap computes fair market value from completed sales only, using a recency-weighted median rather than a mean.",
        ],
        list: [
          {
            term: "Median, not mean",
            detail:
              "A single restoration-grade sale or a mistyped price cannot drag the central estimate.",
          },
          {
            term: "Recency weighting",
            detail:
              "Sales decay exponentially over the window, so a shifting market shows up in weeks, not quarters.",
          },
          {
            term: "IQR trimming",
            detail:
              "Values beyond 1.5 interquartile ranges are excluded and shown separately as flagged outliers.",
          },
          {
            term: "Condition stratification",
            detail:
              "Comps are grouped by condition grade before aggregation; a used-fair sale never sets the price for a sealed unit.",
          },
        ],
      },
      {
        heading: "Sample size is a first-class output",
        body: [
          "A median of four sales and a median of ninety sales are different objects and MarginMap refuses to render them identically. Below the minimum sample threshold the estimate carries a thin-data flag, the confidence interval widens visibly, and the buyer and reseller scores discount the data confidence factor accordingly.",
        ],
      },
      {
        heading: "Liquidity: price is half the answer",
        body: [
          "Two variants can share a median and behave completely differently. Sale velocity — how many completed sales the window contains and how tightly they cluster — determines whether that median is achievable in two weeks or two quarters. Days-to-sell is surfaced next to every median and feeds the reseller liquidity score directly.",
        ],
      },
    ],
    faq: [
      {
        q: "Why 90 days?",
        a: "It is long enough to gather a usable sample in most categories and short enough that a price trend is not averaged away. Recency weighting means recent sales dominate regardless.",
      },
      {
        q: "Are outliers deleted?",
        a: "No. They are excluded from the median and shown separately in the evidence drawer, because an outlier is sometimes the real signal — an authentication event or a variant misidentification.",
      },
      {
        q: "What if there are no completed sales?",
        a: "No median is produced. The variant shows as insufficient market data rather than falling back to asking prices.",
      },
    ],
    related: ["landed-cost", "evidence-and-data-confidence", "reseller-margin-and-roi"],
  },
  {
    slug: "evidence-and-data-confidence",
    nav: "Evidence & confidence",
    title: "Evidence and data confidence: every number opens",
    metaTitle: "Evidence and Data Confidence — MarginMap",
    description:
      "Every score, median and recommendation in MarginMap links to its source records, retrieval timestamps and match confidence.",
    kicker: "Trust model",
    lede: "A recommendation you cannot audit is a recommendation you cannot act on with money. Every figure in MarginMap opens into the records that produced it.",
    stats: [
      {
        label: "Confidence inputs",
        value: "4",
        note: "identity, freshness, sample size, source rank",
      },
      { label: "Freshness tiers", value: "3", note: "fresh, aging, stale" },
      { label: "Unsourced claims", value: "0", note: "by construction" },
    ],
    sections: [
      {
        heading: "The evidence drawer",
        body: [
          "Any score, median or AI-written sentence opens a drawer containing the offers and completed sales behind it: source name, retrieval timestamp, match tier and confidence, condition grade, and the raw record as captured.",
          "Nothing is summarized away. If the underlying sample is three sales from one source, the drawer makes that obvious in about a second.",
        ],
      },
      {
        heading: "How data confidence is computed",
        body: [
          "Data confidence is a single composite between 0 and 1, displayed on every variant and folded into both role scores.",
        ],
        list: [
          {
            term: "Identity confidence",
            detail: "The match tier of the underlying records. Tier 1 identifiers score highest.",
          },
          {
            term: "Freshness",
            detail:
              "Time since retrieval, decayed continuously and bucketed into fresh, aging and stale for display.",
          },
          {
            term: "Sample depth",
            detail:
              "Number of usable comps after outlier trimming, relative to the category's typical density.",
          },
          {
            term: "Source rank",
            detail:
              "Whether the record came from a registered source with stable schema and stated refresh policy.",
          },
        ],
      },
      {
        heading: "Rules the system will not break",
        body: [
          "Missing data is labelled missing. Estimated values are labelled estimated and never rendered in the same typographic weight as observed values. Stale records are visibly stale rather than quietly reused. An AI-written summary that cannot cite a record does not get written.",
        ],
      },
      {
        heading: "The analyst is constrained, not creative",
        body: [
          "The research assistant receives only the retrieved evidence rows for the variant in question and is required to attach the record it used to each numeric claim. Its output is persisted alongside the evidence set, so a report you read next month can still be checked against the data that produced it.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I export the evidence?",
        a: "The evidence set behind every saved research report is persisted with the report, so the record set is reproducible after the fact.",
      },
      {
        q: "What makes a record stale?",
        a: "Freshness thresholds are category-aware. Fast-moving electronics age out much faster than collectibles, where a month-old comp is still informative.",
      },
      {
        q: "Does the AI ever invent a price?",
        a: "It has no mechanism to. The prompt supplies only retrieved rows and the report format requires a record reference for each figure.",
      },
    ],
    related: ["canonical-product-identity", "sold-comps-vs-asking-price", "methodology"],
  },
  {
    slug: "reseller-margin-and-roi",
    nav: "Margin & ROI",
    title: "Reseller margin and ROI: net proceeds, not gross spread",
    metaTitle: "Reseller Margin and ROI — MarginMap",
    description:
      "Expected profit, ROI, breakeven and liquidity computed from landed cost, sold comps, marketplace fees and holding time.",
    kicker: "Sell-side economics",
    lede: "Buy low, sell high is a slogan, not a model. The number that matters is what remains after fees, shipping, prep and the time your capital was tied up.",
    stats: [
      { label: "Cost lines", value: "6", note: "purchase, inbound, tax, prep, fees, outbound" },
      { label: "ROI basis", value: "Cash in", note: "profit over total capital deployed" },
      { label: "Time factor", value: "Days to sell", note: "from comp velocity, not optimism" },
    ],
    sections: [
      {
        heading: "The evaluation model",
        body: [
          "Expected net proceeds equals the recency-weighted median sale price for the matched condition grade, minus marketplace commission, payment processing, outbound shipping and any promoted-listing spend. Expected profit is net proceeds minus total landed acquisition cost and prep.",
          "ROI is profit divided by total cash deployed, not by the purchase price alone. Financing an item that also required forty dollars of shipping and cleaning consumed forty dollars of capital.",
        ],
      },
      {
        heading: "Breakeven is a decision tool",
        body: [
          "Every evaluation reports the maximum purchase price at which the deal still clears your target margin. That single number converts a research session into a negotiating position: you know your walk-away figure before you make an offer.",
        ],
      },
      {
        heading: "Annualized return exposes slow inventory",
        body: [
          "A 25 percent return in three weeks and a 25 percent return in nine months are not comparable investments. MarginMap annualizes using observed days-to-sell for the variant, which reliably demotes high-margin, low-velocity items that look attractive on a spreadsheet and quietly consume shelf space and working capital.",
        ],
      },
      {
        heading: "Risk lines that change decisions",
        body: [
          "Thin comp samples widen the outcome range. Authentication-sensitive categories carry a return and dispute premium. Condition uncertainty at acquisition propagates into the sale-side grade and therefore the achievable price. Each of these appears as an explicit line in the evaluation rather than as a haircut buried in a coefficient.",
        ],
      },
    ],
    faq: [
      {
        q: "Are fee schedules editable?",
        a: "Yes. The evaluator ships with per-marketplace defaults and every rate is overridable for your own negotiated or store-subscription rates.",
      },
      {
        q: "Does it account for unsold inventory?",
        a: "Liquidity scoring and days-to-sell surface the risk. A sell-through probability is shown when the comp sample supports one.",
      },
      {
        q: "Can I save an evaluation?",
        a: "Evaluations save to your workspace and can be pushed into the sourcing pipeline as a tracked item.",
      },
    ],
    related: ["marketplace-fees", "sourcing-workflow", "landed-cost"],
  },
  {
    slug: "marketplace-fees",
    nav: "Marketplace fees",
    title: "Marketplace fees: the cost line most sellers underestimate",
    metaTitle: "Marketplace Fee Modeling — MarginMap",
    description:
      "Category commissions, payment processing, promoted listings and shipping subsidies modelled per marketplace and per category.",
    kicker: "Sell-side economics",
    lede: "Sellers quote themselves a single headline percentage. Actual fee load is a stack of category commission, processing, per-order fixed charges and optional promotion — routinely half again the number people carry in their heads.",
    stats: [
      {
        label: "Fee layers",
        value: "5",
        note: "commission, processing, fixed, promotion, shipping",
      },
      { label: "Typical stack", value: "13–19%", note: "of gross sale on consumer electronics" },
      { label: "Headline error", value: "+3–6pt", note: "gap between quoted and effective rate" },
    ],
    sections: [
      {
        heading: "What the stack contains",
        body: [
          "MarginMap models each layer independently so you can see which one is eating the deal.",
        ],
        list: [
          {
            term: "Category commission",
            detail: "Varies by marketplace and category, sometimes tiered by sale price.",
          },
          {
            term: "Payment processing",
            detail:
              "A percentage plus a fixed per-order charge, which dominates on low-value items.",
          },
          {
            term: "Fixed order fees",
            detail: "Flat insertion or transaction charges applied regardless of price.",
          },
          {
            term: "Promoted listings",
            detail:
              "Optional ad rate applied to the final sale price; often the difference between selling this month and next.",
          },
          {
            term: "Shipping subsidy",
            detail: "Free-shipping offers are a seller cost. Modelled as a line, not ignored.",
          },
        ],
      },
      {
        heading: "Why fixed fees decide low-value flips",
        body: [
          "A flat 30-cent-plus-percentage processing charge is a rounding error on a 900 dollar sale and a material tax on a 25 dollar one. The evaluator shows effective total fee percentage per deal, which is what makes small-item arbitrage visibly unattractive well before you have bought forty of them.",
        ],
      },
      {
        heading: "Store subscriptions and negotiated rates",
        body: [
          "Volume sellers rarely pay list rates. Every default in the fee schedule is overridable, and overrides persist per marketplace in your workspace so the pipeline and evaluator both reflect your actual economics rather than the public rate card.",
        ],
      },
    ],
    faq: [
      {
        q: "Are fee schedules kept current?",
        a: "Defaults are versioned with an effective date shown in the evaluator. Because rates change without much notice, overrides always win over defaults.",
      },
      {
        q: "Is sales tax on the sale side included?",
        a: "Marketplace-collected tax is not seller revenue and is excluded from net proceeds entirely.",
      },
      {
        q: "Does it model refunds?",
        a: "Return rate appears as a risk adjustment in the evaluation for categories where the comp data supports an estimate.",
      },
    ],
    related: ["reseller-margin-and-roi", "landed-cost", "sourcing-workflow"],
  },
  {
    slug: "condition-grading",
    nav: "Condition grading",
    title: "Condition grading: normalizing the least standard field",
    metaTitle: "Condition Grading Normalization — MarginMap",
    description:
      "Mapping inconsistent seller condition language onto a single grade ladder so comps and offers describe comparable goods.",
    kicker: "Data foundation",
    lede: "Condition is the field with the highest price impact and the lowest standardization. 'Excellent' is a claim, not a measurement, and it means different things on every platform.",
    stats: [
      {
        label: "Grade ladder",
        value: "6",
        note: "sealed, open box, excellent, good, fair, for parts",
      },
      {
        label: "Price impact",
        value: "up to 45%",
        note: "spread between sealed and fair on the same variant",
      },
      { label: "Comp rule", value: "Stratified", note: "grades never pooled into one median" },
    ],
    sections: [
      {
        heading: "One ladder, mapped from many vocabularies",
        body: [
          "Every source's condition vocabulary is mapped onto a single six-step ladder: new sealed, open box, used excellent, used good, used fair, and for parts. Mappings are explicit and inspectable, not inferred per listing at read time.",
          "Where a source's grade is genuinely ambiguous — the common 'pre-owned' catch-all — the listing is assigned the conservative grade and flagged, rather than being optimistically promoted.",
        ],
      },
      {
        heading: "Description text is a downgrade signal only",
        body: [
          "Seller descriptions can move a grade down but never up. Disclosed screen scratches, missing accessories, battery health below threshold and repair history all pull the assigned grade toward the conservative end. A glowing adjective in the title changes nothing.",
        ],
      },
      {
        heading: "Grades are never pooled",
        body: [
          "Medians are computed within grade. Pooling a sealed unit with a used-fair unit produces a central estimate that describes no purchasable item and flatters low-grade inventory while penalizing high-grade inventory.",
          "When a grade has too few comps for its own median, MarginMap says so rather than borrowing the adjacent grade's number.",
        ],
      },
      {
        heading: "Grade uncertainty is a reseller risk line",
        body: [
          "Buying at a claimed grade you cannot verify before purchase is a real, quantifiable risk. The evaluator carries grade uncertainty into the sale-side price assumption, so a deal that only works if the item arrives one grade better than described is visibly marked as such.",
        ],
      },
    ],
    faq: [
      {
        q: "Where do photos fit?",
        a: "Photo count and resolution feed listing-quality signals that affect trust scoring. They do not automatically set a grade.",
      },
      {
        q: "How are refurbished units handled?",
        a: "Manufacturer-refurbished is treated as its own tier adjacent to open box, because its price behaviour and warranty profile differ from both new and used.",
      },
      {
        q: "Can I override a grade?",
        a: "Yes, on a deal evaluation. The override is recorded with the evaluation so the assumption is visible later.",
      },
    ],
    related: [
      "canonical-product-identity",
      "sold-comps-vs-asking-price",
      "evidence-and-data-confidence",
    ],
  },
  {
    slug: "sourcing-workflow",
    nav: "Sourcing workflow",
    title: "Sourcing workflow: from search to sold, tracked",
    metaTitle: "Reseller Sourcing Workflow — MarginMap",
    description:
      "The seven-stage pipeline from watchlist to sold, with alerts, saved evaluations and post-sale accuracy feedback.",
    kicker: "Operations",
    lede: "Research that ends in a browser tab is not a workflow. MarginMap tracks a candidate from first sighting through acquisition, listing and sale, and then compares your realized price to the estimate.",
    stats: [
      { label: "Pipeline stages", value: "7", note: "watch through sold or passed" },
      {
        label: "Alert triggers",
        value: "Landed cost",
        note: "thresholds evaluated on total, not sticker",
      },
      {
        label: "Feedback loop",
        value: "Realized vs est.",
        note: "every closed item scores the model",
      },
    ],
    sections: [
      {
        heading: "The seven stages",
        body: [
          "Items move through a fixed ladder so the state of your capital is legible at a glance: watch, researching, source now, acquired, listed, sold, passed. Passed is a first-class terminal state — recording why you declined a deal is how you stop re-evaluating it every month.",
        ],
      },
      {
        heading: "Alerts fire on landed cost",
        body: [
          "A threshold on sticker price is a threshold on the wrong number. MarginMap evaluates alert conditions against landed cost, so a listing that only clears your target because it ships free from a nearby warehouse triggers, and one that clears on sticker but not after tax does not waste your attention.",
        ],
      },
      {
        heading: "Watchlists as working sets",
        body: [
          "Watchlists hold variants, not listings, so an item stays tracked after the specific offer that prompted it disappears. Each entry can carry a target landed cost, which doubles as the alert threshold and the walk-away price in the evaluator.",
        ],
      },
      {
        heading: "Closing the loop",
        body: [
          "When an item is marked sold with a realized price, MarginMap compares that outcome to the estimate that justified the purchase. Over a few dozen deals this produces something more valuable than any single estimate: a measured read on where the model is biased for the categories you actually trade.",
        ],
      },
    ],
    faq: [
      {
        q: "Is the pipeline shared across a team?",
        a: "Workspace data is private to your account today. Multi-seat sharing is not enabled.",
      },
      {
        q: "Can I add an item bought outside MarginMap?",
        a: "Yes. Create the pipeline item directly and attach a variant so comps and sale-side estimates still apply.",
      },
      {
        q: "What happens to a passed item?",
        a: "It stays in the pipeline as a record with your reason, and its variant remains available for future alerts.",
      },
    ],
    related: ["reseller-margin-and-roi", "marketplace-fees", "landed-cost"],
  },
];

export const PILLAR_BY_SLUG = Object.fromEntries(PILLARS.map((p) => [p.slug, p])) as Record<
  string,
  Pillar
>;
