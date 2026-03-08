
-- Update complete_onboarding to accept and save slug
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _clinic_id uuid,
  _clinic_name text,
  _full_name text,
  _phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _slug text;
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

  -- Generate slug from clinic name
  _slug := lower(regexp_replace(btrim(_clinic_name), '[^a-zA-Z0-9]+', '-', 'g'));
  _slug := regexp_replace(_slug, '^-|-$', '', 'g');
  
  -- Ensure unique slug
  IF EXISTS (SELECT 1 FROM public.clinics WHERE slug = _slug) THEN
    _slug := _slug || '-' || substr(_clinic_id::text, 1, 8);
  END IF;

  INSERT INTO public.clinics (id, name, slug)
  VALUES (_clinic_id, btrim(_clinic_name), _slug);

  INSERT INTO public.profiles (user_id, tenant_id, full_name, phone)
  VALUES (_user_id, _clinic_id, btrim(_full_name), NULLIF(btrim(COALESCE(_phone, '')), ''));

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _clinic_id, 'owner');

  RETURN jsonb_build_object(
    'ok', true,
    'tenant_id', _clinic_id,
    'slug', _slug
  );
END;
$$;
