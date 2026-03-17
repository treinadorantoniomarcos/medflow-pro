
-- =============================================
-- Migration: support_tickets + super admin password reset support
-- =============================================

-- 1) Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.clinics(id),
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  requester_email text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  super_admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS: users see own tenant tickets
CREATE POLICY "Users can view own tenant tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: users can create tickets in own tenant
CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND requester_id = auth.uid());

-- RLS: super_admin can view all tickets
CREATE POLICY "Super admins can view all tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- RLS: super_admin can update all tickets (respond)
CREATE POLICY "Super admins can update all tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
