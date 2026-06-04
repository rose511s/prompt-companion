import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  recordUsage,
} from "@/lib/api-auth.server";
import { logServerError } from "@/lib/error-log.server";

const ENDPOINT = "/api/public/v1/prompts/:id";

export const Route = createFileRoute("/api/public/v1/prompts/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await authenticateRequest(request);
        if (!auth.ok) return errorResponse(auth.status, auth.error);

        const { data, error } = await supabaseAdmin
          .from("prompts")
          .select(
            "id, title, description, content, category, tags, framework, difficulty, sample_input, sample_output, why_it_works, created_at, updated_at",
          )
          .eq("id", params.id)
          .eq("is_public", true)
          .maybeSingle();
        if (error) {
          await recordUsage(auth.key.id, ENDPOINT, 500);
          return errorResponse(500, error.message);
        }
        if (!data) {
          await recordUsage(auth.key.id, ENDPOINT, 404);
          return errorResponse(404, "Prompt not found");
        }

        await recordUsage(auth.key.id, ENDPOINT, 200);
        return jsonResponse({ prompt: data });
      },
    },
  },
});
