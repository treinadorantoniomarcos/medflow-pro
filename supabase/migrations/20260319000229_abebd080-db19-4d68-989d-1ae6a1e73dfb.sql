-- Add cancellation audio column to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS cancellation_audio_note_path text;