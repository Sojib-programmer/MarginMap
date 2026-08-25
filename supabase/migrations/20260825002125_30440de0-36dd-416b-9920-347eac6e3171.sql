drop policy if exists "workspace insert" on public.deal_evaluations;
create policy "workspace insert" on public.deal_evaluations for insert to authenticated
  with check (
    user_id = auth.uid() and workspace_id is not null
    and public.can_write(workspace_id, auth.uid())
    and public.current_plan(workspace_id) in ('reseller','team')
  );

drop policy if exists "workspace insert" on public.inventory_items;
create policy "workspace insert" on public.inventory_items for insert to authenticated
  with check (
    user_id = auth.uid() and workspace_id is not null
    and public.can_write(workspace_id, auth.uid())
    and public.current_plan(workspace_id) in ('reseller','team')
  );