REVOKE SELECT ON TABLE public.offers FROM anon;

DROP POLICY IF EXISTS "public read" ON public.offers;
CREATE POLICY "authenticated catalog read"
ON public.offers
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE public.watchlist_items
  ALTER COLUMN workspace_id SET NOT NULL;

DROP POLICY IF EXISTS "workspace read" ON public.watchlist_items;
CREATE POLICY "workspace read"
ON public.watchlist_items
FOR SELECT
TO authenticated
USING (
  private.is_workspace_member(workspace_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.watchlists w
    WHERE w.id = watchlist_items.watchlist_id
      AND w.workspace_id = watchlist_items.workspace_id
  )
);