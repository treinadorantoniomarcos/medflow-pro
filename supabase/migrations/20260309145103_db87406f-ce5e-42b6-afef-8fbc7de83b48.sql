
-- Add appointment_type column to notifications_queue
ALTER TABLE public.notifications_queue ADD COLUMN IF NOT EXISTS appointment_type text;

-- Replace the trigger function to generate 4 queue entries with dedup
CREATE OR REPLACE FUNCTION public.queue_appointment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _settings jsonb;
  _whatsapp_enabled boolean;
BEGIN
  -- Check if clinic has WhatsApp reminders enabled
  SELECT settings INTO _settings FROM public.clinics WHERE id = NEW.tenant_id;
  _whatsapp_enabled := COALESCE((_settings->>'whatsapp_reminders_enabled')::boolean, false);

  -- Only queue for 'scheduled' or 'confirmed' status
  IF NEW.status NOT IN ('scheduled', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- On UPDATE: skip if status and starts_at didn't change
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status AND OLD.starts_at = NEW.starts_at THEN
    RETURN NEW;
  END IF;

  -- On UPDATE (reschedule): delete old pending notifications for this appointment to avoid duplicates
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.notifications_queue
    WHERE appointment_id = NEW.id AND status = 'pending';
  END IF;

  -- Try to find patient phone
  SELECT phone INTO _phone
    FROM public.patients
    WHERE tenant_id = NEW.tenant_id AND full_name = NEW.patient_name
    LIMIT 1;

  -- Always insert app channel notifications (D-1 and H-2)
  INSERT INTO public.notifications_queue (
    tenant_id, appointment_id, patient_name, patient_phone,
    professional_name, appointment_date, appointment_type,
    channel, message_template, scheduled_for
  ) VALUES
    -- App D-1
    (NEW.tenant_id, NEW.id, NEW.patient_name, _phone,
     NEW.professional_name, NEW.starts_at, NEW.type,
     'app', 'reminder_d1', NEW.starts_at - interval '24 hours'),
    -- App H-2
    (NEW.tenant_id, NEW.id, NEW.patient_name, _phone,
     NEW.professional_name, NEW.starts_at, NEW.type,
     'app', 'reminder_h2', NEW.starts_at - interval '2 hours');

  -- Insert whatsapp channel only if enabled
  IF _whatsapp_enabled THEN
    INSERT INTO public.notifications_queue (
      tenant_id, appointment_id, patient_name, patient_phone,
      professional_name, appointment_date, appointment_type,
      channel, message_template, scheduled_for
    ) VALUES
      -- WhatsApp D-1
      (NEW.tenant_id, NEW.id, NEW.patient_name, _phone,
       NEW.professional_name, NEW.starts_at, NEW.type,
       'whatsapp', 'reminder_d1', NEW.starts_at - interval '24 hours'),
      -- WhatsApp H-2
      (NEW.tenant_id, NEW.id, NEW.patient_name, _phone,
       NEW.professional_name, NEW.starts_at, NEW.type,
       'whatsapp', 'reminder_h2', NEW.starts_at - interval '2 hours');
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS trg_queue_appointment_notification ON public.appointments;
CREATE TRIGGER trg_queue_appointment_notification
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_appointment_notification();
