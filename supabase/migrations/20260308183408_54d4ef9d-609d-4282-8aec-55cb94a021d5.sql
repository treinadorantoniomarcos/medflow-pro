
-- Create patients table
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.clinics(id),
  full_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  cpf text,
  address text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tenant patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'professional'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'receptionist'::app_role, tenant_id)
    )
  );

CREATE POLICY "Staff can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'professional'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'receptionist'::app_role, tenant_id)
    )
  );

-- updated_at trigger
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
