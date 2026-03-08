
-- ===========================================
-- Fix: Change RESTRICTIVE policies to PERMISSIVE
-- and add missing INSERT policies for onboarding
-- ===========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users see own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Admins/owners can update clinic" ON public.clinics;
DROP POLICY IF EXISTS "Users see profiles in own tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see roles in own tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles in tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Users see appointments in own tenant" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins see audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- ===========================================
-- Clinics: PERMISSIVE policies
-- ===========================================
CREATE POLICY "Users see own clinic" ON public.clinics
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins/owners can update clinic" ON public.clinics
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), 'admin', id) OR
    public.has_tenant_role(auth.uid(), 'owner', id)
  );

-- Allow authenticated users to create a clinic (onboarding)
CREATE POLICY "Users can create clinic on onboarding" ON public.clinics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===========================================
-- Profiles: PERMISSIVE policies
-- ===========================================
CREATE POLICY "Users see profiles in own tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- User Roles: PERMISSIVE policies
-- ===========================================
CREATE POLICY "Users see roles in own tenant" ON public.user_roles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR user_id = auth.uid());

-- Admins/owners manage roles
CREATE POLICY "Admins manage roles in tenant" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'owner', tenant_id)
  );

-- Allow users to insert their own initial role (onboarding)
CREATE POLICY "Users can insert own role on onboarding" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- Appointments: PERMISSIVE policies
-- ===========================================
CREATE POLICY "Users see appointments in own tenant" ON public.appointments
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

-- ===========================================
-- Audit Logs: PERMISSIVE policies
-- ===========================================
CREATE POLICY "Admins see audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) AND (
      public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
      public.has_tenant_role(auth.uid(), 'owner', tenant_id)
    )
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
