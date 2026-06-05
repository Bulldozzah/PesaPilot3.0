REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

CREATE POLICY "user_roles_no_user_insert" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);

CREATE POLICY "user_roles_no_user_update" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "user_roles_no_user_delete" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);