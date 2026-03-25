update public.platform_settings
set plan_links =
  jsonb_set(
    coalesce(plan_links, '{}'::jsonb),
    '{pro}',
    to_jsonb('https://pay.kiwify.com.br/T9SzApY'::text),
    true
  )
where id = 1;
