-- 1. api_keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX api_keys_user_idx ON public.api_keys(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Insert own api keys" ON public.api_keys
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Only allow updates to set revoked_at (revoke); block changing other fields by app convention.
CREATE POLICY "Revoke own api keys" ON public.api_keys
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own api keys" ON public.api_keys
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. api_key_usage
CREATE TABLE public.api_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_key_usage_key_time_idx ON public.api_key_usage(api_key_id, created_at DESC);

GRANT SELECT ON public.api_key_usage TO authenticated;
GRANT ALL ON public.api_key_usage TO service_role;

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View usage of own keys" ON public.api_key_usage
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_keys k
    WHERE k.id = api_key_usage.api_key_id AND k.user_id = auth.uid()
  ));

CREATE POLICY "Deny usage insert from clients" ON public.api_key_usage
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny usage update" ON public.api_key_usage
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny usage delete" ON public.api_key_usage
  FOR DELETE TO authenticated USING (false);

-- 3. Allow `api.call` in analytics_events allowlist
CREATE OR REPLACE FUNCTION public.validate_analytics_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_name NOT IN (
    'prompt.copy','prompt.view','prompt.favorite','prompt.unfavorite',
    'prompt.create','signup','login','search','api.call'
  ) THEN
    RAISE EXCEPTION 'Invalid event_name: %', NEW.event_name;
  END IF;
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$function$;