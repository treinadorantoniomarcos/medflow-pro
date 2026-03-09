
-- 1. Add audio_note_path column (idempotent)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS audio_note_path TEXT;

-- 2. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('appointment-audios', 'appointment-audios', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies with tenant isolation via path
CREATE POLICY "Authenticated users can upload audios to their tenant folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'appointment-audios'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Authenticated users can read audios from their tenant folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'appointment-audios'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Authenticated users can delete audios from their tenant folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'appointment-audios'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);
