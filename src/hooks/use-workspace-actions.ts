import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { logActivity, membershipQuery, type Membership } from "@/lib/membership";
import type { RoleMode } from "@/lib/role-mode";
import type { OfferEconomics, Recommendation } from "@/lib/scoring";

/**
 * Authenticated workspace mutations. Every insert stamps the caller's user id
 * and workspace id; the database decides whether the write is allowed (role +
 * plan). The checks below only produce a readable message before the round
 * trip — they are never the authorization boundary.
 */
async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("You need to be signed in to save this.");
  return data.user.id;
}

async function requireWritableWorkspace(qc: ReturnType<typeof useQueryClient>) {
  const membership = await qc.ensureQueryData(membershipQuery);
  if (!membership) throw new Error("No workspace found for this account.");
  if (membership.role === "auditor") {
    throw new Error("Auditor access is read-only. Ask an admin for Editor access.");
  }
  return membership as Membership;
}

function requireResellerPlan(m: Membership) {
  if (m.plan === "research") {
    throw new Error(
      "Saving deal evaluations and pipeline items requires the Reseller plan. See Billing.",
    );
  }
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
      const ws = await requireWritableWorkspace(qc);
      const { data, error } = await supabase
        .from("searches")
        .insert({
          user_id: userId,
          workspace_id: ws.workspaceId,
          raw_query: vars.query,
          role_mode: vars.mode,
          parsed_intent: (vars.intent ?? {}) as never,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "search.saved", {
        type: "search",
        id: data.id,
        metadata: { query: vars.query, analysis_mode: vars.mode },
      });
      return vars;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ["searches"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
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
      const ws = await requireWritableWorkspace(qc);
      const { data, error } = await supabase
        .from("watchlists")
        .insert({
          user_id: userId,
          workspace_id: ws.workspaceId,
          name: vars.name.trim() || "Untitled list",
          role_mode: vars.mode,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "watchlist.created", {
        type: "watchlist",
        id: data.id,
        metadata: { name: vars.name },
      });
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
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
      const ws = await requireWritableWorkspace(qc);
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
          .insert({
            user_id: userId,
            workspace_id: ws.workspaceId,
            name: "My watchlist",
            role_mode: vars.mode,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        listId = data.id;
      }
      const { data: item, error } = await supabase
        .from("watchlist_items")
        .insert({
          user_id: userId,
          workspace_id: ws.workspaceId,
          watchlist_id: listId,
          variant_id: vars.variantId ?? null,
          offer_id: vars.offerId ?? null,
          target_price: vars.targetPrice ?? null,
          note: vars.note ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "watchlist.item_added", {
        type: "watchlist_item",
        id: item.id,
        metadata: { variant_id: vars.variantId ?? null, target_price: vars.targetPrice ?? null },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      qc.invalidateQueries({ queryKey: ["watchlist_items"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
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
      const ws = await requireWritableWorkspace(qc);
      requireResellerPlan(ws);
      const e = vars.economics;
      const { data, error } = await supabase
        .from("deal_evaluations")
        .insert({
          user_id: userId,
          workspace_id: ws.workspaceId,
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
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(ws.workspaceId, "evaluation.saved", {
        type: "deal_evaluation",
        id: data.id,
        metadata: {
          label: vars.label,
          recommendation: vars.recommendation.action,
          roi_pct: e.roiPct,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal_evaluations"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Evaluation saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
