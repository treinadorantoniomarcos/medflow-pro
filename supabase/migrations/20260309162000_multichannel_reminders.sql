ALTER TABLE public.notifications_queue
ADD COLUMN IF NOT EXISTS appointment_type text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_queue_unique_reminder
ON public.notifications_queue (appointment_id, channel, message_template, scheduled_for)
WHERE appointment_id IS NOT NULL;

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
  _channels text[];
  _channel text;
BEGIN
  -- Only appointments that can still happen keep reminders in queue.
  IF NEW.status NOT IN ('scheduled', 'confirmed') THEN
    DELETE FROM public.notifications_queue
    WHERE appointment_id = NEW.id
      AND status IN ('pending', 'ready');
    RETURN NEW;
  END IF;

  -- Skip updates that do not impact reminder scheduling/message content.
  IF TG_OP = 'UPDATE'
    AND OLD.status = NEW.status
    AND OLD.starts_at = NEW.starts_at
    AND COALESCE(OLD.type, '') = COALESCE(NEW.type, '') THEN
    RETURN NEW;
  END IF;

  SELECT settings INTO _settings
  FROM public.clinics
  WHERE id = NEW.tenant_id;

  _whatsapp_enabled := COALESCE((_settings->>'whatsapp_reminders_enabled')::boolean, false);
  _channels := ARRAY['app'];
  IF _whatsapp_enabled THEN
    _channels := array_append(_channels, 'whatsapp');
  END IF;

  -- Remove stale reminders (e.g. after reschedule) before re-queuing.
  DELETE FROM public.notifications_queue
  WHERE appointment_id = NEW.id
    AND status IN ('pending', 'ready');

  SELECT phone INTO _phone
  FROM public.patients
  WHERE tenant_id = NEW.tenant_id
    AND full_name = NEW.patient_name
  LIMIT 1;

  FOREACH _channel IN ARRAY _channels LOOP
    INSERT INTO public.notifications_queue (
      tenant_id,
      appointment_id,
      patient_name,
      patient_phone,
      professional_name,
      appointment_date,
      appointment_type,
      channel,
      message_template,
      scheduled_for
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.patient_name,
      _phone,
      NEW.professional_name,
      NEW.starts_at,
      NEW.type,
      _channel,
      'reminder_d1',
      NEW.starts_at - interval '24 hours'
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.notifications_queue (
      tenant_id,
      appointment_id,
      patient_name,
      patient_phone,
      professional_name,
      appointment_date,
      appointment_type,
      channel,
      message_template,
      scheduled_for
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.patient_name,
      _phone,
      NEW.professional_name,
      NEW.starts_at,
      NEW.type,
      _channel,
      'reminder_h2',
      NEW.starts_at - interval '2 hours'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_appointment_notification ON public.appointments;

CREATE TRIGGER trg_queue_appointment_notification
AFTER INSERT OR UPDATE OF status, starts_at, type ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.queue_appointment_notification();
