-- ============ 1. Drop dependents, swap enum, recreate ============
DROP POLICY "workspace insert" ON public.deal_evaluations;
DROP POLICY "workspace insert" ON public.inventory_items;
DROP FUNCTION private.current_plan(uuid);

CREATE TYPE public.plan_tier_new AS ENUM ('free', 'pro', 'business', 'enterprise');

ALTER TABLE public.workspaces ALTER COLUMN plan DROP DEFAULT;

ALTER TABLE public.workspaces
  ALTER COLUMN plan TYPE public.plan_tier_new
  USING (CASE plan::text
           WHEN 'research' THEN 'free'
           WHEN 'reseller' THEN 'pro'
           WHEN 'team'     THEN 'business'
           ELSE 'free'
         END)::public.plan_tier_new;

DROP TYPE public.plan_tier;
ALTER TYPE public.plan_tier_new RENAME TO plan_tier;

ALTER TABLE public.workspaces ALTER COLUMN plan SET DEFAULT 'free'::public.plan_tier;

CREATE FUNCTION private.current_plan(_workspace_id uuid)
RETURNS public.plan_tier LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select w.plan from public.workspaces w where w.id = _workspace_id
$$;
REVOKE ALL ON FUNCTION private.current_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_plan(uuid) TO authenticated, anon, service_role;

CREATE POLICY "workspace insert" ON public.deal_evaluations
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (workspace_id IS NOT NULL)
    AND private.can_write(workspace_id, auth.uid())
    AND (private.current_plan(workspace_id) = ANY (ARRAY['pro'::public.plan_tier, 'business'::public.plan_tier, 'enterprise'::public.plan_tier])));

CREATE POLICY "workspace insert" ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (workspace_id IS NOT NULL)
    AND private.can_write(workspace_id, auth.uid())
    AND (private.current_plan(workspace_id) = ANY (ARRAY['pro'::public.plan_tier, 'business'::public.plan_tier, 'enterprise'::public.plan_tier])));

-- ============ 2. Billing columns ============
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle_start timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE OR REPLACE FUNCTION public.validate_billing_interval()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.billing_interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'billing_interval must be monthly or annual';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS workspaces_billing_interval ON public.workspaces;
CREATE TRIGGER workspaces_billing_interval
  BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.validate_billing_interval();

-- ============ 3. Tier limits ============
CREATE OR REPLACE FUNCTION private.tier_limits(_tier public.plan_tier)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _tier
    WHEN 'free' THEN jsonb_build_object(
      'searches_per_day', 5, 'watchlists', 3, 'alerts', 0, 'seats', 1,
      'api_calls_per_month', 0, 'marketplaces', 2, 'history_days', 0,
      'reseller_mode', false, 'csv_export', false, 'pdf_export', false)
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

CREATE OR REPLACE FUNCTION private.workspace_limits(_workspace_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.tier_limits(w.plan) FROM public.workspaces w WHERE w.id = _workspace_id;
$$;
REVOKE ALL ON FUNCTION private.workspace_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.workspace_limits(uuid) TO authenticated, anon, service_role;
REVOKE ALL ON FUNCTION private.tier_limits(public.plan_tier) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.tier_limits(public.plan_tier) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.current_tier_limits(_workspace_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of workspace';
  END IF;
  RETURN private.workspace_limits(_workspace_id);
END; $$;

-- ============ 4. Usage counters ============
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric text NOT NULL,
  period_start date NOT NULL,
  used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, metric, period_start)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_counters_select_members" ON public.usage_counters
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.consume_quota(_workspace_id uuid, _metric text, _amount integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  limits jsonb;
  cap integer;
  period date;
  total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT private.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a member of workspace';
  END IF;
  IF _metric NOT IN ('searches', 'api_calls') THEN
    RAISE EXCEPTION 'unknown metric %', _metric;
  END IF;

  limits := private.workspace_limits(_workspace_id);
  IF _metric = 'searches' THEN
    cap := (limits ->> 'searches_per_day')::int;
    period := current_date;
  ELSE
    cap := (limits ->> 'api_calls_per_month')::int;
    period := date_trunc('month', current_date)::date;
  END IF;

  INSERT INTO public.usage_counters (workspace_id, metric, period_start, used)
  VALUES (_workspace_id, _metric, period, 0)
  ON CONFLICT (workspace_id, metric, period_start) DO NOTHING;

  SELECT used INTO total FROM public.usage_counters
   WHERE workspace_id = _workspace_id AND metric = _metric AND period_start = period
   FOR UPDATE;

  IF cap >= 0 AND total + _amount > cap THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED:%:%:%', _metric, total, cap;
  END IF;

  UPDATE public.usage_counters SET used = used + _amount
   WHERE workspace_id = _workspace_id AND metric = _metric AND period_start = period
   RETURNING used INTO total;

  RETURN jsonb_build_object('metric', _metric, 'used', total, 'cap', cap, 'period_start', period);
END; $$;

REVOKE ALL ON FUNCTION public.consume_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.current_tier_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tier_limits(uuid) TO authenticated;

-- ============ 5. Cap-enforcement triggers ============
CREATE OR REPLACE FUNCTION public.enforce_watchlist_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap integer; n integer;
BEGIN
  IF NEW.workspace_id IS NULL THEN RETURN NEW; END IF;
  cap := (private.workspace_limits(NEW.workspace_id) ->> 'watchlists')::int;
  IF cap < 0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM public.watchlists WHERE workspace_id = NEW.workspace_id;
  IF n >= cap THEN
    RAISE EXCEPTION 'PLAN_LIMIT:watchlists:%:%', n, cap;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS watchlists_cap ON public.watchlists;
CREATE TRIGGER watchlists_cap BEFORE INSERT ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION public.enforce_watchlist_cap();

CREATE OR REPLACE FUNCTION public.enforce_alert_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap integer; n integer;
BEGIN
  IF NEW.workspace_id IS NULL THEN RETURN NEW; END IF;
  cap := (private.workspace_limits(NEW.workspace_id) ->> 'alerts')::int;
  IF cap < 0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM public.alerts WHERE workspace_id = NEW.workspace_id;
  IF n >= cap THEN
    RAISE EXCEPTION 'PLAN_LIMIT:alerts:%:%', n, cap;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS alerts_cap ON public.alerts;
CREATE TRIGGER alerts_cap BEFORE INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_alert_cap();

CREATE OR REPLACE FUNCTION public.enforce_seat_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap integer; n integer;
BEGIN
  cap := (private.workspace_limits(NEW.workspace_id) ->> 'seats')::int;
  IF cap < 0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM public.workspace_members WHERE workspace_id = NEW.workspace_id;
  IF n >= cap THEN
    RAISE EXCEPTION 'PLAN_LIMIT:seats:%:%', n, cap;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS workspace_members_seat_cap ON public.workspace_members;
CREATE TRIGGER workspace_members_seat_cap BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_cap();

-- ============ 6. MFA backup codes ============
CREATE TABLE public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mfa_backup_codes_user_idx ON public.mfa_backup_codes (user_id);

GRANT ALL ON public.mfa_backup_codes TO service_role;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfa_backup_codes_no_client_access" ON public.mfa_backup_codes
  FOR SELECT TO authenticated USING (false);

-- ============ 7. New signups start on free ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare ws uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id, plan)
  values (coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)) || ' workspace', new.id, 'free')
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner') on conflict do nothing;

  return new;
end; $$;