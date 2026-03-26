update public.subscription_plans
set
  name = 'Degustação inicial',
  description = 'Operação essencial para um profissional iniciar a agenda online com organização e confirmação básica.',
  monthly_price_cents = 0,
  period_days = 30,
  trial_days = 21,
  is_courtesy = true,
  is_active = true,
  updated_at = now()
where code = 'courtesy';
