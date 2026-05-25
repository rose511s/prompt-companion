-- 1) audit_logs: explicitly deny INSERT/UPDATE/DELETE for authenticated users
CREATE POLICY "Deny audit insert" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny audit update" ON public.audit_logs
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny audit delete" ON public.audit_logs
  FOR DELETE TO authenticated USING (false);

-- 2) prompt_versions: deny direct writes; trigger runs as SECURITY DEFINER and bypasses RLS
CREATE POLICY "Deny version insert" ON public.prompt_versions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny version update" ON public.prompt_versions
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny version delete" ON public.prompt_versions
  FOR DELETE TO authenticated USING (false);

-- 3) prompts: restrict editor UPDATE to public prompts only (admin retains full update)
DROP POLICY IF EXISTS "Update own or as editor/admin" ON public.prompts;
CREATE POLICY "Update own or as editor/admin"
  ON public.prompts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'editor'::app_role) AND is_public = true)
  );
