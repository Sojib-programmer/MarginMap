import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { RoleMode } from "@/lib/role-mode";
import type { OfferEconomics, Recommendation } from "@/lib/scoring";

/**
 * Authenticated workspace mutations. Every insert stamps the caller's own
 * user id, so the existing `auth.uid()` RLS policies keep rows private.
 */
async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("You need to be signed in to save this.");
  return data.user.id;
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      query: string;
      mode: RoleMode;
      intent: unknown;
      silent?: boolean;
    }) => {
      const userId = await requireUserId();
      const { error } = await supabase.from("searches").insert({
        user_id: userId,
        raw_query: vars.query,
        role_mode: vars.mode,
        parsed_intent: (vars.intent ?? {}) as never,
      });
      if (error) throw new Error(error.message);
      return vars;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      if (!vars.silent) toast.success("Search saved to your workspace");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string; mode: RoleMode }) => {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("watchlists")
        .insert({
          user_id: userId,
          name: vars.name.trim() || "Untitled list",
          role_mode: vars.mode,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      toast.success("Watchlist created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      variantId?: string | null;
      offerId?: string | null;
      watchlistId?: string | null;
      targetPrice?: number | null;
      note?: string | null;
      mode: RoleMode;
    }) => {
      const userId = await requireUserId();
      let listId = vars.watchlistId ?? null;
      if (!listId) {
        const { data: existing, error: listErr } = await supabase
          .from("watchlists")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1);
        if (listErr) throw new Error(listErr.message);
        listId = existing?.[0]?.id ?? null;
      }
      if (!listId) {
        const { data, error } = await supabase
          .from("watchlists")
          .insert({ user_id: userId, name: "My watchlist", role_mode: vars.mode })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        listId = data.id;
      }
      const { error } = await supabase.from("watchlist_items").insert({
        user_id: userId,
        watchlist_id: listId,
        variant_id: vars.variantId ?? null,
        offer_id: vars.offerId ?? null,
        target_price: vars.targetPrice ?? null,
        note: vars.note ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      qc.invalidateQueries({ queryKey: ["watchlist_items"] });
      toast.success("Added to watchlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      label: string;
      variantId?: string | null;
      offerId?: string | null;
      economics: OfferEconomics;
      recommendation: Recommendation;
      input?: Record<string, unknown>;
      marketplace?: string;
    }) => {
      const userId = await requireUserId();
      const e = vars.economics;
      const { error } = await supabase.from("deal_evaluations").insert({
        user_id: userId,
        variant_id: vars.variantId ?? null,
        offer_id: vars.offerId ?? null,
        label: vars.label,
        input: (vars.input ?? {
          itemPrice: e.itemPrice,
          shipping: e.shipping,
          tax: e.tax,
          taxProvided: e.taxProvided,
          marketplace: vars.marketplace ?? null,
        }) as never,
        assumptions: {
          recommendation: vars.recommendation.action,
          reason: vars.recommendation.reason,
          resaleFees: e.resaleFees,
          landedCost: e.landedCost,
          sampleSize: e.sampleSize,
          flags: e.flags,
        } as never,
        expected_sale_low: e.lowSold || null,
        expected_sale_mid: e.expectedResale,
        expected_sale_high: e.highSold || null,
        net_proceeds: e.netProceeds,
        profit: e.expectedProfit,
        roi_pct: e.roiPct,
        days_to_sell_estimate: e.daysToSell,
        score: e.deal.score.score,
        confidence: e.confidence,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_evaluations"] });
      toast.success("Evaluation saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
