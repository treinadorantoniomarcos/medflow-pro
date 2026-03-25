update public.platform_settings
set plan_links =
  jsonb_set(
    jsonb_set(
      coalesce(plan_links, '{}'::jsonb),
      '{pro}',
      to_jsonb('https://pay.kiwify.com.br/T9SzApY'::text),
      true
    ),
    '{signature}',
    to_jsonb(coalesce(plan_links->>'signature', 'https://pay.kiwify.com.br/2GZhB9R')::text),
    true
  )
where id = 1
  and coalesce(plan_links->>'pro', '') = '';
