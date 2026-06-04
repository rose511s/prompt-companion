
-- Admin DELETE policy on prompts
CREATE POLICY "Admins can delete any prompt"
ON public.prompts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure guard trigger is attached (function already exists)
DROP TRIGGER IF EXISTS prompts_guard_update ON public.prompts;
CREATE TRIGGER prompts_guard_update
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.guard_prompt_update();
