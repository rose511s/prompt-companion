// Server-only: verifies bearer API keys for public REST endpoints.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RATE_LIMIT_PER_MINUTE = 60;

export type AuthedKey = {
  id: string;
  user_id: string;
};

export type AuthResult =
  | { ok: true; key: AuthedKey }
  | { ok: false; status: number; error: string };

function jsonHeaders(extra?: Record<string, string>) {
  return { "Content-Type": "application/json", ...(extra ?? {}) };
}

export function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders(),
  });
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const raw = header.slice(7).trim();
  if (!raw.startsWith("lvp_") || raw.length < 20 || raw.length > 200) {
    return { ok: false, status: 401, error: "Invalid token format" };
  }

  const key_hash = createHash("sha256").update(raw).digest("hex");

  const { data: key, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", key_hash)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "Auth lookup failed" };
  if (!key) return { ok: false, status: 401, error: "Invalid token" };
  if (key.revoked_at) return { ok: false, status: 401, error: "Token revoked" };

  // Per-key rate limit (rolling 60 seconds).
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("api_key_usage")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", key.id)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return { ok: false, status: 429, error: "Rate limit exceeded (60/min)" };
  }

  return { ok: true, key: { id: key.id, user_id: key.user_id } };
}

export async function recordUsage(
  keyId: string,
  endpoint: string,
  status: number,
) {
  await Promise.allSettled([
    supabaseAdmin.from("api_key_usage").insert({
      api_key_id: keyId,
      endpoint,
      status_code: status,
    }),
    supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId),
  ]);
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}
