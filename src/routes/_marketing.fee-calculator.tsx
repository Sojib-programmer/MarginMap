import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CTABand, PageHero } from "@/components/marketing";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/fee-calculator")({
  head: () =>
    pageHead({
      path: "/fee-calculator",
      title: "Marketplace Fee Calculator (eBay, Amazon, Shopify) — MarginMap",
      description:
        "Estimate marketplace fees and net proceeds for eBay, Amazon, and Shopify sales. Adjust the fee rate to your category and see payout, total fees, and break-even price.",
    }),
  component: FeeCalculatorPage,
});

interface MarketplacePreset {
  id: string;
  name: string;
  defaultRatePct: number;
  fixedFee: number;
  note: string;
}

const MARKETPLACES: MarketplacePreset[] = [
  {
    id: "ebay",
    name: "eBay",
    defaultRatePct: 13.6,
    fixedFee: 0.3,
    note: "Typical final value fee for most categories, plus a per-order fixed fee. Store subscriptions and category-specific rates differ.",
  },
  {
    id: "amazon",
    name: "Amazon",
    defaultRatePct: 15,
    fixedFee: 0,
    note: "Referral fees typically range from 8% to 15% by category. FBA fulfillment, storage, and closing fees are not included here.",
  },
  {
    id: "shopify",
    name: "Shopify",
    defaultRatePct: 2.9,
    fixedFee: 0.3,
    note: "Card processing on a typical plan. Shopify does not charge a referral fee, but the subscription itself and third-party payment surcharges are excluded.",
  },
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function CalculatorCard({ preset }: { preset: MarketplacePreset }) {
  const [salePrice, setSalePrice] = useState("100");
  const [shippingCharged, setShippingCharged] = useState("0");
  const [ratePct, setRatePct] = useState(String(preset.defaultRatePct));
  const [fixedFee, setFixedFee] = useState(String(preset.fixedFee));

  const result = useMemo(() => {
    const price = parseFloat(salePrice) || 0;
    const ship = parseFloat(shippingCharged) || 0;
    const rate = (parseFloat(ratePct) || 0) / 100;
    const fixed = parseFloat(fixedFee) || 0;
    const base = price + ship;
    const fees = base * rate + fixed;
    const net = base - fees;
    const breakEven = rate < 1 ? fixed / (1 - rate) : 0;
    return { fees, net, breakEven, base };
  }, [salePrice, shippingCharged, ratePct, fixedFee]);

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <section aria-labelledby={`${preset.id}-heading`} className="panel p-5">
      <h2 id={`${preset.id}-heading`} className="text-sm font-semibold">
        {preset.name} fee calculator
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{preset.note}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">
          Sale price (USD)
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={inputCls}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Shipping charged to buyer (USD)
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={inputCls}
            value={shippingCharged}
            onChange={(e) => setShippingCharged(e.target.value)}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Fee rate (%)
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={inputCls}
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Fixed per-order fee (USD)
          <input
            type="number"
            min="0"
            inputMode="decimal"
            className={inputCls}
            value={fixedFee}
            onChange={(e) => setFixedFee(e.target.value)}
          />
        </label>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="label-meta">Total fees</dt>
          <dd className="num mt-1 font-semibold">{fmt(result.fees)}</dd>
        </div>
        <div>
          <dt className="label-meta">Net payout</dt>
          <dd className="num mt-1 font-semibold">{fmt(result.net)}</dd>
        </div>
        <div>
          <dt className="label-meta">Break-even</dt>
          <dd className="num mt-1 font-semibold">{fmt(result.breakEven)}</dd>
        </div>
      </dl>
    </section>
  );
}

function FeeCalculatorPage() {
  return (
    <>
      <PageHero
        kicker="Free tool"
        title="Marketplace fee calculator"
        lede="Estimate what a sale on eBay, Amazon, or Shopify actually pays out after marketplace fees. Adjust the rate to match your category, then carry the number into a full MarginMap evaluation."
      />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-14">
        {MARKETPLACES.map((m) => (
          <CalculatorCard key={m.id} preset={m} />
        ))}
        <p className="text-sm text-muted-foreground">
          Rates shown are typical published figures and change over time — verify against the
          marketplace's current rate card before making a buying decision. MarginMap automates this
          calculation per offer with landed cost, sold-comps analysis, and a Buy / Watch / Pass
          verdict. See{" "}
          <Link to="/marketplace-fees" className="text-primary underline-offset-2 hover:underline">
            how marketplace fees work
          </Link>{" "}
          or{" "}
          <Link to="/pricing" className="text-primary underline-offset-2 hover:underline">
            view pricing
          </Link>
          .
        </p>
      </div>
      <CTABand />
    </>
  );
}
