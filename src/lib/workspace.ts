import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type WatchlistRow = {
  id: string;
  name: string;
  role_mode: "buyer" | "reseller";
  created_at: string;
};
export type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  variant_id: string | null;
  offer_id: string | null;
  target_price: number | null;
  note: string | null;
  created_at: string;
};
export type InventoryRow = {
  id: string;
  title: string;
  variant_id: string | null;
  status: "watch" | "researching" | "source_now" | "acquired" | "listed" | "sold" | "passed";
  cost_basis: number | null;
  listed_price: number | null;
  sold_price: number | null;
  actual_profit: number | null;
  condition_grade: string | null;
  quantity: number;
  created_at: string;
};
export type EvaluationRow = {
  id: string;
  label: string | null;
  variant_id: string | null;
  offer_id: string | null;
  profit: number | null;
  roi_pct: number | null;
  score: number | null;
  net_proceeds: number | null;
  confidence: number | null;
  input: Record<string, unknown>;
  created_at: string;
};
export type AlertRow = {
  id: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  saved_search: Record<string, unknown>;
  variant_id: string | null;
  channel: string;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
};
export type SearchRow = {
  id: string;
  raw_query: string;
  role_mode: "buyer" | "reseller";
  parsed_intent: Record<string, unknown>;
  created_at: string;
};
export type ReportRow = {
  id: string;
  query: string;
  role_mode: "buyer" | "reseller";
  variant_id: string | null;
  answer_markdown: string | null;
  structured_output: Record<string, unknown>;
  model_name: string | null;
  created_at: string;
};

async function rows<T>(table: string, order = "created_at") {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order(order, { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T[];
}

export const watchlistsQuery = queryOptions({
  queryKey: ["watchlists"],
  queryFn: () => rows<WatchlistRow>("watchlists"),
});

export const watchlistItemsQuery = queryOptions({
  queryKey: ["watchlist_items"],
  queryFn: () => rows<WatchlistItemRow>("watchlist_items"),
});

export const inventoryQuery = queryOptions({
  queryKey: ["inventory_items"],
  queryFn: () => rows<InventoryRow>("inventory_items"),
});

export const evaluationsQuery = queryOptions({
  queryKey: ["deal_evaluations"],
  queryFn: () => rows<EvaluationRow>("deal_evaluations"),
});

export const alertsQuery = queryOptions({
  queryKey: ["alerts"],
  queryFn: () => rows<AlertRow>("alerts"),
});

export const searchesQuery = queryOptions({
  queryKey: ["searches"],
  queryFn: () => rows<SearchRow>("searches"),
});

export const reportsQuery = queryOptions({
  queryKey: ["research_reports"],
  queryFn: () => rows<ReportRow>("research_reports"),
});

export const PIPELINE_STATUSES = [
  "watch",
  "researching",
  "source_now",
  "acquired",
  "listed",
  "sold",
  "passed",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  watch: "Watching",
  researching: "Researching",
  source_now: "Source now",
  acquired: "Acquired",
  listed: "Listed",
  sold: "Sold",
  passed: "Passed",
};
