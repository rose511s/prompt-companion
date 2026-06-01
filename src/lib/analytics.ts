import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "prompt.copy"
  | "prompt.view"
  | "prompt.favorite"
  | "prompt.unfavorite"
  | "prompt.create"
  | "signup"
  | "login"
  | "search";

/**
 * Fire-and-forget analytics tracking. RLS + the validate_analytics_event
 * trigger enforce that user_id == auth.uid() and that event_name is in the
 * allowlist, so we don't need to pass user_id from the client.
 */
export function track(
  event_name: AnalyticsEvent,
  opts: { entity_type?: string; entity_id?: string; metadata?: Record<string, unknown> } = {},
) {
  void supabase
    .from("analytics_events")
    .insert({
      event_name,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
      metadata: (opts.metadata ?? {}) as never,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[analytics] failed:", error.message);
      }
    });
}
