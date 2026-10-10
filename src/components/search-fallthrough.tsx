import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ListingLookup, type ListingPrefill } from "@/components/listing-lookup";
import { ListingRiskPanel } from "@/components/listing-risk-panel";
import { Button } from "@/components/ui/button";
import { money2 } from "@/lib/format";
import { isListingUrl } from "@/lib/listing-url";

/**
 * Zero-hit / pasted-URL path for search: resolve the listing live, show landed
 * cost and run the AI sourcing-risk screen inline instead of a dead end.
 */
export function SearchFallthrough({ query }: { query: string }) {
  const pastedUrl = isListingUrl(query) ? query.trim() : undefined;
  const [listing, setListing] = useState<ListingPrefill | null>(null);

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <h2 className="text-sm font-semibold">
          {pastedUrl ? "Checking the listing you pasted" : "Not in the catalogue yet"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {pastedUrl
            ? "MarginMap is reading this listing directly and will screen it for sourcing risk."
            : "The catalogue is a small curated sample, so most searches miss. Paste the listing you are looking at and MarginMap prices it, works out landed cost and runs an AI sourcing-risk screen right here."}
        </p>
      </div>

      <ListingLookup
        key={pastedUrl ?? "manual"}
        {...(pastedUrl ? { initialUrl: pastedUrl } : {})}
        autoRun={Boolean(pastedUrl)}
        onResolved={setListing}
      />

      {listing ? (
        <>
          {/* currency of the listing; never silently treated as USD */}
          <section className="panel grid gap-3 p-4 sm:grid-cols-4">
            <Stat label="Item" value={listing.itemPrice ? money2(listing.itemPrice, cur) : "missing"} />
            <Stat
              label="Shipping"
              value={listing.itemPrice ? money2(listing.shippingPrice, cur) : "missing"}
            />
            <Stat
              label="Landed (before tax)"
              value={
                listing.itemPrice ? money2(listing.itemPrice + listing.shippingPrice, cur) : "missing"
              }
            />
            <Stat label="Condition" value={listing.conditionGrade ?? "not stated"} />
            {cur !== "USD" ? (
              <p className="text-xs text-muted-foreground sm:col-span-4">
                Estimated: this listing is priced in {cur}. Figures are shown in {cur} and are not
                converted to USD, so compare against USD sold comps with care.
              </p>
            ) : null}
            <div className="sm:col-span-4">
              <Button asChild size="sm" variant="outline">
                <Link to="/app/evaluate" search={{ url: listing.listingUrl }}>
                  Open the full deal calculator
                </Link>
              </Button>
            </div>
          </section>
          <ListingRiskPanel
            listingUrl={listing.listingUrl}
            details={{
              ...(listing.title ? { title: listing.title } : {}),
              ...(listing.marketplace ? { marketplace: listing.marketplace } : {}),
              ...(listing.itemPrice ? { itemPrice: listing.itemPrice } : {}),
              ...(listing.itemPrice ? { shippingPrice: listing.shippingPrice } : {}),
              ...(listing.conditionGrade ? { conditionGrade: listing.conditionGrade } : {}),
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}
