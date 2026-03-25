update public.platform_settings
set plan_links =
  jsonb_set(
    coalesce(plan_links, '{}'::jsonb),
    '{signature}',
    to_jsonb('https://pay.kiwify.com.br/2GZhB9R'::text),
    true
  )
where id = 1
  and coalesce(plan_links->>'signature', '') = '';
