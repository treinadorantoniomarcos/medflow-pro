
-- ===========================================
-- Migrate appointment_status enum values to English
-- ===========================================

-- 1. Drop all policies that reference the enum
DROP POLICY IF EXISTS "Users see appointments in own tenant" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;

-- 2. Change column type to text temporarily
ALTER TABLE public.appointments ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.appointments ALTER COLUMN status TYPE text USING status::text;

-- 3. Update values to English
UPDATE public.appointments SET status = 'scheduled' WHERE status = 'agendada';
UPDATE public.appointments SET status = 'confirmed' WHERE status = 'confirmada';
UPDATE public.appointments SET status = 'in_progress' WHERE status = 'em_atendimento';
UPDATE public.appointments SET status = 'completed' WHERE status = 'concluida';
UPDATE public.appointments SET status = 'no_show' WHERE status = 'no_show';
UPDATE public.appointments SET status = 'cancelled' WHERE status = 'cancelada';
UPDATE public.appointments SET status = 'rescheduled' WHERE status = 'remarcada';
UPDATE public.appointments SET status = 'available' WHERE status = 'disponivel';

-- 4. Drop old enum and create new one
DROP TYPE public.appointment_status;
CREATE TYPE public.appointment_status AS ENUM (
  'scheduled', 'confirmed', 'in_progress', 'completed',
  'no_show', 'cancelled', 'rescheduled', 'available'
);

-- 5. Convert back to enum
ALTER TABLE public.appointments ALTER COLUMN status TYPE appointment_status USING status::appointment_status;
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'scheduled';

-- 6. Recreate policies
CREATE POLICY "Users can view tenant appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can create appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND (
      public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'owner', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'professional', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'receptionist', tenant_id)
    )
  );

CREATE POLICY "Staff can update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND (
      public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'owner', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'professional', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'receptionist', tenant_id)
    )
  );
