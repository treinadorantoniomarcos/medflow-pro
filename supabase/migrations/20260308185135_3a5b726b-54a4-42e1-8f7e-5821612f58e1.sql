
-- Create messages table for team chat
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.clinics(id),
  sender_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users in the same tenant can read messages
CREATE POLICY "Users can view tenant messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Authenticated users can send messages to their tenant
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND sender_id = auth.uid()
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
