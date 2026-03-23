
CREATE TABLE public.custom_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  full_address text,
  admin_count integer NOT NULL DEFAULT 1,
  professional_count integer NOT NULL DEFAULT 1,
  avg_clients integer NOT NULL DEFAULT 0,
  app_type text,
  additional_info text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can insert a quote request
CREATE POLICY "Anyone can insert quote requests"
  ON public.custom_quote_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Super admins can view all quote requests
CREATE POLICY "Super admins can view all quote requests"
  ON public.custom_quote_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update quote requests
CREATE POLICY "Super admins can update quote requests"
  ON public.custom_quote_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Updated at trigger
CREATE TRIGGER set_updated_at_custom_quote_requests
  BEFORE UPDATE ON public.custom_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
