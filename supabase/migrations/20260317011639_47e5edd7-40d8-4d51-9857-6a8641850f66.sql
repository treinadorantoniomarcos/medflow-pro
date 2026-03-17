
-- =============================================
-- Migration: message attachments columns
-- =============================================

-- Add attachment columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_mime_type text;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments bucket
CREATE POLICY "Authenticated users can upload message attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can view message attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments');
