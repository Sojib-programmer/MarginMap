-- ============ enums ============
create type public.workspace_role as enum ('owner','admin','editor','auditor');
create type public.plan_tier as enum ('research','reseller','team');

-- ============ workspaces ============
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan plan_tier not null default 'research',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
grant select, insert, update, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'editor',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.workspace_invitations to authenticated;
grant all on public.workspace_invitations to service_role;
alter table public.workspace_invitations enable row level security;

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create index activity_log_ws_created_idx on public.activity_log (workspace_id, created_at desc);

create table public.source_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_upserted integer not null default 0,
  status text not null default 'running',
  error_text text
);
grant select on public.source_refresh_runs to anon, authenticated;
grant all on public.source_refresh_runs to service_role;
alter table public.source_refresh_runs enable row level security;
create policy "public read" on public.source_refresh_runs for select to anon, authenticated using (true);

-- ============ data source provenance ============
alter table public.data_sources
  add column if not exists is_live boolean not null default false,
  add column if not exists refresh_interval_minutes integer,
  add column if not exists last_refreshed_at timestamptz,
  add column if not exists last_error_at timestamptz,
  add column if not exists last_error_text text,
  add column if not exists snapshot_date date;

-- ============ security definer helpers ============
create or replace function public.is_workspace_member(_workspace_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = _workspace_id and m.user_id = _user_id)
$$;

create or replace function public.has_workspace_role(_workspace_id uuid, _user_id uuid, _roles workspace_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = _workspace_id and m.user_id = _user_id and m.role = any(_roles))
$$;

create or replace function public.can_write(_workspace_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_workspace_role(_workspace_id, _user_id, array['owner','admin','editor']::workspace_role[])
$$;

create or replace function public.current_plan(_workspace_id uuid)
returns plan_tier language sql stable security definer set search_path = public as $$
  select w.plan from public.workspaces w where w.id = _workspace_id
$$;

create or replace function public.log_activity(
  _workspace_id uuid, _action text, _target_type text default null,
  _target_id uuid default null, _metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  clean jsonb;
  new_id uuid;
begin
  if not public.is_workspace_member(_workspace_id, auth.uid()) then
    raise exception 'not a member of workspace';
  end if;
  -- strip anything credential-like; never persist secrets in the audit trail
  clean := coalesce(_metadata, '{}'::jsonb);
  clean := clean - 'password' - 'token' - 'access_token' - 'refresh_token'
                 - 'secret' - 'api_key' - 'apikey' - 'authorization' - 'session';
  insert into public.activity_log (workspace_id, actor_id, action, target_type, target_id, metadata)
  values (_workspace_id, auth.uid(), _action, _target_type, _target_id, clean)
  returning id into new_id;
  return new_id;
end; $$;

-- ============ workspace policies ============
create policy "members read workspace" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id, auth.uid()));
create policy "user creates own workspace" on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner updates workspace" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, auth.uid(), array['owner','admin']::workspace_role[]))
  with check (public.has_workspace_role(id, auth.uid(), array['owner','admin']::workspace_role[]));

create policy "members read members" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "bootstrap own owner membership" on public.workspace_members for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'owner'
    and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    and not exists (select 1 from public.workspace_members m where m.workspace_id = workspace_id)
  );
create policy "admins manage members" on public.workspace_members for update to authenticated
  using (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[])
    and user_id <> auth.uid() and role <> 'owner'
  )
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[])
    and user_id <> auth.uid()
    and (role <> 'owner' or public.has_workspace_role(workspace_id, auth.uid(), array['owner']::workspace_role[]))
  );
create policy "admins remove members" on public.workspace_members for delete to authenticated
  using (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[])
    and role <> 'owner'
  );

create policy "members read invitations" on public.workspace_invitations for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));
create policy "admins create invitations" on public.workspace_invitations for insert to authenticated
  with check (
    invited_by = auth.uid()
    and public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[])
    and role <> 'owner'
  );
create policy "admins revoke invitations" on public.workspace_invitations for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));

-- append-only: read for members, writes only through log_activity()
create policy "members read activity" on public.activity_log for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ workspace_id on user data ============
alter table public.searches add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.watchlists add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.watchlist_items add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.deal_evaluations add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.inventory_items add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.research_reports add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.research_evidence add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.alerts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.feedback add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- backfill: one personal workspace per existing user
insert into public.workspaces (id, name, owner_id, plan)
select gen_random_uuid(), coalesce(p.display_name, 'Personal') || ' workspace', p.id, 'research'
from public.profiles p
where not exists (select 1 from public.workspaces w where w.owner_id = p.id);

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner' from public.workspaces w
on conflict (workspace_id, user_id) do nothing;

update public.searches s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.watchlists s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.watchlist_items s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.deal_evaluations s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.inventory_items s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.research_reports s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.research_evidence s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.alerts s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;
update public.feedback s set workspace_id = w.id from public.workspaces w where w.owner_id = s.user_id and s.workspace_id is null;

-- ============ rewrite user-data policies onto workspace roles ============
drop policy if exists "own rows" on public.searches;
drop policy if exists "own rows" on public.watchlists;
drop policy if exists "own rows" on public.watchlist_items;
drop policy if exists "own rows" on public.deal_evaluations;
drop policy if exists "own rows" on public.inventory_items;
drop policy if exists "own rows" on public.research_reports;
drop policy if exists "own rows" on public.research_evidence;
drop policy if exists "own rows" on public.alerts;
drop policy if exists "own rows" on public.feedback;

do $$
declare t text;
begin
  foreach t in array array['searches','watchlists','watchlist_items','deal_evaluations','inventory_items','research_reports','research_evidence','alerts','feedback']
  loop
    execute format($f$
      create policy "workspace read" on public.%1$I for select to authenticated
        using (workspace_id is not null and public.is_workspace_member(workspace_id, auth.uid()));
      create policy "workspace insert" on public.%1$I for insert to authenticated
        with check (user_id = auth.uid() and workspace_id is not null and public.can_write(workspace_id, auth.uid()));
      create policy "workspace update" on public.%1$I for update to authenticated
        using (workspace_id is not null and public.can_write(workspace_id, auth.uid()))
        with check (workspace_id is not null and public.can_write(workspace_id, auth.uid()));
      create policy "workspace delete" on public.%1$I for delete to authenticated
        using (workspace_id is not null and public.can_write(workspace_id, auth.uid()));
    $f$, t);
  end loop;
end $$;

-- new signups get a personal workspace automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id, plan)
  values (coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)) || ' workspace', new.id, 'research')
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, new.id, 'owner') on conflict do nothing;

  return new;
end; $$;

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.update_updated_at_column();
create trigger workspace_members_updated_at before update on public.workspace_members
  for each row execute function public.update_updated_at_column();