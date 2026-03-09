ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS audio_note_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('appointment-audios', 'appointment-audios', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Appointment audios tenant read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appointment-audios'
  AND split_part(name, '/', 1) = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Appointment audios tenant insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appointment-audios'
  AND split_part(name, '/', 1) = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Appointment audios tenant update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'appointment-audios'
  AND split_part(name, '/', 1) = get_user_tenant_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'appointment-audios'
  AND split_part(name, '/', 1) = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Appointment audios tenant delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appointment-audios'
  AND split_part(name, '/', 1) = get_user_tenant_id(auth.uid())::text
);
