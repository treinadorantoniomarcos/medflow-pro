alter table public.platform_settings
  add column if not exists video_url text;

insert into public.platform_settings (id, checkout_url, plan_links, trial_url, affiliate_url, video_url)
values (
  1,
  null,
  '{}'::jsonb,
  null,
  'https://dashboard.kiwify.com/join/affiliate/ns119BD7',
  'https://drive.google.com/file/d/1DCiWfe7JuWROGNnVShKxpNGWBNbzgt5Z/view?usp=sharing'
)
on conflict (id) do update
set video_url = coalesce(public.platform_settings.video_url, excluded.video_url);
