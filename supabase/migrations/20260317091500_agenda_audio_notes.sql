alter table public.professional_availability_blocks
  add column if not exists audio_note_path text;

alter table public.professional_slot_overrides
  add column if not exists audio_note_path text;

insert into storage.buckets (id, name, public)
values ('agenda-audios', 'agenda-audios', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can upload agenda audios" on storage.objects;
create policy "authenticated can upload agenda audios"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'agenda-audios');

drop policy if exists "authenticated can read agenda audios" on storage.objects;
create policy "authenticated can read agenda audios"
on storage.objects
for select
to authenticated
using (bucket_id = 'agenda-audios');
