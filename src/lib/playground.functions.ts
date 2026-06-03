import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logServerError } from "./error-log.server";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5",
] as const;

const TIMEOUT_MS = 45_000;

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is empty").max(20000, "Prompt is too long (max 20k chars)"),
  model: z.enum(MODELS).default("google/gemini-2.5-flash"),
});

export const PLAYGROUND_MODELS = MODELS;

export const runPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      await logServerError("playground", "LOVABLE_API_KEY missing", { model: data.model }, context.userId);
      return { ok: false as const, error: "AI is not configured. Please contact an admin." };
    }

    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model,
          messages: [{ role: "user", content: data.prompt }],
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Rate limited. Please wait a moment and try again.", retryable: true };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. An admin needs to add credits in workspace settings." };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        await logServerError(
          "playground",
          `Gateway responded ${res.status}`,
          { model: data.model, body: text.slice(0, 500) },
          context.userId,
        );
        return {
          ok: false as const,
          error: `The AI gateway returned an error (${res.status}). Try a different model or try again shortly.`,
          retryable: true,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const reply = json.choices?.[0]?.message?.content ?? "";

      if (!reply.trim()) {
        await logServerError("playground", "Empty reply from gateway", { model: data.model }, context.userId);
        return {
          ok: false as const,
          error: "The model returned an empty response. Try rewording your inputs or switching models.",
          retryable: true,
        };
      }

      return {
        ok: true as const,
        reply,
        model: data.model,
        latency_ms: Date.now() - started,
        usage: json.usage ?? null,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      const message = aborted
        ? `Request timed out after ${TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : "Unknown network error";
      await logServerError("playground", message, { model: data.model, aborted }, context.userId);
      return {
        ok: false as const,
        error: aborted
          ? "The model took too long to respond. Try a faster model (Flash Lite) or shorten your inputs."
          : "Network error reaching the AI gateway. Please try again.",
        retryable: true,
      };
    } finally {
      clearTimeout(timer);
    }
  });
