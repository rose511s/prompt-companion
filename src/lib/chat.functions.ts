import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

const SYSTEM_PROMPT = `You are the friendly in-app assistant for "Prompt Directory" — a curated library of gold-standard AI prompts for software development and DevOps.

Your job:
- Help users navigate the app: Library (browse prompts), Favorites (saved prompts), New Prompt (create one), README (reference), and the prompt detail page.
- Explain prompt engineering frameworks the app uses: CO-STAR (Context, Objective, Style, Tone, Audience, Response), Few-Shot examples, and Chain-of-Thought.
- Help users refine, fill in, or improve their own prompts.
- Answer general questions about the app concisely.

Style: warm, concise, use markdown (lists, **bold**, code blocks) when helpful. If a user pastes a prompt, give specific, actionable feedback.`;

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured." };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) {
      return { ok: false as const, error: "Too many requests right now. Please try again in a moment." };
    }
    if (res.status === 402) {
      return { ok: false as const, error: "AI credits exhausted. Please add credits in workspace settings." };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error:", res.status, text);
      return { ok: false as const, error: "The assistant is unavailable right now." };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { ok: true as const, reply };
  });
