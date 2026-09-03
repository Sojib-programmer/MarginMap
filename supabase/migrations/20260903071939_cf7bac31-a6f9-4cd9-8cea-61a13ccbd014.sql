DROP POLICY IF EXISTS source_refresh_runs_select ON public.source_refresh_runs;
DROP POLICY IF EXISTS "source_refresh_runs read authenticated" ON public.source_refresh_runs;
DROP POLICY IF EXISTS "Authenticated users can read refresh runs" ON public.source_refresh_runs;

CREATE POLICY source_refresh_runs_admin_read
ON public.source_refresh_runs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

COMMENT ON TABLE public.source_refresh_runs IS 'Internal connector refresh diagnostics. Read restricted to workspace owners/admins; writes only via service role.';