-- The INSERT policy on public.searches evaluates private.search_quota_charged
-- as the calling role, so authenticated needs EXECUTE on it. The function is
-- SECURITY DEFINER and only reads usage_counters; it stays revoked from anon.
GRANT EXECUTE ON FUNCTION private.search_quota_charged(uuid) TO authenticated, service_role;