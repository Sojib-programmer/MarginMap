-- Fix: the local variable `used` collided with usage_counters.used in the UPDATE's
-- SET expression (unqualified RHS), raising "column reference \"used\" is ambiguous"
-- for every authorized request. Rename the variable to v_used.
CREATE OR REPLACE FUNCTION public.api_gateway(_token text, _endpoint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k record; p text; burst int; cap int; v_used int; period date; ok boolean;
BEGIN
  IF _token IS NULL OR _token !~ '^mm_live_[0-9a-f]{48}$' THEN
    RETURN jsonb_build_object('status', 401, 'error', 'Invalid API key');
  END IF;
  SELECT * INTO k FROM public.api_keys WHERE key_hash = encode(digest(_token, 'sha256'), 'hex') AND revoked_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 401, 'error', 'Invalid or revoked API key'); END IF;
  SELECT plan::text INTO p FROM public.workspaces WHERE id = k.workspace_id;
  IF p NOT IN ('business','enterprise') THEN
    INSERT INTO public.api_requests (workspace_id, key_id, endpoint, status) VALUES (k.workspace_id, k.id, left(_endpoint,100), 403);
    RETURN jsonb_build_object('status', 403, 'error', 'Workspace plan no longer includes API access');
  END IF;
  burst := CASE WHEN p = 'enterprise' THEN 600 ELSE 60 END;
  ok := public.hit_rate_limit('api:' || k.workspace_id::text, burst, 60);
  IF NOT ok THEN
    INSERT INTO public.api_requests (workspace_id, key_id, endpoint, status) VALUES (k.workspace_id, k.id, left(_endpoint,100), 429);
    RETURN jsonb_build_object('status', 429, 'error', 'Rate limit exceeded', 'burst_limit', burst, 'retry_after', 60 - (extract(epoch from now())::int % 60));
  END IF;
  cap := (private.workspace_limits(k.workspace_id) ->> 'api_calls_per_month')::int;
  period := date_trunc('month', current_date)::date;
  INSERT INTO public.usage_counters (workspace_id, metric, period_start, used) VALUES (k.workspace_id, 'api_calls', period, 0)
    ON CONFLICT (workspace_id, metric, period_start) DO NOTHING;
  SELECT uc.used INTO v_used FROM public.usage_counters uc WHERE workspace_id=k.workspace_id AND metric='api_calls' AND period_start=period FOR UPDATE;
  IF cap >= 0 AND v_used + 1 > cap THEN
    INSERT INTO public.api_requests (workspace_id, key_id, endpoint, status) VALUES (k.workspace_id, k.id, left(_endpoint,100), 429);
    RETURN jsonb_build_object('status', 429, 'error', 'Monthly API quota exhausted', 'monthly_limit', cap, 'used', v_used);
  END IF;
  UPDATE public.usage_counters SET used = used + 1 WHERE workspace_id=k.workspace_id AND metric='api_calls' AND period_start=period RETURNING usage_counters.used INTO v_used;
  UPDATE public.api_keys SET last_used_at = now() WHERE id = k.id;
  RETURN jsonb_build_object('status', 200, 'workspace_id', k.workspace_id, 'key_id', k.id, 'plan', p,
    'burst_limit', burst, 'monthly_limit', cap, 'used', v_used);
END $$;
REVOKE ALL ON FUNCTION public.api_gateway(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_gateway(text, text) TO anon, authenticated, service_role;