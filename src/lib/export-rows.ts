import type { ResultRow } from "@/components/result-table";
import { MARKETPLACE_LABEL } from "@/lib/catalog";
import type { CsvValue } from "@/lib/csv";

export const OFFER_CSV_HEADERS = [
  "Product",
  "Variant",
  "Brand",
  "Category",
  "Offer title",
  "Marketplace",
  "Source",
  "Condition",
  "Availability",
  "Item price",
  "Shipping",
  "Tax",
  "Tax provided",
  "Resale fees",
  "Landed cost",
  "Median sold",
  "Low sold",
  "High sold",
  "Comp sample size",
  "Expected resale",
  "Net proceeds",
  "Expected profit",
  "ROI %",
  "Days to sell",
  "Verdict",
  "Verdict reason",
  "Match confidence",
  "Data confidence",
  "Retrieved at",
  "Listing URL",
];

const round = (n: number) => Math.round(Number(n) * 100) / 100;

/** Flattens the full economics chain for a set of offer rows. */
export function offerCsvRows(
  rows: ResultRow[],
  lookup: { sourceName: (id: string) => string; marketplace: (id: string) => string },
): CsvValue[][] {
  return rows.map(({ variant, offer, economics: e, recommendation }) => {
    const mk = lookup.marketplace(offer.data_source_id);
    return [
      variant.productName,
      variant.variantTitle,
      variant.brand,
      variant.category,
      offer.title,
      MARKETPLACE_LABEL[mk] ?? mk,
      lookup.sourceName(offer.data_source_id),
      offer.condition_grade,
      offer.availability,
      round(e.itemPrice),
      round(e.shipping),
      round(e.tax),
      e.taxProvided ? "yes" : "no",
      round(e.resaleFees),
      round(e.landedCost),
      e.sampleSize ? round(e.medianSold) : "",
      e.sampleSize ? round(e.lowSold) : "",
      e.sampleSize ? round(e.highSold) : "",
      e.sampleSize,
      e.sampleSize ? round(e.expectedResale) : "",
      e.sampleSize ? round(e.netProceeds) : "",
      e.sampleSize ? round(e.expectedProfit) : "",
      e.sampleSize ? round(e.roiPct) : "",
      e.daysToSell,
      recommendation.action,
      recommendation.reason,
      round(Number(offer.match_confidence) * 100),
      round(Number(e.confidence) * 100),
      offer.retrieved_at,
      offer.listing_url ?? "",
    ];
  });
}
