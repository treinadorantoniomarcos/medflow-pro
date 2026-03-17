alter table public.messages
  add column if not exists recipient_id uuid,
  add column if not exists recipient_name text;
