CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _clinic_id uuid,
  _clinic_name text,
  _full_name text,
  _phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF _clinic_name IS NULL OR btrim(_clinic_name) = '' THEN
    RAISE EXCEPTION 'clinic_name_required';
  END IF;

  IF _full_name IS NULL OR btrim(_full_name) = '' THEN
    RAISE EXCEPTION 'full_name_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'profile_already_exists';
  END IF;

  INSERT INTO public.clinics (id, name)
  VALUES (_clinic_id, btrim(_clinic_name));

  INSERT INTO public.profiles (user_id, tenant_id, full_name, phone)
  VALUES (_user_id, _clinic_id, btrim(_full_name), NULLIF(btrim(COALESCE(_phone, '')), ''));

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _clinic_id, 'owner');

  RETURN jsonb_build_object(
    'ok', true,
    'tenant_id', _clinic_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(uuid, text, text, text) TO authenticated;