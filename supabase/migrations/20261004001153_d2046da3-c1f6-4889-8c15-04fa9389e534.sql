CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
REVOKE SELECT (key_hash) ON public.api_keys FROM authenticated;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read workspace api keys" ON public.api_keys FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.api_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  status integer NOT NULL,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_requests_ws_time ON public.api_requests (workspace_id, created_at DESC);
GRANT SELECT ON public.api_requests TO authenticated;
GRANT ALL ON public.api_requests TO service_role;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read api requests" ON public.api_requests FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()));

-- Issue a key: owner/admin on business+ only. Returns plaintext once.
CREATE OR REPLACE FUNCTION public.create_api_key(_workspace_id uuid, _name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE tok text; kid uuid; p text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_workspace_role(_workspace_id, auth.uid(), ARRAY['owner','admin']::workspace_role[]) THEN
    RAISE EXCEPTION 'FORBIDDEN: only owners and admins can manage API keys';
  END IF;
  SELECT plan::text INTO p FROM public.workspaces WHERE id = _workspace_id;
  IF p NOT IN ('business','enterprise') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED: API access requires the Business or Enterprise plan';
  END IF;
  IF (SELECT count(*) FROM public.api_keys WHERE workspace_id=_workspace_id AND revoked_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'LIMIT: at most 10 active keys per workspace';
  END IF;
  tok := 'mm_live_' || encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.api_keys (workspace_id, name, key_prefix, key_hash, created_by)
  VALUES (_workspace_id, left(trim(_name), 80), left(tok, 14), encode(digest(tok, 'sha256'), 'hex'), auth.uid())
  RETURNING id INTO kid;
  RETURN jsonb_build_object('id', kid, 'token', tok);
END $$;
REVOKE ALL ON FUNCTION public.create_api_key(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_api_key(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_api_key(_key_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.api_keys WHERE id = _key_id;
  IF ws IS NULL OR NOT private.has_workspace_role(ws, auth.uid(), ARRAY['owner','admin']::workspace_role[]) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.api_keys SET revoked_at = now() WHERE id = _key_id AND revoked_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO authenticated;

-- Gateway: authenticate key, burst limit, monthly quota. Called by the public API route.
CREATE OR REPLACE FUNCTION public.api_gateway(_token text, _endpoint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k record; p text; burst int; cap int; used int; period date; ok boolean;
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
  SELECT uc.used INTO used FROM public.usage_counters uc WHERE workspace_id=k.workspace_id AND metric='api_calls' AND period_start=period FOR UPDATE;
  IF cap >= 0 AND used + 1 > cap THEN
    INSERT INTO public.api_requests (workspace_id, key_id, endpoint, status) VALUES (k.workspace_id, k.id, left(_endpoint,100), 429);
    RETURN jsonb_build_object('status', 429, 'error', 'Monthly API quota exhausted', 'monthly_limit', cap, 'used', used);
  END IF;
  UPDATE public.usage_counters SET used = used + 1 WHERE workspace_id=k.workspace_id AND metric='api_calls' AND period_start=period RETURNING usage_counters.used INTO used;
  UPDATE public.api_keys SET last_used_at = now() WHERE id = k.id;
  RETURN jsonb_build_object('status', 200, 'workspace_id', k.workspace_id, 'key_id', k.id, 'plan', p,
    'burst_limit', burst, 'monthly_limit', cap, 'used', used);
END $$;
REVOKE ALL ON FUNCTION public.api_gateway(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_gateway(text, text) TO anon, authenticated, service_role;

-- Record final status/latency for a successful gateway call. Key-bound so callers can only log their own workspace.
CREATE OR REPLACE FUNCTION public.api_log(_token text, _endpoint text, _status int, _latency int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k record;
BEGIN
  SELECT id, workspace_id INTO k FROM public.api_keys WHERE key_hash = encode(digest(coalesce(_token,''), 'sha256'), 'hex');
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.api_requests (workspace_id, key_id, endpoint, status, latency_ms)
  VALUES (k.workspace_id, k.id, left(_endpoint,100), greatest(100, least(_status, 599)), greatest(0, least(_latency, 600000)));
END $$;
REVOKE ALL ON FUNCTION public.api_log(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_log(text, text, int, int) TO anon, authenticated, service_role;

-- Key-scoped data read: watchlists of the key's workspace.
CREATE OR REPLACE FUNCTION public.api_list_watchlists(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.api_keys WHERE key_hash = encode(digest(coalesce(_token,''), 'sha256'), 'hex') AND revoked_at IS NULL;
  IF ws IS NULL THEN RAISE EXCEPTION 'invalid key'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'role_mode', w.role_mode, 'created_at', w.created_at,
      'items', (SELECT count(*) FROM public.watchlist_items i WHERE i.watchlist_id = w.id)) ORDER BY w.created_at DESC)
    FROM public.watchlists w WHERE w.workspace_id = ws), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.api_list_watchlists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_list_watchlists(text) TO anon, authenticated, service_role;