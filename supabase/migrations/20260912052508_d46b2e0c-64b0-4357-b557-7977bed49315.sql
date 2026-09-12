CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text NOT NULL,
  plan public.plan_tier NOT NULL,
  billing_interval text NOT NULL,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_environment_valid CHECK (environment IN ('sandbox', 'live')),
  CONSTRAINT subscriptions_interval_valid CHECK (billing_interval IN ('monthly', 'annual')),
  CONSTRAINT subscriptions_paid_plan_valid CHECK (plan IN ('pro', 'business')),
  CONSTRAINT subscriptions_provider_env_unique UNIQUE (stripe_subscription_id, environment)
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace owners view subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = subscriptions.workspace_id AND w.owner_id = auth.uid()
  ));

CREATE INDEX subscriptions_workspace_environment_idx
  ON public.subscriptions (workspace_id, environment, created_at DESC);
CREATE INDEX subscriptions_user_environment_idx
  ON public.subscriptions (user_id, environment, created_at DESC);
CREATE INDEX subscriptions_customer_environment_idx
  ON public.subscriptions (stripe_customer_id, environment);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_events (
  event_id text NOT NULL,
  environment text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, environment),
  CONSTRAINT payment_events_environment_valid CHECK (environment IN ('sandbox', 'live'))
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;