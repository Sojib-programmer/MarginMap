revoke all on function public.is_workspace_member(uuid, uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, uuid, workspace_role[]) from public, anon;
revoke all on function public.can_write(uuid, uuid) from public, anon;
revoke all on function public.current_plan(uuid) from public, anon;
revoke all on function public.log_activity(uuid, text, text, uuid, jsonb) from public, anon;

grant execute on function public.is_workspace_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_workspace_role(uuid, uuid, workspace_role[]) to authenticated, service_role;
grant execute on function public.can_write(uuid, uuid) to authenticated, service_role;
grant execute on function public.current_plan(uuid) to authenticated, service_role;
grant execute on function public.log_activity(uuid, text, text, uuid, jsonb) to authenticated, service_role;