CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view error logs"
ON public.error_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny error log insert from clients"
ON public.error_logs FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny error log update"
ON public.error_logs FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "Deny error log delete"
ON public.error_logs FOR DELETE TO authenticated
USING (false);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_source ON public.error_logs (source);