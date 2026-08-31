ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.shares_workspace(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m2.workspace_id = m1.workspace_id
    where m1.user_id = _a and m2.user_id = _b
  )
$$;

REVOKE ALL ON FUNCTION public.shares_workspace(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_workspace(uuid, uuid) TO authenticated;

CREATE POLICY "workspace peers read profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_workspace(auth.uid(), id));