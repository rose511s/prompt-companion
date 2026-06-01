-- 1. Analytics events
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_name text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Validate allowed event names to prevent log injection
CREATE OR REPLACE FUNCTION public.validate_analytics_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_name NOT IN (
    'prompt.copy','prompt.view','prompt.favorite','prompt.unfavorite',
    'prompt.create','signup','login','search'
  ) THEN
    RAISE EXCEPTION 'Invalid event_name: %', NEW.event_name;
  END IF;
  -- Force actor to be the calling user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_analytics_event_trigger
BEFORE INSERT ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.validate_analytics_event();

CREATE POLICY "Users insert own events"
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins view all events"
ON public.analytics_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deny analytics update"
ON public.analytics_events FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Deny analytics delete"
ON public.analytics_events FOR DELETE TO authenticated USING (false);

CREATE INDEX idx_analytics_events_event_created
  ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user
  ON public.analytics_events (user_id, created_at DESC);

-- 2. Prompt metadata: difficulty + worked example
ALTER TABLE public.prompts
  ADD COLUMN difficulty text NOT NULL DEFAULT 'Intermediate'
    CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  ADD COLUMN sample_input text,
  ADD COLUMN sample_output text,
  ADD COLUMN why_it_works text;

-- Backfill: anything categorized Beginner gets Beginner difficulty
UPDATE public.prompts SET difficulty = 'Beginner' WHERE category = 'Beginner';

CREATE INDEX idx_prompts_difficulty ON public.prompts (difficulty);