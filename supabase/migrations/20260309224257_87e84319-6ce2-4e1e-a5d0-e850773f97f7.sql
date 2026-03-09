
-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.professional_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_user_id uuid NOT NULL,
  professional_name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_availability_blocks ENABLE ROW LEVEL SECURITY;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_availability_block_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be greater than start_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_block_dates ON public.professional_availability_blocks;
CREATE TRIGGER trg_validate_block_dates
  BEFORE INSERT OR UPDATE ON public.professional_availability_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_availability_block_dates();

-- RLS policies (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'professional_availability_blocks' AND policyname = 'Users can view availability blocks in tenant') THEN
    CREATE POLICY "Users can view availability blocks in tenant"
      ON public.professional_availability_blocks
      FOR SELECT
      TO authenticated
      USING (
        tenant_id = public.get_user_tenant_id(auth.uid())
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'professional_availability_blocks' AND policyname = 'Admins and professionals can manage availability blocks') THEN
    CREATE POLICY "Admins and professionals can manage availability blocks"
      ON public.professional_availability_blocks
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
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_availability_blocks_tenant_prof_start
  ON public.professional_availability_blocks (tenant_id, professional_user_id, start_at);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_tenant_range
  ON public.professional_availability_blocks (tenant_id, start_at, end_at);

DROP TRIGGER IF EXISTS trg_availability_blocks_updated_at ON public.professional_availability_blocks;
CREATE TRIGGER trg_availability_blocks_updated_at
  BEFORE UPDATE ON public.professional_availability_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
