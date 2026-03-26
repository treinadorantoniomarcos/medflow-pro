-- Allow tenant staff to delete patients so the list updates after removal.
CREATE POLICY "Staff can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'professional'::app_role, tenant_id)
      OR has_tenant_role(auth.uid(), 'receptionist'::app_role, tenant_id)
    )
  );
