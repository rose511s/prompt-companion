import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5",
] as const;

const inputSchema = z.object({
  prompt: z.string().min(1).max(20000),
  model: z.enum(MODELS).default("google/gemini-2.5-flash"),
});

export const PLAYGROUND_MODELS = MODELS;

export const runPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const started = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
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
      return { ok: false as const, error: "Rate limited. Try again in a moment." };
    }
    if (res.status === 402) {
      return { ok: false as const, error: "AI credits exhausted. Add credits in workspace settings." };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Playground AI error:", res.status, text);
      return { ok: false as const, error: "The AI gateway is unavailable right now." };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const reply = json.choices?.[0]?.message?.content ?? "";
    return {
      ok: true as const,
      reply,
      model: data.model,
      latency_ms: Date.now() - started,
      usage: json.usage ?? null,
    };
  });
