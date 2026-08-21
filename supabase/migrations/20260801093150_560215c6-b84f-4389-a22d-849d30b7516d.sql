-- Note: rls_auto_enable is a Lovable-internal helper that may not exist in
-- self-hosted deployments; the DO block below is a no-op if it is absent.
do $$ begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;