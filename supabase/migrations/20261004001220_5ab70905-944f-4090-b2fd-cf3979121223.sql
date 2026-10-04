REVOKE SELECT ON public.api_keys FROM authenticated;
GRANT SELECT (id, workspace_id, name, key_prefix, created_by, last_used_at, revoked_at, created_at) ON public.api_keys TO authenticated;