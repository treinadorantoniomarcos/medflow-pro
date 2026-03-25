alter table public.platform_settings
  add column if not exists trial_url text;

update public.platform_settings
set trial_url = trial_url
where id = 1;

insert into public.platform_settings (id, checkout_url, plan_links, trial_url)
values (1, null, '{}'::jsonb, null)
on conflict (id) do update
set
  checkout_url = coalesce(excluded.checkout_url, public.platform_settings.checkout_url),
  plan_links = coalesce(public.platform_settings.plan_links, excluded.plan_links),
  trial_url = coalesce(excluded.trial_url, public.platform_settings.trial_url),
  updated_at = now();

drop policy if exists "Public can read platform settings" on public.platform_settings;
create policy "Public can read platform settings"
  on public.platform_settings
  for select
  using (true);

alter table public.subscription_plans
  drop constraint if exists subscription_plans_trial_days_check;

alter table public.subscription_plans
  add constraint subscription_plans_trial_days_check
    check (trial_days in (0, 21));

update public.subscription_plans
set
  description = case
    when code = 'start' then 'Agenda e operacao essencial com 21 dias de degustacao'
    when code = 'pro' then 'Agenda + automacoes + financeiro'
    when code = 'signature' then 'Operacao completa com controle premium'
    else description
  end,
  trial_days = case
    when code = 'start' then 21
    else 0
  end,
  is_active = case
    when code = 'courtesy' then false
    else is_active
  end,
  updated_at = now();

delete from public.subscription_plans
where code = 'courtesy';
