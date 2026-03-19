alter table public.support_tickets
  add column if not exists requester_attachment_name text,
  add column if not exists requester_attachment_path text,
  add column if not exists requester_attachment_mime_type text,
  add column if not exists response_attachment_name text,
  add column if not exists response_attachment_path text,
  add column if not exists response_attachment_mime_type text;

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

drop policy if exists "authenticated can upload support attachments" on storage.objects;
create policy "authenticated can upload support attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'support-attachments');

drop policy if exists "authenticated can read support attachments" on storage.objects;
create policy "authenticated can read support attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'support-attachments');
