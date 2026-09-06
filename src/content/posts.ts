export type PostSection = {
  heading: string;
  body: string[];
  table?: { headers: string[]; rows: string[][] };
};

export type Post = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  excerpt: string;
  category: string;
  date: string; // ISO, used for datePublished
  readMinutes: number;
  sections: PostSection[];
  faq: { q: string; a: string }[];
  relatedPillars: string[];
};

export const POSTS: Post[] = [
  {
    slug: "ebay-fee-calculator-2026",
    title: "eBay fee calculator: what sellers actually pay in 2026",
    metaTitle: "eBay Fee Calculator 2026: Real Seller Fees Explained — MarginMap",
    description:
      "Final value fees, per-order charges, promoted listings, and store subscriptions: the real math of selling on eBay in 2026, with a worked example and a free calculator.",
    excerpt:
      "eBay's fee schedule is three separate charges stacked on the same sale. Most sellers quote the headline percentage and lose the rest to rounding. Here is the full stack.",
    category: "Marketplace fees",
    date: "2026-09-06",
    readMinutes: 8,
    sections: [
      {
        heading: "The three charges hiding inside '13%'",
        body: [
          "Ask a room of eBay sellers what the platform costs and most will say 'about 13%'. That number is the final value fee in popular categories, and it is real — but it is also only one of three charges that hit the same order. The final value fee is calculated on the total amount the buyer pays, including shipping and sales tax, which already surprises people. On top of it sits a fixed per-order charge of $0.30. And if you pay for visibility, promoted listings add a percentage of the sale price on top of everything else.",
          "The practical consequence: two sellers with the same item at the same price can net different amounts because one offers free shipping baked into the price (raising the fee base differently than a separate shipping charge) and the other does not. Fee math is not a single percentage; it is a formula.",
        ],
      },
      {
        heading: "The formula, in one line",
        body: [
          "Net payout = (item price + shipping charged to buyer) − final value fee − $0.30 per-order fee − promoted listing fee − payment-related adjustments − your actual shipping cost − your item cost.",
          "Final value fee = (item price + shipping charged + sales tax collected) × category rate. The category rate matters more than the headline: sneakers over $150 pay a different rate than consumer electronics, and trading cards differ from both.",
        ],
        table: {
          headers: ["Line item", "Example amount"],
          rows: [
            ["Item price", "$120.00"],
            ["Shipping charged to buyer", "$0.00 (free shipping)"],
            ["Final value fee (13.25% on $127.14 incl. tax)", "−$16.85"],
            ["Per-order fee", "−$0.30"],
            ["Promoted listings (4% ad rate)", "−$4.80"],
            ["Actual postage paid", "−$8.40"],
            ["Item cost (what you paid to source it)", "−$62.00"],
            ["Net profit", "$27.65"],
          ],
        },
      },
      {
        heading: "Where sellers get the math wrong",
        body: [
          "First, the fee base includes sales tax. eBay collects tax from the buyer, includes it in the amount the final value fee is computed on, then remits the tax itself. You never keep the tax, but you do pay a fee on it. On a $120 item in a 6% tax state, that is roughly $0.95 of pure fee on money that was never yours.",
          "Second, promoted listings compound. A 4% ad rate on a $120 sale is $4.80 — more than the per-order fee by sixteen times. Sellers toggle it on for visibility and then quote their 'fees' as 13% when the real figure is 17.3%.",
          "Third, free shipping is not free. Moving $8 of shipping into the item price raises the fee base by $8, costing another ~$1.06 in final value fee — while the $8 postage still comes out of your pocket. It can still be the right call for conversion, but it is a pricing decision, not a fee dodge.",
        ],
      },
      {
        heading: "Store subscriptions change the breakeven",
        body: [
          "A Basic store subscription trades a monthly fee for a slightly lower final value fee rate in many categories and a quota of free fixed-price listings. The crossover is a volume question: divide the monthly subscription by the per-sale savings. If the store saves you $0.50 per sale and costs $27.95, you need roughly 56 sales a month before the subscription pays for itself.",
          "Below that volume the subscription is a loss; above it, staying on the free tier is leaving money on the table. This is a calculation worth redoing every quarter as your volume moves.",
        ],
      },
      {
        heading: "Do the math before you buy, not after you sell",
        body: [
          "The sellers who consistently make money treat fees as an input to the buy decision, not a surprise at payout time. MarginMap's fee calculator takes the sale price, category, shipping arrangement, and ad rate, and returns the net payout and breakeven purchase price — the maximum you can pay to source the item and still hit your target margin. Run the number first; the listing you do not buy is often the best trade you make.",
        ],
      },
    ],
    faq: [
      {
        q: "What percentage does eBay take in 2026?",
        a: "The final value fee in most categories is around 13–13.6% of the total sale amount including shipping and tax, plus a $0.30 per-order fee. Some categories are lower (e.g. certain sneakers above $150) and some are higher. Promoted listings add a separate percentage if you use them.",
      },
      {
        q: "Does eBay charge fees on sales tax?",
        a: "Yes. eBay computes the final value fee on the total amount the buyer pays, which includes the sales tax eBay collects and remits. You never keep the tax, but you pay the percentage on it.",
      },
      {
        q: "Is free shipping cheaper for sellers?",
        a: "Not on fees — folding shipping into the item price slightly raises the fee base. It can still improve conversion and search placement, but treat it as a pricing strategy, not a way to reduce fees.",
      },
      {
        q: "When is an eBay store subscription worth it?",
        a: "Divide the monthly subscription cost by the per-sale savings it gives you. That number is your breakeven sales volume per month. Below it, the store costs you money; above it, it saves money.",
      },
      {
        q: "How do I calculate my breakeven buy price?",
        a: "Work backwards: sale price minus final value fee, per-order fee, ad fee, and real shipping cost gives your net payout. Subtract your target profit and what remains is the maximum you can pay to source the item. MarginMap's fee calculator does this in one step.",
      },
    ],
    relatedPillars: ["marketplace-fees", "landed-cost", "reseller-margin-and-roi"],
  },
  {
    slug: "sold-comps-vs-asking-price",
    title: "Sold comps vs asking price: how to read the market",
    metaTitle: "Sold Comps vs Asking Price: Reading Real Market Value — MarginMap",
    description:
      "Asking prices are opinions; sold comps are evidence. How to build a comp set, compute a defensible median, and know when the asking-price spread is a trap.",
    excerpt:
      "An item 'listed for $400' tells you what one hopeful seller wants. The same item's last thirty completed sales tell you what buyers actually paid. Only one of those numbers should drive your buy decision.",
    category: "Valuation",
    date: "2026-09-06",
    readMinutes: 7,
    sections: [
      {
        heading: "Why asking prices lie politely",
        body: [
          "Search any marketplace for a popular item and sort by price. The top of the list is not the market — it is the optimistic fringe: sellers testing whether an uninformed buyer exists. Those listings sit unsold, which is exactly why you see them. The listings that were priced correctly disappeared into completed sales.",
          "This creates a survivorship distortion in everything you can see. Active inventory is, by definition, the stuff that has not cleared at its current price. Using it to estimate what an item is worth is like pricing a house from the listings that have been on the market for nine months.",
        ],
      },
      {
        heading: "Completed sales are the only honest sample",
        body: [
          "A sold comp is a transaction: a real buyer paid a real amount at a real point in time. A set of sold comps is a sample of the actual demand curve. The median of that sample is the single most defensible estimate of what the next unit will sell for — robust to the one desperate low sale and the one collector who overpaid.",
          "The median only works if the comp set is clean. Three things pollute it: different variants (a 256GB phone comped against your 128GB unit), bundles (a console with five games comped against your loose console), and condition drift (a mint graded unit comped against your tested-working unit). Each silently moves the median in a direction that benefits whoever is selling to you.",
        ],
      },
      {
        heading: "The range matters as much as the median",
        body: [
          "A median of $300 with a tight sold range of $285–$315 is a very different market from a median of $300 with a range of $210–$420. The first is a liquid, well-understood item you can price confidently. The second is a thin or condition-sensitive market where your realized price depends on patience, listing quality, and luck — and where your profit estimate should be discounted accordingly.",
          "MarginMap surfaces both numbers for exactly this reason: the expected resale price is the median of the matched comp set, and the low/high range tells you how much to trust it. A wide range is not noise; it is the market telling you the item is not fungible.",
        ],
      },
      {
        heading: "When the ask-to-sold spread is a signal, not a trap",
        body: [
          "If active asks cluster 25% above the sold median, one of two things is true. Either sellers are delusional and the item will sit — or the market is rising and sold comps are lagging because completed-sale data is inherently backward-looking. You can only distinguish these with time series: is the sold median itself trending up over the last 30, 60, 90 days?",
          "A rising median with asks leading it is an opportunity: buy at today's evidence, sell into tomorrow's price. A flat median with elevated asks is gravity: the asks will come down, and anyone who bought against them is already underwater. This is why MarginMap labels every value with its source and timestamp — a median from stale comps is a different number than one from last week's.",
        ],
      },
    ],
    faq: [
      {
        q: "What are sold comps?",
        a: "Sold comps are completed-sale records for the same product: actual transactions where a buyer paid a specific price. They are the primary evidence for what an item is worth, unlike asking prices which are unfulfilled seller intentions.",
      },
      {
        q: "How many sold comps do I need for a reliable median?",
        a: "More is better, but quality beats quantity. A dozen clean, same-variant, same-condition comps beats fifty polluted ones. Below roughly five clean comps, treat any median as low-confidence and widen your margin of safety.",
      },
      {
        q: "Why is my item worth less than the listings I see?",
        a: "Because active listings are the ones that have not sold. Correctly priced items disappear quickly into completed sales, leaving overpriced inventory visible. Check the completed/sold history instead of the asking prices.",
      },
      {
        q: "How fresh do comps need to be?",
        a: "It depends on the item's price velocity. For fast-moving electronics, comps older than 30–45 days can be materially stale. For stable collectibles, 90-day windows are reasonable. Always check the timestamp on the comp set, and discount estimates built on old data.",
      },
    ],
    relatedPillars: ["sold-comps-vs-asking-price", "evidence-and-data-confidence", "canonical-product-identity"],
  },
  {
    slug: "ebay-vs-amazon-selling-fees",
    title: "eBay vs Amazon selling fees compared",
    metaTitle: "eBay vs Amazon Selling Fees Compared (2026) — MarginMap",
    description:
      "A side-by-side breakdown of eBay and Amazon seller fees: referral vs final value fees, subscriptions, fulfillment costs, and which platform nets more on the same item.",
    excerpt:
      "Both platforms take roughly an eighth to a sixth of your sale, but they take it in completely different places. The cheaper platform depends on your category, price point, and who ships the box.",
    category: "Marketplace fees",
    date: "2026-09-06",
    readMinutes: 9,
    sections: [
      {
        heading: "Two different philosophies of taking your money",
        body: [
          "eBay charges a final value fee — a percentage of the total the buyer pays, including shipping and tax — plus a small per-order fee. Amazon charges a referral fee — a percentage of the item price, usually excluding shipping for self-fulfilled orders — plus either a per-item fee on the free Individual plan or a flat monthly subscription on Professional.",
          "The structural difference: eBay's fee follows the money (everything the buyer paid), while Amazon's follows the item. High shipping costs are penalized on eBay and mostly ignored by Amazon's referral fee — but Amazon makes that back elsewhere.",
        ],
      },
      {
        heading: "Headline rates by category",
        body: [
          "Referral and final value fee rates both vary by category, and they do not vary together. Consumer electronics sit near 8% on Amazon but around 13% on eBay. Media categories invert some of that relationship. Quoting a single platform-wide number for either is a category error — literally.",
        ],
        table: {
          headers: ["Category", "eBay final value fee", "Amazon referral fee"],
          rows: [
            ["Consumer electronics", "~13.25%", "8%"],
            ["Video game consoles", "~13.25%", "8%"],
            ["Clothing & shoes", "~13.25% (8% over $150)", "17%"],
            ["Books & media", "~14.95%", "15% + $1.80 closing fee"],
            ["Trading cards", "~13.25%", "8.5%–15% tiered"],
          ],
        },
      },
      {
        heading: "The fulfillment fork: FBA changes everything",
        body: [
          "Amazon's Fulfillment by Amazon folds picking, packing, shipping, and customer service into a per-unit fulfillment fee based on size and weight. For a small, light, fast-selling item, FBA can be cheaper than self-shipping once you count your own postage and time. For a large, heavy, or slow item, FBA fees plus storage fees can exceed the referral fee itself.",
          "eBay has no equivalent default — you ship, or you use a third-party logistics provider. That keeps eBay's visible fees lower but pushes real logistics cost back onto you. Comparing platforms honestly means comparing total cost of the sale, not the fee schedule: referral/final value fees, per-order charges, subscriptions, fulfillment, and the value of your own packing time.",
        ],
      },
      {
        heading: "A worked comparison on the same $120 item",
        body: [
          "Take a consumer-electronics item selling for $120 with $8 real shipping cost. On eBay self-fulfilled: roughly $16.85 final value fee + $0.30 order fee + $8 postage = $25.15 in platform-and-shipping cost. On Amazon self-fulfilled (Professional plan): roughly $9.60 referral fee + $8 postage = $17.60, plus your share of the $39.99 monthly subscription. On Amazon FBA: referral fee plus a fulfillment fee that for a small standard item might run $4–6, competitive with self-shipping once your time is priced.",
          "None of these is universally cheapest. The answer moves with category, price, weight, sales velocity, and your monthly volume. This is why MarginMap computes landed cost and net payout per offer instead of declaring one platform 'cheaper' — the fee calculator runs both schedules side by side on your actual numbers.",
        ],
      },
    ],
    faq: [
      {
        q: "Is eBay or Amazon cheaper for sellers?",
        a: "It depends on category and fulfillment. Electronics referral fees on Amazon (~8%) are lower than eBay's final value fee (~13%), but clothing is the reverse (~17% on Amazon vs ~13% on eBay). Amazon adds subscription or per-item fees and FBA fulfillment costs; eBay adds per-order fees and optional ad rates. Compare total cost per sale, not headline percentages.",
      },
      {
        q: "What is Amazon's referral fee?",
        a: "A percentage of the item price that varies by category, commonly 8–17%. Media categories add a closing fee. It is Amazon's analogue of eBay's final value fee, but it is computed on the item price rather than the total buyer payment.",
      },
      {
        q: "Do I need a Professional seller account on Amazon?",
        a: "The Individual plan has no monthly fee but charges $0.99 per item sold. At roughly 40 sales a month the $39.99 Professional subscription breaks even, and it unlocks categories, buy-box eligibility features, and advertising tools that Individuals lack.",
      },
      {
        q: "Does FBA make Amazon more expensive than eBay?",
        a: "Not necessarily. FBA's fulfillment fee replaces your own postage, packing materials, and labor. For small, fast-moving items it can be net-cheaper than eBay self-fulfillment. For large or slow items, storage and fulfillment fees make it the expensive option.",
      },
    ],
    relatedPillars: ["marketplace-fees", "landed-cost", "sourcing-workflow"],
  },
  {
    slug: "what-to-resell-for-profit",
    title: "What to resell for profit: a data-first framework",
    metaTitle: "What to Resell for Profit: A Data-First Framework — MarginMap",
    description:
      "Stop guessing what flips. A four-filter framework — demand velocity, margin after fees, comp depth, and identity confidence — for choosing what to resell, with category examples.",
    excerpt:
      "'What sells?' is the wrong question. The right question is: what sells quickly, with deep sold-comp data, at a margin that survives fees, in a product I can identify without guessing?",
    category: "Reselling strategy",
    date: "2026-09-06",
    readMinutes: 8,
    sections: [
      {
        heading: "The four filters, in order",
        body: [
          "Every profitable reselling item passes four tests, and the order matters because each filter is cheaper to apply than the next. Filter one: demand velocity — does this item sell often? A 40% margin on an item that sells twice a year is warehouse decoration. Filter two: margin after full landed cost — item cost, shipping in, marketplace fees, tax, shipping out. Filter three: comp depth — are there enough clean completed sales to trust the median? Filter four: identity confidence — can you be sure the unit in front of you is the variant the comps describe?",
          "Most losing flips fail filter two (the margin was never real) or filter four (the unit was a different variant than the seller believed). Both are detectable before money moves.",
        ],
      },
      {
        heading: "Velocity before margin",
        body: [
          "A useful mental model: annualized return is margin multiplied by turns. A 20% margin that cycles your capital every two weeks beats a 60% margin that takes four months to sell. Sold-comp timestamps give you velocity directly — if the last ten comps span three days, the item is liquid; if they span four months, it is a waiting game.",
          "This is why MarginMap timestamps every comp and shows the date range of the sample. The freshness of the comps is also the speed of the market.",
        ],
      },
      {
        heading: "Margin must survive the full cost stack",
        body: [
          "The classic beginner error: buy at $60, see sold comps at $100, declare a $40 profit. The real math: $100 sale minus ~13% marketplace fees ($13), $0.30 order fee, $9 shipping, $60 cost — roughly $17.70, or about 29% on capital, before your time. That may still be a fine trade. But a $100 comp on an item that costs $80 to source leaves about $5 — and one return, one lost package, or one slightly-lower sale erases it.",
          "Set a floor. Many full-time resellers refuse anything below 30% ROI on cost or $15 absolute profit, whichever is higher, because errors, returns, and price drops tax the thin trades first.",
        ],
      },
      {
        heading: "Categories where the data works",
        body: [
          "The best reselling categories share a trait: strong product identity. Consumer electronics with model numbers, camera bodies and lenses, game consoles, branded power tools, and graded trading cards all have deep sold-comp histories and unambiguous variants. You can comp a 'Sony WH-1000XM5' with confidence; you cannot comp 'vintage jacket' with any.",
          "Fashion, furniture, and unbranded goods fail filter four — identity confidence — which corrupts filter three, because your comp set is apples-to-oranges. Beginners are often drawn to these categories by high apparent margins; the margins are apparent precisely because the comps cannot be trusted.",
        ],
        table: {
          headers: ["Category", "Velocity", "Comp depth", "Identity confidence", "Typical net margin"],
          rows: [
            ["Smartphones & tablets", "Very high", "Deep", "High (model + storage)", "15–30%"],
            ["Camera bodies & lenses", "High", "Deep", "High (model codes)", "20–40%"],
            ["Game consoles", "High", "Deep", "Medium–high (revisions matter)", "20–35%"],
            ["Power tools (branded)", "Medium", "Good", "High (MPN)", "25–45%"],
            ["Sneakers & streetwear", "High", "Deep for hyped SKUs", "Medium (authentication risk)", "15–40%"],
            ["Vintage clothing", "Low–medium", "Thin", "Low", "High when it works — unverifiable"],
          ],
        },
      },
      {
        heading: "Make it a process, not a hunch",
        body: [
          "The practical loop: search a product in plain language, read the parsed intent to confirm MarginMap understood the variant, check the offer table's landed cost against the comp median and range, and let the Buy/Watch/Pass verdict do the first pass of filtering. Save the searches that keep surfacing good trades into a watchlist with a target price, and let alerts bring the next buy to you instead of re-hunting daily.",
          "None of this requires instinct. It requires refusing to skip a filter.",
        ],
      },
    ],
    faq: [
      {
        q: "What are the best things to resell for profit?",
        a: "Categories with strong product identity and deep sold-comp data: smartphones, cameras, game consoles, branded power tools, and graded cards. They are verifiable, liquid, and comp-able. High apparent margins in vague categories (vintage clothing, unbranded goods) usually reflect unverifiable comps, not real opportunity.",
      },
      {
        q: "How much profit should I aim for per flip?",
        a: "A common floor is 30% ROI on cost or $15 absolute profit, whichever is higher. Thin trades are the first to be erased by returns, shipping problems, or small price drops.",
      },
      {
        q: "Is high margin or fast turnover better?",
        a: "Annualized return is margin times turns. A 20% margin cycling every two weeks usually beats a 60% margin that takes four months. Check sold-comp timestamps to measure how fast an item actually moves.",
      },
      {
        q: "How do I check if an item will actually sell at the comp price?",
        a: "Look at the recency and depth of completed sales: many recent comps at a tight price range means a liquid market. Few, old, or scattered comps mean the median is a guess and you should demand a wider margin of safety.",
      },
    ],
    relatedPillars: ["reseller-margin-and-roi", "sold-comps-vs-asking-price", "canonical-product-identity"],
  },
  {
    slug: "how-to-calculate-reselling-profit",
    title: "How to calculate reselling profit (the landed cost formula)",
    metaTitle: "How to Calculate Reselling Profit: Landed Cost Formula — MarginMap",
    description:
      "The exact reselling profit formula: landed cost in, net payout out. Worked examples for eBay, Amazon, and Shopify sales, plus the ROI math that decides Buy vs Pass.",
    excerpt:
      "Profit is not sale price minus buy price. It is net payout minus landed cost — and both of those numbers have more line items than most sellers count.",
    category: "Reselling strategy",
    date: "2026-09-06",
    readMinutes: 7,
    sections: [
      {
        heading: "Two numbers, no shortcuts",
        body: [
          "Every reselling profit calculation reduces to two quantities. Landed cost is everything you spend to get the item into a sellable state in your hands: purchase price, inbound shipping, tax you paid, any refurbishment or parts, and marketplace fees on the buy side if you sourced from a platform. Net payout is everything that actually reaches your account when it sells: sale price minus platform fees, payment processing, outbound shipping, and packaging.",
          "Profit = net payout − landed cost. Every error in reselling math is a line item someone dropped from one of those two numbers.",
        ],
      },
      {
        heading: "The landed cost stack, itemized",
        body: [
          "A typical buy-side stack: item price $60, seller's shipping charge $8, sales tax on your purchase $4.76, platform buyer-side fees $0 (most platforms) — landed cost $72.76. If you sourced locally, inbound shipping disappears but your travel time does not. If the item needs a $6 replacement part to grade as 'working', that belongs in landed cost too.",
          "MarginMap computes this per offer row automatically — the comparison table's landed cost column is the sum of item, shipping, tax, and fees, so two offers at different sticker prices can be compared on the number that actually matters.",
        ],
      },
      {
        heading: "The net payout stack, itemized",
        body: [
          "A typical sell-side stack on a $100 sale: final value fee ~13.25% on the total including tax and shipping (call it −$14.10), per-order fee −$0.30, promoted listings at 4% −$4.00, actual postage −$8.40, mailer and label −$0.60. Net payout: $72.60 on a $100 sale — before your cost of the item.",
          "Run the full stack both directions and the trade resolves itself: net payout $72.60 minus landed cost $72.76 is a loss of $0.16 on an item that 'everyone knows' sells for $100 and costs $60. The gap between folk math and formula math is where reselling businesses die.",
        ],
        table: {
          headers: ["Step", "Buy side (landed cost)", "Sell side (net payout)"],
          rows: [
            ["Start", "Item price $60.00", "Sale price $100.00"],
            ["Shipping", "+ $8.00 in", "− $8.40 out"],
            ["Tax", "+ $4.76", "(fee base includes it)"],
            ["Platform fees", "+ $0.00", "− $18.40 (FVF + order + ads)"],
            ["Packaging / parts", "+ $0.00", "− $0.60"],
            ["Result", "Landed cost $72.76", "Net payout $72.60"],
          ],
        },
      },
      {
        heading: "ROI is the decision number",
        body: [
          "Profit in dollars tells you what a trade is worth; ROI tells you whether it is worth your capital. ROI on cost = profit ÷ landed cost. A $30 profit on $50 landed cost is 60% — excellent. The same $30 on $400 landed cost is 7.5% — worse than an index fund with none of the work.",
          "Pair ROI with sell-through time and you have the complete decision: expected profit, ROI on cost, and comp recency as the velocity proxy. That triple is exactly what MarginMap's Buy/Watch/Pass verdict combines: Buy when margin and confidence clear the bar, Watch when the price is close but not there, Pass when the formula says the trade was never real.",
        ],
      },
    ],
    faq: [
      {
        q: "What is landed cost in reselling?",
        a: "Landed cost is the total amount you spend to acquire an item in sellable condition: purchase price plus inbound shipping, purchase tax, and any parts or refurbishment. It is the true cost basis your profit must be measured against.",
      },
      {
        q: "How do I calculate profit on an eBay flip?",
        a: "Net payout = sale price minus final value fee (on price + shipping + tax), the $0.30 order fee, any promoted-listing ad fee, outbound shipping, and packaging. Profit = net payout minus landed cost. Divide profit by landed cost for ROI.",
      },
      {
        q: "What ROI should I target when reselling?",
        a: "Common floors are 30% ROI on cost or $15 minimum absolute profit. Below that, returns, shipping issues, and small price moves eliminate the margin. High-value low-ROI trades compete with passive investing for your capital.",
      },
      {
        q: "Why do my actual profits come in lower than my estimates?",
        a: "Almost always dropped line items: fee bases that include sales tax, promoted-listing ad percentages, packaging, purchase-side tax and shipping, or comps that describe a better condition grade than your unit. Put every line in the formula and the surprises stop.",
      },
    ],
    relatedPillars: ["landed-cost", "reseller-margin-and-roi", "marketplace-fees"],
  },
  {
    slug: "arbitrage-sourcing-workflow",
    title: "Arbitrage sourcing: building a repeatable buy list",
    metaTitle: "Arbitrage Sourcing: A Repeatable Buy-List Workflow — MarginMap",
    description:
      "Turn sourcing from daily hunting into a system: saved searches, watchlists with target prices, and alert-driven buying. The workflow that scales past one person's attention.",
    excerpt:
      "Sourcing does not scale by searching harder. It scales by converting every good search you ever run into a standing order that alerts you when the price is right.",
    category: "Sourcing",
    date: "2026-09-06",
    readMinutes: 7,
    sections: [
      {
        heading: "Hunting is a job; a system is an asset",
        body: [
          "The default sourcing loop — open marketplace, search, scroll, evaluate, repeat — has a fatal property: its output is proportional to your hours. Every day you do not hunt, your pipeline is empty. Every evaluation you did yesterday is thrown away and redone today.",
          "The fix is to separate the thinking from the watching. The thinking — what to buy, at what maximum landed cost, with what margin floor — happens once per product and gets saved. The watching is delegated to the system: watchlists with target prices that notify you when an offer crosses your number. Your daily work shrinks to reviewing alerts and executing buys.",
        ],
      },
      {
        heading: "Step one: build the search with intent, not keywords",
        body: [
          "A good sourcing search specifies the variant precisely enough that comps and offers describe the same physical thing: model, storage or size, condition band, and budget ceiling. Plain-language intent parsing helps here — 'ThinkPad X1 Carbon Gen 11, 16GB, good condition, under $450' resolves to a canonical variant rather than a fuzzy keyword net that catches Gen 9s and 8GB units.",
          "Verify the parsed intent before saving. A sourcing system built on a misidentified variant buys the wrong thing with great efficiency.",
        ],
      },
      {
        heading: "Step two: set the target price from the math, not the mood",
        body: [
          "Your target buy price is derived, not chosen: expected resale (median of clean sold comps) minus the full sell-side fee stack minus your minimum profit. If the comps say $300 median, fees take ~$40, shipping out takes $9, and your floor is $45 profit, the target landed cost is $206. Any offer at or below $206 landed is a mechanical buy; everything above is noise you never need to evaluate again.",
          "This is the number that goes on the watchlist. MarginMap's watchlist alerts fire when a matching offer's landed cost drops to your target — the marketplace's daily churn gets filtered down to the few events that are actually actionable.",
        ],
      },
      {
        heading: "Step three: run the pipeline like a ledger",
        body: [
          "Every buy that executes enters a pipeline with states — sourced, listed, sold, paid — and every evaluation carries its evidence: the comp median and range, the confidence, the timestamps. Six months of this ledger is worth more than any course: it tells you which categories actually delivered their estimated ROI, which comp sets were trustworthy, and where your real cycle time differs from your assumed one.",
          "The feedback loop is the moat. Resellers who keep records recalibrate; resellers who trust memory repeat their worst category forever.",
        ],
      },
      {
        heading: "What this looks like in practice",
        body: [
          "A one-person operation running this workflow typically maintains 20–50 active watchlist searches across two or three categories they know deeply. Alerts surface a handful of qualifying offers a week. Each is a ten-minute decision — evidence drawer open, comp freshness checked, buy or skip — instead of an hour of browsing. The same attention that used to source three items a week now sources fifteen, and every one of them passed the formula before money moved.",
        ],
      },
    ],
    faq: [
      {
        q: "What is retail arbitrage sourcing?",
        a: "Buying products below market value — from retail clearance, other marketplaces, or local channels — and reselling them where demand supports a higher price. The profit comes from the price gap between markets, so the entire discipline is measuring that gap accurately before buying.",
      },
      {
        q: "How do I set a target buy price?",
        a: "Start from the median of clean sold comps, subtract the full sell-side cost stack (platform fees, shipping, packaging), then subtract your minimum acceptable profit. What remains is the maximum landed cost you can pay. Save that as your watchlist target price.",
      },
      {
        q: "How many products should I watch at once?",
        a: "Depth beats breadth: 20–50 well-specified searches in two or three categories you understand beats 200 shallow ones. Category knowledge is what lets you catch the variant and condition errors that the data cannot.",
      },
      {
        q: "How do price alerts help sourcing?",
        a: "They invert the workflow. Instead of you searching every day and re-evaluating the same inventory, the system watches continuously and only interrupts you when an offer's landed cost crosses your target. Your sourcing output stops being proportional to your browsing hours.",
      },
    ],
    relatedPillars: ["sourcing-workflow", "evidence-and-data-confidence", "landed-cost"],
  },
];

export const POST_BY_SLUG: Record<string, Post> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p]),
);
