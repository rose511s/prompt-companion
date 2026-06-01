-- Tighten prompts UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Update own or as editor/admin" ON public.prompts;
CREATE POLICY "Update own or as editor/admin"
ON public.prompts
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'editor'::app_role) AND is_public = true)
)
WITH CHECK (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'editor'::app_role) AND is_public = true)
);

-- Tighten prompt_versions SELECT policy: editors only see versions of public prompts
DROP POLICY IF EXISTS "View versions of accessible prompts" ON public.prompt_versions;
CREATE POLICY "View versions of accessible prompts"
ON public.prompt_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_versions.prompt_id
      AND (
        p.is_public = true
        OR p.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);
