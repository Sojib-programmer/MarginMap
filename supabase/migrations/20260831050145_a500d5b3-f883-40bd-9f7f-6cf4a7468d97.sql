
create schema if not exists private;
grant usage on schema private to authenticated, anon, service_role;

alter function public.is_workspace_member(uuid, uuid) set schema private;
alter function public.has_workspace_role(uuid, uuid, workspace_role[]) set schema private;
alter function public.can_write(uuid, uuid) set schema private;
alter function public.current_plan(uuid) set schema private;
alter function public.shares_workspace(uuid, uuid) set schema private;

create or replace function private.can_write(_workspace_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select private.has_workspace_role(_workspace_id, _user_id, array['owner','admin','editor']::workspace_role[]) $$;

create or replace function public.log_activity(_workspace_id uuid, _action text, _target_type text default null::text, _target_id uuid default null::uuid, _metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  clean jsonb;
  new_id uuid;
begin
  if not private.is_workspace_member(_workspace_id, auth.uid()) then
    raise exception 'not a member of workspace';
  end if;
  clean := coalesce(_metadata, '{}'::jsonb);
  clean := clean - 'password' - 'token' - 'access_token' - 'refresh_token'
                 - 'secret' - 'api_key' - 'apikey' - 'authorization' - 'session';
  insert into public.activity_log (workspace_id, actor_id, action, target_type, target_id, metadata)
  values (_workspace_id, auth.uid(), _action, _target_type, _target_id, clean)
  returning id into new_id;
  return new_id;
end; $$;

revoke all on function private.is_workspace_member(uuid, uuid) from public;
revoke all on function private.has_workspace_role(uuid, uuid, workspace_role[]) from public;
revoke all on function private.can_write(uuid, uuid) from public;
revoke all on function private.current_plan(uuid) from public;
revoke all on function private.shares_workspace(uuid, uuid) from public;
grant execute on function private.is_workspace_member(uuid, uuid) to authenticated, anon, service_role;
grant execute on function private.has_workspace_role(uuid, uuid, workspace_role[]) to authenticated, anon, service_role;
grant execute on function private.can_write(uuid, uuid) to authenticated, anon, service_role;
grant execute on function private.current_plan(uuid) to authenticated, anon, service_role;
grant execute on function private.shares_workspace(uuid, uuid) to authenticated, anon, service_role;
