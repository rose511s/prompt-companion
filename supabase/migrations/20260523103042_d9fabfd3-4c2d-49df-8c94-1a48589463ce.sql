
-- prompt_versions
CREATE TABLE public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  framework text,
  is_public boolean NOT NULL DEFAULT false,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now(),
  change_note text,
  UNIQUE (prompt_id, version_number)
);
CREATE INDEX idx_prompt_versions_prompt ON public.prompt_versions(prompt_id, version_number DESC);

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View versions of accessible prompts" ON public.prompt_versions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.prompts p
    WHERE p.id = prompt_versions.prompt_id
      AND (p.is_public = true OR p.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'editor')
           OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE OR REPLACE FUNCTION public.snapshot_prompt_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.prompt_versions WHERE prompt_id = OLD.id;
  INSERT INTO public.prompt_versions(
    prompt_id, version_number, title, description, content,
    category, tags, framework, is_public, edited_by, change_note
  ) VALUES (
    OLD.id, next_version, OLD.title, OLD.description, OLD.content,
    OLD.category, OLD.tags, OLD.framework, OLD.is_public,
    COALESCE(auth.uid(), OLD.user_id),
    current_setting('app.change_note', true)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER prompts_snapshot_before_update
BEFORE UPDATE ON public.prompts
FOR EACH ROW
WHEN (
  OLD.title IS DISTINCT FROM NEW.title OR
  OLD.description IS DISTINCT FROM NEW.description OR
  OLD.content IS DISTINCT FROM NEW.content OR
  OLD.category IS DISTINCT FROM NEW.category OR
  OLD.tags IS DISTINCT FROM NEW.tags OR
  OLD.framework IS DISTINCT FROM NEW.framework OR
  OLD.is_public IS DISTINCT FROM NEW.is_public
)
EXECUTE FUNCTION public.snapshot_prompt_version();

DROP POLICY IF EXISTS "Update own prompts" ON public.prompts;
CREATE POLICY "Update own or as editor/admin" ON public.prompts
FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'editor')
  OR public.has_role(auth.uid(), 'admin')
);

-- audit_logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- chat_messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own chat messages" ON public.chat_messages
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Insert own chat messages" ON public.chat_messages
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own chat messages" ON public.chat_messages
FOR DELETE TO authenticated USING (user_id = auth.uid());
