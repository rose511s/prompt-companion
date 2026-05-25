import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Allowlist of action values that clients are permitted to record. Privileged
// actions (role.change, prompt.restore, admin.*) are written only from
// server-side admin/versions flows and must NOT be accepted here.
const CLIENT_ACTIONS = [
  "prompt.create",
  "prompt.update",
  "prompt.delete",
  "prompt.favorite",
  "prompt.unfavorite",
] as const;

const ENTITY_TYPES = ["prompt"] as const;

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(CLIENT_ACTIONS),
        entity_type: z.enum(ENTITY_TYPES),
        entity_id: z.string().uuid(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify the caller actually owns the entity they're claiming to act on.
    // This prevents authenticated users from polluting the audit log with
    // fabricated entries about other users' resources.
    if (data.entity_type === "prompt") {
      const { data: row, error } = await supabaseAdmin
        .from("prompts")
        .select("user_id")
        .eq("id", data.entity_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row || row.user_id !== context.userId) {
        throw new Error("Forbidden: cannot log event for this entity");
      }
    }

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) {
      console.error("audit log insert failed", error);
    }
    return { ok: true as const };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[]),
    );
    let nameMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      nameMap = new Map(
        (profs ?? []).map((p) => [p.id, p.display_name ?? p.id.slice(0, 8)]),
      );
    }

    return {
      logs: (rows ?? []).map((r) => ({
        ...r,
        actor_name: r.actor_id ? (nameMap.get(r.actor_id) ?? "Unknown") : "System",
      })),
    };
  });
