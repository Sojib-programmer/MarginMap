import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveListing, type ResolvedListing } from "@/lib/listing.functions";
import { useMembership } from "@/lib/membership";

export type ListingPrefill = {
  title: string | null;
  itemPrice: number;
  shippingPrice: number;
  conditionGrade: string | null;
  marketplace: string | null;
  listingUrl: string;
};

/**
 * Paste-a-listing entry point. When the marketplace can be queried the numbers
 * arrive from the listing itself; otherwise it says why and hands the user a
 * priced-by-hand path instead of a dead end.
 */
export function ListingLookup({ onResolved }: { onResolved: (p: ListingPrefill) => void }) {
  const { membership } = useMembership();
  const resolve = useServerFn(resolveListing);
  const [url, setUrl] = useState("");
  const [last, setLast] = useState<ResolvedListing | null>(null);

  const lookup = useMutation({
    mutationFn: async () => {
      if (!membership?.workspaceId) throw new Error("No workspace selected.");
      return resolve({ data: { workspaceId: membership.workspaceId, url: url.trim() } });
    },
    onSuccess: (res) => {
      setLast(res);
      if (res.resolved) {
        onResolved({
          title: res.title,
          itemPrice: res.itemPrice ?? 0,
          shippingPrice: res.shippingPrice ?? 0,
          conditionGrade: res.conditionGrade,
          marketplace: res.marketplace,
          listingUrl: res.listingUrl,
        });
        toast.success("Listing loaded into the calculator");
      } else {
        onResolved({
          title: null,
          itemPrice: 0,
          shippingPrice: 0,
          conditionGrade: null,
          marketplace: res.marketplace,
          listingUrl: res.listingUrl,
        });
      }
    },
    onError: (e: Error) => toast.error(e.message.replace(/^[A-Z_]+:\s*/, "")),
  });

  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Evaluate a listing you found</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste any marketplace listing address. MarginMap works out landed cost, compares it
          against completed sales and returns the verdict — the item does not need to be in the
          catalogue.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label className="label-meta" htmlFor="listing-url">
            Listing address
          </Label>
          <Input
            id="listing-url"
            className="mt-1 h-9"
            placeholder="https://www.ebay.com/itm/1234567890"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim()) lookup.mutate();
            }}
          />
        </div>
        <Button
          size="sm"
          className="h-9"
          disabled={!url.trim() || lookup.isPending}
          onClick={() => lookup.mutate()}
        >
          {lookup.isPending ? "Checking…" : "Load listing"}
        </Button>
      </div>

      {last ? (
        <p className="text-xs text-muted-foreground">
          {last.resolved ? (
            <>
              Loaded from {last.marketplaceLabel}
              {last.title ? `: ${last.title}` : ""}. Check the inputs below before trusting the
              verdict.
            </>
          ) : (
            last.reason
          )}
        </p>
      ) : null}
    </section>
  );
}
