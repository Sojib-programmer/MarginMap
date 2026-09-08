
-- 1) Lock billing/ownership columns on workspaces -------------------------
CREATE OR REPLACE FUNCTION public.guard_workspace_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.billing_interval IS DISTINCT FROM OLD.billing_interval
     OR NEW.tier_expires_at IS DISTINCT FROM OLD.tier_expires_at
     OR NEW.billing_cycle_start IS DISTINCT FROM OLD.billing_cycle_start
     OR NEW.billing_cycle_end IS DISTINCT FROM OLD.billing_cycle_end
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'FORBIDDEN_FIELD: plan, billing and ownership fields are managed by billing, not by clients';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS workspaces_guard_privileged_columns ON public.workspaces;
CREATE TRIGGER workspaces_guard_privileged_columns
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_privileged_columns();

REVOKE UPDATE (plan, owner_id, billing_interval, tier_expires_at,
               billing_cycle_start, billing_cycle_end,
               stripe_customer_id, stripe_subscription_id)
  ON public.workspaces FROM authenticated;
REVOKE UPDATE ON public.workspaces FROM anon;

-- 2) Ownership transfer as an auditable RPC --------------------------------
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(_workspace_id uuid, _new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE prev uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT owner_id INTO prev FROM public.workspaces WHERE id = _workspace_id FOR UPDATE;
  IF prev IS NULL THEN RAISE EXCEPTION 'Workspace not found'; END IF;
  IF prev <> auth.uid() THEN RAISE EXCEPTION 'Only the current owner can transfer ownership'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = _new_owner) THEN
    RAISE EXCEPTION 'The new owner must already be a member of this workspace';
  END IF;

  UPDATE public.workspaces SET owner_id = _new_owner WHERE id = _workspace_id;
  UPDATE public.workspace_members SET role = 'owner'
   WHERE workspace_id = _workspace_id AND user_id = _new_owner;
  UPDATE public.workspace_members SET role = 'admin'
   WHERE workspace_id = _workspace_id AND user_id = prev;

  PERFORM public.log_activity(_workspace_id, 'workspace.ownership_transferred', 'workspace',
    _workspace_id, jsonb_build_object('from', prev, 'to', _new_owner));
END; $$;

REVOKE ALL ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) TO authenticated;

-- 3) Rate limiting ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no client access to rate limits" ON public.rate_limits;
CREATE POLICY "no client access to rate limits" ON public.rate_limits
  FOR SELECT TO anon, authenticated USING (false);

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win timestamptz;
  n integer;
BEGIN
  IF _key IS NULL OR length(_key) = 0 OR length(_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit key';
  END IF;
  _limit := greatest(1, least(coalesce(_limit, 1), 10000));
  _window_seconds := greatest(1, least(coalesce(_window_seconds, 60), 86400));

  win := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.rate_limits (bucket_key, window_start, count)
  VALUES (_key, win, 1)
  ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO n;

  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';

  RETURN n <= _limit;
END; $$;

REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO anon, authenticated, service_role;

-- 4) Searches cannot be written without the quota being charged ------------
CREATE OR REPLACE FUNCTION private.search_quota_charged(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usage_counters
     WHERE workspace_id = _workspace_id
       AND metric = 'searches'
       AND period_start = current_date
       AND used > 0
  );
$$;

REVOKE ALL ON FUNCTION private.search_quota_charged(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE pol text;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
              WHERE schemaname='public' AND tablename='searches' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.searches', pol);
  END LOOP;
END $$;

CREATE POLICY "members insert metered searches" ON public.searches
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IS NOT NULL
    AND private.can_write(workspace_id, auth.uid())
    AND private.search_quota_charged(workspace_id)
  );
