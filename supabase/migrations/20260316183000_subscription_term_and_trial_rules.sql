ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_period_days_check;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_trial_days_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_period_days_check
    CHECK (period_days = 365);

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_trial_days_check
    CHECK (trial_days IN (0, 7, 15, 30));

UPDATE public.subscription_plans
SET
  period_days = 365,
  trial_days = CASE
    WHEN code = 'courtesy' THEN 30
    WHEN trial_days IN (7, 15, 30) THEN trial_days
    ELSE 0
  END,
  updated_at = now();
