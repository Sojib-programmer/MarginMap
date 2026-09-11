REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.can_write(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_plan(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_workspace_role(uuid, uuid, workspace_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.shares_workspace(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.can_write(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_workspace_role(uuid, uuid, workspace_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.shares_workspace(uuid, uuid) TO authenticated, service_role;