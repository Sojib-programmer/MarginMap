-- 1) Block plan/billing injection at workspace creation time.
CREATE OR REPLACE FUNCTION public.guard_workspace_insert_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Client-created workspaces are always Free and never pre-linked to billing.
  NEW.plan := 'free'::plan_tier;
  NEW.billing_interval := 'monthly';
  NEW.tier_expires_at := NULL;
  NEW.billing_cycle_start := NULL;
  NEW.billing_cycle_end := NULL;
  NEW.stripe_customer_id := NULL;
  NEW.stripe_subscription_id := NULL;
  NEW.owner_id := auth.uid();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_guard_insert_privileged_columns ON public.workspaces;
CREATE TRIGGER workspaces_guard_insert_privileged_columns
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_insert_privileged_columns();

-- 2) Quota consumption must be monotonic and bounded.
CREATE OR REPLACE FUNCTION public.consume_quota(_workspace_id uuid, _metric text, _amount integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF _amount IS NULL OR _amount < 1 OR _amount > 100 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: quota amount must be between 1 and 100';
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
END; $function$;

REVOKE EXECUTE ON FUNCTION public.consume_quota(uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid, text, integer) TO authenticated, service_role;