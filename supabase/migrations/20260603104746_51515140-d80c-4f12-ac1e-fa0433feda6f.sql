-- Fix: profiles should be readable by all authenticated users so author
-- attribution (display_name / avatar_url) works across the app.
CREATE POLICY "Authenticated users view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix: prevent editors from escalating privilege via the prompts UPDATE
-- policy. Editors can update public prompts (curation), but must not be
-- able to change ownership (user_id) or flip the is_public flag.
CREATE OR REPLACE FUNCTION public.guard_prompt_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner and admins keep full control.
  IF OLD.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Anyone else reaching this trigger is an editor acting on a public prompt.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Editors cannot change prompt ownership';
  END IF;
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    RAISE EXCEPTION 'Editors cannot change visibility of a prompt';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_prompt_update_trg ON public.prompts;
CREATE TRIGGER guard_prompt_update_trg
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.guard_prompt_update();