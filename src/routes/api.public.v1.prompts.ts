import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  authenticateRequest,
  errorResponse,
  jsonResponse,
  recordUsage,
} from "@/lib/api-auth.server";
import { logServerError } from "@/lib/error-log.server";

const ENDPOINT = "/api/public/v1/prompts";

export const Route = createFileRoute("/api/public/v1/prompts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth.ok) return errorResponse(auth.status, auth.error);

        const url = new URL(request.url);
        const category = url.searchParams.get("category");
        const tag = url.searchParams.get("tag");
        const difficulty = url.searchParams.get("difficulty");
        const q = url.searchParams.get("q");
        const limit = Math.min(
          Math.max(Number(url.searchParams.get("limit")) || 25, 1),
          100,
        );
        const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

        let query = supabaseAdmin
          .from("prompts")
          .select(
            "id, title, description, category, tags, framework, difficulty, created_at, updated_at",
            { count: "exact" },
          )
          .eq("is_public", true)
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);
        if (difficulty) query = query.eq("difficulty", difficulty);
        if (tag) query = query.contains("tags", [tag]);
        if (q) query = query.ilike("title", `%${q}%`);

        const { data, error, count } = await query;
        if (error) {
          await recordUsage(auth.key.id, ENDPOINT, 500);
          return errorResponse(500, error.message);
        }

        await recordUsage(auth.key.id, ENDPOINT, 200);
        return jsonResponse({
          prompts: data ?? [],
          total: count ?? null,
          limit,
          offset,
        });
      },
    },
  },
});
