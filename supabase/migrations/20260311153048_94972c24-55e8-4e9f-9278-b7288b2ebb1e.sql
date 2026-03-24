
-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  period_days integer NOT NULL DEFAULT 30,
  trial_days integer NOT NULL DEFAULT 0,
  is_courtesy boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active plans (needed for onboarding)
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Super admins can view all plans
CREATE POLICY "Super admins can view all plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage plans
CREATE POLICY "Super admins can manage plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_subscription_plans
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.subscription_plans (code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active)
VALUES
  ('start', 'Start', 'Agenda e operacao essencial', 19900, 30, 0, false, true),
  ('pro', 'Pro', 'Agenda + automacoes + financeiro', 39900, 30, 0, false, true),
  ('signature', 'Signature', 'Operacao completa com controle premium', 79900, 30, 0, false, true),
  ('courtesy', 'Cortesia', '21 dias de cortesia assistida para onboarding', 0, 30, 21, true, true)
ON CONFLICT (code) DO NOTHING;
