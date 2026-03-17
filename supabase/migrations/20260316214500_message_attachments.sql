alter table public.messages
  add column if not exists attachment_name text,
  add column if not exists attachment_path text,
  add column if not exists attachment_mime_type text;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do nothing;

drop policy if exists "authenticated can upload message attachments" on storage.objects;
create policy "authenticated can upload message attachments"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'message-attachments');

drop policy if exists "authenticated can read message attachments" on storage.objects;
create policy "authenticated can read message attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'message-attachments');
