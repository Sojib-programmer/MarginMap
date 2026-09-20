-- Early access: reseller mode open to Free until first 100 users.
CREATE OR REPLACE FUNCTION private.tier_limits(_tier public.plan_tier)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _tier
    WHEN 'free' THEN jsonb_build_object(
      'searches_per_day', 5, 'watchlists', 3, 'alerts', 0, 'seats', 1,
      'api_calls_per_month', 0, 'marketplaces', 2, 'history_days', 30,
      'reseller_mode', true, 'csv_export', true, 'pdf_export', false)
    WHEN 'pro' THEN jsonb_build_object(
      'searches_per_day', -1, 'watchlists', 50, 'alerts', 10, 'seats', 1,
      'api_calls_per_month', 0, 'marketplaces', 3, 'history_days', 30,
      'reseller_mode', true, 'csv_export', true, 'pdf_export', false)
    WHEN 'business' THEN jsonb_build_object(
      'searches_per_day', -1, 'watchlists', -1, 'alerts', -1, 'seats', 5,
      'api_calls_per_month', 1000, 'marketplaces', 3, 'history_days', 90,
      'reseller_mode', true, 'csv_export', true, 'pdf_export', true)
    ELSE jsonb_build_object(
      'searches_per_day', -1, 'watchlists', -1, 'alerts', -1, 'seats', -1,
      'api_calls_per_month', -1, 'marketplaces', 3, 'history_days', -1,
      'reseller_mode', true, 'csv_export', true, 'pdf_export', true)
  END;
$$;

DROP POLICY IF EXISTS "workspace insert" ON public.deal_evaluations;
CREATE POLICY "workspace insert" ON public.deal_evaluations
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (workspace_id IS NOT NULL)
    AND private.can_write(workspace_id, auth.uid())
    AND ((private.workspace_limits(workspace_id) ->> 'reseller_mode')::boolean));

DROP POLICY IF EXISTS "workspace insert" ON public.inventory_items;
CREATE POLICY "workspace insert" ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (workspace_id IS NOT NULL)
    AND private.can_write(workspace_id, auth.uid())
    AND ((private.workspace_limits(workspace_id) ->> 'reseller_mode')::boolean));