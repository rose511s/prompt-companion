import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listPromptVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ prompt_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS on prompt_versions limits visibility; use authed client.
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("prompt_versions")
      .select("*")
      .eq("prompt_id", data.prompt_id)
      .order("version_number", { ascending: false });
    if (error) throw new Error(error.message);
    return { versions: rows ?? [] };
  });

export const restorePromptVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt_id: z.string().uuid(),
        version_id: z.string().uuid(),
        change_note: z.string().max(280).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify user can edit the prompt (owner OR editor/admin).
    const [{ data: prompt, error: pErr }, { data: isEditor }, { data: isAdmin }] =
      await Promise.all([
        supabaseAdmin
          .from("prompts")
          .select("id, user_id")
          .eq("id", data.prompt_id)
          .maybeSingle(),
        supabaseAdmin.rpc("has_role", {
          _user_id: context.userId,
          _role: "editor",
        }),
        supabaseAdmin.rpc("has_role", {
          _user_id: context.userId,
          _role: "admin",
        }),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (!prompt) throw new Error("Prompt not found");
    const canEdit =
      prompt.user_id === context.userId ||
      !!isAdmin ||
      (!!isEditor && prompt.is_public === true);
    if (!canEdit) throw new Error("Forbidden");

    const { data: version, error: vErr } = await supabaseAdmin
      .from("prompt_versions")
      .select("*")
      .eq("id", data.version_id)
      .eq("prompt_id", data.prompt_id)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!version) throw new Error("Version not found");

    const { error: uErr } = await supabaseAdmin
      .from("prompts")
      .update({
        title: version.title,
        description: version.description,
        content: version.content,
        category: version.category,
        tags: version.tags,
        framework: version.framework,
        is_public: version.is_public,
      })
      .eq("id", data.prompt_id);
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.rpc("log_audit_event" as never, {
      _action: "prompt.restore",
      _entity_type: "prompt",
      _entity_id: data.prompt_id,
      _metadata: {
        restored_from_version: version.version_number,
        by: context.userId,
        change_note: data.change_note ?? null,
      },
    } as never);

    return { ok: true as const, restored_version: version.version_number };
  });
