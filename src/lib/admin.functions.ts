import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["admin", "editor", "member"] as const;

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, display_name, created_at"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));

    return (profiles ?? [])
      .map((p) => ({
        id: p.id,
        display_name: p.display_name,
        created_at: p.created_at,
        role: roleMap.get(p.id) ?? "member",
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        target_user_id: z.string().uuid(),
        role: z.enum(ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.target_user_id === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }

    // Upsert role (table allows only one row per user_id, role).
    // Strategy: delete existing, insert new.
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.target_user_id);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.target_user_id, role: data.role });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin.rpc("log_audit_event" as never, {
      _action: "role.change",
      _entity_type: "user",
      _entity_id: data.target_user_id,
      _metadata: { new_role: data.role, by: context.userId },
    } as never);

    return { ok: true as const };
  });
