
-- Drop the problematic ALL policy that blocks onboarding inserts
DROP POLICY IF EXISTS "Admins manage roles in tenant" ON public.user_roles;

-- Recreate as separate policies for SELECT, UPDATE, DELETE only
CREATE POLICY "Admins can update roles in tenant"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
    OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
  );

CREATE POLICY "Admins can delete roles in tenant"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
    OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
  );
