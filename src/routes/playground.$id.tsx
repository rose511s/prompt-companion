import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Copy, Sparkles, Wand2 } from "lucide-react";
import { extractPlaceholders, fillPlaceholders } from "@/lib/prompt-utils";
import { PLAYGROUND_MODELS, runPrompt } from "@/lib/playground.functions";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export const Route = createFileRoute("/playground/$id")({
  head: () => ({ meta: [{ title: "Playground — Prompt Directory" }] }),
  component: () => <RequireAuth><PlaygroundPage /></RequireAuth>,
});

function PlaygroundPage() {
  const { id } = Route.useParams();
  const run = useServerFn(runPrompt);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [model, setModel] = useState<typeof PLAYGROUND_MODELS[number]>("google/gemini-2.5-flash");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [meta, setMeta] = useState<{ latency_ms: number; tokens?: number | null } | null>(null);
  const [error, setError] = useState<{ message: string; retryable?: boolean } | null>(null);

  useEffect(() => {
    void supabase.from("prompts").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => {
        setPrompt(data);
        if (data?.sample_input) {
          // Best-effort: prefill the first placeholder with sample_input
          const ph = extractPlaceholders(data.content);
          if (ph.length === 1) setValues({ [ph[0]]: data.sample_input });
        }
      });
  }, [id]);

  const placeholders = useMemo(() => prompt ? extractPlaceholders(prompt.content) : [], [prompt]);
  const rendered = useMemo(() => prompt ? fillPlaceholders(prompt.content, values) : "", [prompt, values]);
  const missing = placeholders.filter((p) => !values[p]?.trim());

  async function onRun() {
    if (!prompt || missing.length > 0) return;
    setLoading(true);
    setError(null);
    setOutput("");
    setMeta(null);
    try {
      const result = await run({ data: { prompt: rendered, model } });
      if (!result.ok) {
        setError({ message: result.error, retryable: "retryable" in result ? result.retryable : false });
      } else {
        setOutput(result.reply);
        setMeta({ latency_ms: result.latency_ms, tokens: result.usage?.total_tokens ?? null });
        track("prompt.view", { entity_type: "prompt", entity_id: prompt.id, metadata: { source: "playground", model } });
      }
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Failed to run prompt", retryable: true });
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success("Output copied");
  }

  if (!prompt) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/prompt/$id" params={{ id: prompt.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Back to prompt
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
          <Badge className="gap-1"><Sparkles className="size-3" /> Playground</Badge>
          <Badge variant="secondary">{prompt.category}</Badge>
          {prompt.framework && <Badge variant="outline">{prompt.framework}</Badge>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{prompt.title}</h1>
        {prompt.description && <p className="text-muted-foreground mt-2">{prompt.description}</p>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Inputs</h2>
            <Select value={model} onValueChange={(v) => setModel(v as typeof model)}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYGROUND_MODELS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {placeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground">This prompt has no variables — just hit Run.</p>
          ) : (
            <div className="space-y-3">
              {placeholders.map((p) => {
                const long = (values[p]?.length ?? 0) > 80 || /CODE|TEXT|CONTEXT|INPUT|MESSAGE|DESCRIPTION/.test(p);
                return (
                  <div key={p} className="space-y-1.5">
                    <Label htmlFor={`pg-${p}`} className="font-mono text-xs">{p}</Label>
                    {long ? (
                      <Textarea
                        id={`pg-${p}`}
                        rows={4}
                        value={values[p] ?? ""}
                        onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                      />
                    ) : (
                      <Input
                        id={`pg-${p}`}
                        value={values[p] ?? ""}
                        onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
              {prompt.sample_input && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (placeholders.length === 1) {
                      setValues({ [placeholders[0]]: prompt.sample_input! });
                      toast.success("Sample input loaded");
                    } else {
                      toast.info("Sample input available — paste it into the most relevant variable.");
                    }
                  }}
                >
                  <Wand2 className="size-3.5 mr-1" /> Load sample input
                </Button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Rendered prompt</h3>
            <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border max-h-48 overflow-auto">
              {rendered}
            </pre>
          </div>

          <Button
            onClick={onRun}
            disabled={loading || missing.length > 0}
            className="w-full gradient-primary text-primary-foreground border-0"
          >
            <Play className="size-4 mr-1" />
            {loading ? "Running…" : missing.length > 0 ? `Fill ${missing.length} variable${missing.length === 1 ? "" : "s"}` : "Run prompt"}
          </Button>
        </Card>

        <Card className="p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Output</h2>
            {output && (
              <Button size="sm" variant="outline" onClick={copyOutput}>
                <Copy className="size-3.5 mr-1" /> Copy
              </Button>
            )}
          </div>

          {meta && (
            <div className="flex gap-2 flex-wrap text-[10px]">
              <Badge variant="secondary">{meta.latency_ms} ms</Badge>
              {meta.tokens != null && <Badge variant="secondary">{meta.tokens} tokens</Badge>}
              <Badge variant="outline" className="font-mono">{model}</Badge>
            </div>
          )}

          {error ? (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-2">
              <div>{error.message}</div>
              {error.retryable && (
                <Button size="sm" variant="outline" onClick={onRun} disabled={loading}>
                  <Play className="size-3.5 mr-1" /> Retry
                </Button>
              )}
            </div>
          ) : loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : output ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/40 p-4 rounded-md border border-border max-h-[600px] overflow-auto">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 border border-dashed border-border rounded-md p-6 text-center">
              Fill in any variables and press <strong>Run prompt</strong> to see live AI output.
            </div>
          )}

          {prompt.sample_output && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show expected sample output
              </summary>
              <pre className="font-mono whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border mt-2 max-h-64 overflow-auto">
                {prompt.sample_output}
              </pre>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
}
