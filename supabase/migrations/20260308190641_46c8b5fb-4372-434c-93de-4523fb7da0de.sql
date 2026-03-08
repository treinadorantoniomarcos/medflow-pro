
-- ===========================================
-- 1. notifications_queue table
-- ===========================================
CREATE TABLE public.notifications_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.clinics(id),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_phone text,
  professional_name text NOT NULL,
  appointment_date timestamp with time zone NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  message_template text NOT NULL DEFAULT 'reminder',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant notifications"
  ON public.notifications_queue FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "System can insert notifications"
  ON public.notifications_queue FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can update notifications"
  ON public.notifications_queue FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Index for processing pending notifications
CREATE INDEX idx_notifications_queue_pending
  ON public.notifications_queue (status, scheduled_for)
  WHERE status = 'pending';

-- updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.notifications_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 2. Trigger: auto-queue notification on appointment insert/update to 'scheduled'
-- ===========================================
CREATE OR REPLACE FUNCTION public.queue_appointment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _phone text;
  _settings jsonb;
  _whatsapp_enabled boolean;
BEGIN
  -- Check if clinic has WhatsApp reminders enabled
  SELECT settings INTO _settings FROM public.clinics WHERE id = NEW.tenant_id;
  _whatsapp_enabled := COALESCE((_settings->>'whatsapp_reminders_enabled')::boolean, false);

  IF NOT _whatsapp_enabled THEN
    RETURN NEW;
  END IF;

  -- Only queue for 'scheduled' or 'confirmed' status
  IF NEW.status NOT IN ('scheduled', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Skip if this is an update and status didn't change
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Try to find patient phone
  SELECT phone INTO _phone
    FROM public.patients
    WHERE tenant_id = NEW.tenant_id AND full_name = NEW.patient_name
    LIMIT 1;

  -- Insert notification into queue (scheduled 24h before appointment)
  INSERT INTO public.notifications_queue (
    tenant_id,
    appointment_id,
    patient_name,
    patient_phone,
    professional_name,
    appointment_date,
    scheduled_for
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.patient_name,
    _phone,
    NEW.professional_name,
    NEW.starts_at,
    NEW.starts_at - interval '24 hours'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_queue_appointment_notification
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_appointment_notification();
