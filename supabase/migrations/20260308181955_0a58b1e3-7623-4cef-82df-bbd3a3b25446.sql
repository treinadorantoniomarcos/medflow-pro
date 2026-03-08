
-- Fix: Restrict clinic creation to users who don't have a profile yet (onboarding only)
CREATE OR REPLACE FUNCTION public.user_has_no_profile(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Users can create clinic on onboarding" ON public.clinics;
CREATE POLICY "Users can create clinic on onboarding" ON public.clinics
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_no_profile(auth.uid()));
