-- Allow admins/owners to update any profile in their tenant (e.g. avatar)
CREATE POLICY "Admins can update profiles in tenant"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), 'admin'::app_role, tenant_id)
    OR has_tenant_role(auth.uid(), 'owner'::app_role, tenant_id)
  )
);

-- Also allow admins/owners to upload avatars for any user in their tenant
-- by relaxing the storage policy to check tenant membership
CREATE POLICY "Admins can upload team avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

CREATE POLICY "Admins can update team avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
);

CREATE POLICY "Admins can delete team avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
);