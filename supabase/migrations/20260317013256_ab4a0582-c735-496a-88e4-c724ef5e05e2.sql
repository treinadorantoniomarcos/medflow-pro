ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS recipient_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipient_name text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages (sender_id, recipient_id);