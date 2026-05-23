import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().min(1).max(64),
        entity_type: z.string().min(1).max(64),
        entity_id: z.string().uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id ?? null,
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

    // Enrich with actor display names
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
