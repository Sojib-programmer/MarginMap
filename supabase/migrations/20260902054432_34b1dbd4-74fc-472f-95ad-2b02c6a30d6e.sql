REVOKE ALL ON FUNCTION public.consume_quota(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_tier_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tier_limits(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_watchlist_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_alert_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_seat_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_billing_interval() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.workspace_limits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_limits(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.tier_limits(public.plan_tier) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.tier_limits(public.plan_tier) TO authenticated, service_role;