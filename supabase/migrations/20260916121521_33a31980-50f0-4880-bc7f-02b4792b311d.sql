-- Collapse any existing duplicates (keep the most recently retrieved row) before enforcing identity.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY data_source_id, external_url
           ORDER BY retrieved_at DESC, id
         ) AS rn
  FROM public.offers
  WHERE external_url IS NOT NULL
)
DELETE FROM public.offers o
USING ranked r
WHERE o.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS offers_source_external_url_key
  ON public.offers (data_source_id, external_url)
  WHERE external_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS offers_source_active_idx
  ON public.offers (data_source_id, is_active);