CREATE TABLE IF NOT EXISTS public.professional_slot_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_name text NOT NULL,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  is_available boolean NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, professional_user_id, slot_date, slot_time)
);

ALTER TABLE public.professional_slot_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view slot overrides in tenant"
  ON public.professional_slot_overrides
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Admins and professionals can manage slot overrides"
  ON public.professional_slot_overrides
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), 'owner'::public.app_role, tenant_id)
      OR public.has_tenant_role(auth.uid(), 'admin'::public.app_role, tenant_id)
      OR professional_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), 'owner'::public.app_role, tenant_id)
      OR public.has_tenant_role(auth.uid(), 'admin'::public.app_role, tenant_id)
      OR professional_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_slot_overrides_tenant_date
  ON public.professional_slot_overrides (tenant_id, slot_date, professional_name);

CREATE INDEX IF NOT EXISTS idx_slot_overrides_professional
  ON public.professional_slot_overrides (professional_user_id, slot_date);

DROP TRIGGER IF EXISTS trg_slot_overrides_updated_at ON public.professional_slot_overrides;
CREATE TRIGGER trg_slot_overrides_updated_at
  BEFORE UPDATE ON public.professional_slot_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
