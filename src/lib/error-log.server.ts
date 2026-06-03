import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-only helper for recording runtime errors to the `error_logs` table.
 * Fire-and-forget: never throws — logging must not break the calling flow.
 */
export async function logServerError(
  source: string,
  message: string,
  context: Record<string, unknown> = {},
  userId?: string | null,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    await admin.from("error_logs").insert({
      source,
      message: message.slice(0, 2000),
      context,
      user_id: userId ?? null,
    });
  } catch (e) {
    console.error("[error-log] failed to record error:", e);
  }
  // Always echo to console for live debugging.
  console.error(`[${source}] ${message}`, context);
}
