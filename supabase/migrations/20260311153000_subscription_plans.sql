-- Subscription plans managed by super_admin
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_price_cents integer NOT NULL DEFAULT 0 CHECK (monthly_price_cents >= 0),
  period_days integer NOT NULL DEFAULT 30 CHECK (period_days > 0),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  is_courtesy boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins can view subscription plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins can manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active)
VALUES
  ('start', 'Start', 'Agenda e operacao essencial', 19900, 30, 0, false, true),
  ('pro', 'Pro', 'Agenda + automacoes + financeiro', 39900, 30, 0, false, true),
  ('signature', 'Signature', 'Operacao completa com controle premium', 79900, 30, 0, false, true),
  ('courtesy', 'Cortesia', 'Plano gratuito temporario para onboarding assistido', 0, 30, 30, true, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  period_days = EXCLUDED.period_days,
  trial_days = EXCLUDED.trial_days,
  is_courtesy = EXCLUDED.is_courtesy,
  is_active = EXCLUDED.is_active,
  updated_at = now();
