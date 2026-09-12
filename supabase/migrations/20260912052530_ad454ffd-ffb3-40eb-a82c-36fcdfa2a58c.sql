CREATE POLICY "no client access to payment events"
  ON public.payment_events FOR SELECT TO anon, authenticated
  USING (false);