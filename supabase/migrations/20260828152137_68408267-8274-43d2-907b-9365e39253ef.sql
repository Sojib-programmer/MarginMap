-- 1. Restrict SECURITY DEFINER function that signed-in users never need to call directly.
REVOKE ALL ON FUNCTION public.current_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_plan(uuid) TO service_role;

-- Defense in depth: no implicit PUBLIC execute on the other definer helpers.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_activity(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon;

-- 2. activity_log stays append-only and writable only through the audited definer path.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.activity_log FROM authenticated, anon;
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
COMMENT ON TABLE public.activity_log IS 'Append-only audit trail. Direct writes are revoked for anon/authenticated; entries are created only via public.log_activity(), which verifies workspace membership and strips credential-like metadata.';

DROP POLICY IF EXISTS "no direct activity writes" ON public.activity_log;
CREATE POLICY "no direct activity writes"
  ON public.activity_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (false);

-- 3. Fix the tautological bootstrap guard on workspace_members.
DROP POLICY IF EXISTS "bootstrap own owner membership" ON public.workspace_members;
CREATE POLICY "bootstrap own owner membership"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'::workspace_role
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id
    )
  );