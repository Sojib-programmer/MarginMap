DROP POLICY IF EXISTS "public read" ON public.source_refresh_runs;
CREATE POLICY "authenticated read" ON public.source_refresh_runs FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.source_refresh_runs FROM anon;
GRANT SELECT ON public.source_refresh_runs TO authenticated;
GRANT ALL ON public.source_refresh_runs TO service_role;