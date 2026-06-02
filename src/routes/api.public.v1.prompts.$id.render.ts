import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  recordUsage,
} from "@/lib/api-auth.server";
import { extractPlaceholders, fillPlaceholders } from "@/lib/prompt-utils";

const ENDPOINT = "/api/public/v1/prompts/:id/render";

const BodySchema = z.object({
  variables: z.record(z.string().min(1).max(80), z.string().max(4000)).default({}),
});

export const Route = createFileRoute("/api/public/v1/prompts/$id/render")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await authenticateRequest(request);
        if (!auth.ok) return errorResponse(auth.status, auth.error);

        let body: unknown = {};
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : {};
        } catch {
          await recordUsage(auth.key.id, ENDPOINT, 400);
          return errorResponse(400, "Invalid JSON body");
        }

        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          await recordUsage(auth.key.id, ENDPOINT, 400);
          return errorResponse(400, parsed.error.message);
        }

        const { data, error } = await supabaseAdmin
          .from("prompts")
          .select("id, title, content")
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

        const placeholders = extractPlaceholders(data.content);
        const rendered = fillPlaceholders(data.content, parsed.data.variables);
        const missing = placeholders.filter(
          (p) => !parsed.data.variables[p]?.trim(),
        );

        await recordUsage(auth.key.id, ENDPOINT, 200);
        return jsonResponse({
          id: data.id,
          title: data.title,
          rendered,
          placeholders,
          missing,
        });
      },
    },
  },
});
