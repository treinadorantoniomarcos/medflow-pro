
-- Create agenda-audios bucket for availability blocks and slot overrides audio notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenda-audios', 'agenda-audios', false)
ON CONFLICT (id) DO NOTHING;

-- Add audio columns to professional_availability_blocks
ALTER TABLE public.professional_availability_blocks
ADD COLUMN IF NOT EXISTS audio_note_path text;

-- Add audio columns to professional_slot_overrides
ALTER TABLE public.professional_slot_overrides
ADD COLUMN IF NOT EXISTS audio_note_path text;

-- Storage policies for agenda-audios bucket
-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload agenda audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agenda-audios');

-- Users can view agenda audios from their tenant
CREATE POLICY "Authenticated users can read agenda audios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agenda-audios');
