
-- ===========================================
-- MedFlux Pro: Schema Multitenant com RLS
-- ===========================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'professional', 'receptionist', 'patient');

-- 2. Enum de status de appointment
CREATE TYPE public.appointment_status AS ENUM (
  'agendada', 'confirmada', 'em_atendimento', 'concluida',
  'no_show', 'cancelada', 'remarcada', 'disponivel'
);

-- 3. Tabela clinics (tenants)
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 4. Tabela profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Tabela user_roles (separada conforme boas práticas)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  UNIQUE (user_id, role, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Tabela appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_user_id UUID REFERENCES auth.users(id),
  professional_name TEXT NOT NULL,
  professional_user_id UUID REFERENCES auth.users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status appointment_status NOT NULL DEFAULT 'agendada',
  type TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 7. Tabela audit_logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Security Definer Functions (evita recursão RLS)
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _role app_role, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND tenant_id = _tenant_id
  );
$$;

-- ===========================================
-- RLS Policies (Multitenant)
-- ===========================================

-- clinics
CREATE POLICY "Users see own clinic" ON public.clinics
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins/owners can update clinic" ON public.clinics
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), 'admin', id) OR
    public.has_tenant_role(auth.uid(), 'owner', id)
  );

-- profiles
CREATE POLICY "Users see profiles in own tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- user_roles
CREATE POLICY "Users see roles in own tenant" ON public.user_roles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins manage roles in tenant" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), 'admin', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'owner', tenant_id)
  );

-- appointments
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

-- audit_logs
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

-- ===========================================
-- Triggers para updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Indexes para performance
-- ===========================================

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_starts_at ON public.appointments(starts_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_professional ON public.appointments(professional_user_id);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
