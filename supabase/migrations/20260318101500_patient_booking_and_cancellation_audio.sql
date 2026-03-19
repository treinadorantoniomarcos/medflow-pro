alter table public.appointments
  add column if not exists cancellation_audio_note_path text;
