alter table public.platform_settings
  add column if not exists affiliate_url text;

insert into public.platform_settings (id, checkout_url, plan_links, trial_url, affiliate_url)
values (
  1,
  null,
  '{}'::jsonb,
  null,
  'https://dashboard.kiwify.com/join/affiliate/ns119BD7'
)
on conflict (id) do update
set affiliate_url = coalesce(public.platform_settings.affiliate_url, excluded.affiliate_url);
