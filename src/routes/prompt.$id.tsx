import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Star, Trash2, ArrowLeft, Lock, Globe } from "lucide-react";
import { extractPlaceholders, fillPlaceholders, PLACEHOLDER_REGEX } from "@/lib/prompt-utils";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export const Route = createFileRoute("/prompt/$id")({
  head: () => ({ meta: [{ title: "Prompt — Prompt Directory" }] }),
  component: () => <RequireAuth><DetailPage /></RequireAuth>,
});

function DetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [author, setAuthor] = useState<string>("");
  const [favorite, setFavorite] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => { void load(); }, [id]);

  async function load() {
    const { data } = await supabase.from("prompts").select("*").eq("id", id).maybeSingle();
    setPrompt(data);
    if (data) {
      track("prompt.view", { entity_type: "prompt", entity_id: data.id });
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", data.user_id).maybeSingle();
      setAuthor(prof?.display_name ?? "Unknown");
    }
    const { data: f } = await supabase.from("favorites").select("id").eq("prompt_id", id).maybeSingle();
    setFavorite(!!f);
  }

  const placeholders = useMemo(() => prompt ? extractPlaceholders(prompt.content) : [], [prompt]);
  const filled = useMemo(() => prompt ? fillPlaceholders(prompt.content, values) : "", [prompt, values]);

  async function copy(text: string, kind: "template" | "filled") {
    await navigator.clipboard.writeText(text);
    if (prompt) track("prompt.copy", { entity_type: "prompt", entity_id: prompt.id, metadata: { kind } });
    toast.success("Copied to clipboard");
  }

  async function toggleFav() {
    if (!user || !prompt) return;
    if (favorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("prompt_id", prompt.id);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, prompt_id: prompt.id });
    }
    setFavorite(!favorite);
  }

  async function del() {
    if (!prompt) return;
    if (!confirm("Delete this prompt?")) return;
    await supabase.from("prompts").delete().eq("id", prompt.id);
    toast.success("Deleted");
    nav({ to: "/library" });
  }

  if (!prompt) return <div className="p-8">Loading…</div>;

  const isOwner = user?.id === prompt.user_id;
  const highlighted = prompt.content.split(/(\[[A-Z0-9_]+\])/g).map((p, i) =>
    PLACEHOLDER_REGEX.test(p)
      ? <span key={i} className="placeholder-token">{p.slice(1, -1)}</span>
      : <span key={i}>{p}</span>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-4" /> Back to library
      </Link>

      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
            <Badge>{prompt.category}</Badge>
            <Badge variant="secondary">
              {prompt.difficulty === "Beginner" ? "🟢" : prompt.difficulty === "Advanced" ? "🔴" : "🟡"} {prompt.difficulty}
            </Badge>
            {prompt.framework && <Badge variant="outline">{prompt.framework}</Badge>}
            <span className="text-muted-foreground flex items-center gap-1">
              {prompt.is_public ? <><Globe className="size-3" /> Team-visible</> : <><Lock className="size-3" /> Private</>}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{prompt.title}</h1>
          {prompt.description && <p className="text-muted-foreground mt-2">{prompt.description}</p>}
          <p className="text-xs text-muted-foreground mt-3">By {author}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={toggleFav}>
            <Star className={`size-4 ${favorite ? "fill-primary text-primary" : ""}`} />
          </Button>
          <Link to="/prompt/$id/history" params={{ id: prompt.id }}>
            <Button variant="outline" size="sm">History</Button>
          </Link>
          {isOwner && (
            <>
              <Link to="/prompt/$id/edit" params={{ id: prompt.id }}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
              <Button variant="outline" size="icon" onClick={del}>
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </header>

      <Tabs defaultValue="template" className="w-full">
        <TabsList>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="fill" disabled={placeholders.length === 0}>
            Fill variables {placeholders.length > 0 && `(${placeholders.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Raw template</h2>
              <Button size="sm" variant="outline" onClick={() => copy(prompt.content, "template")}>
                <Copy className="size-3.5 mr-1" /> Copy template
              </Button>
            </div>
            <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 p-4 rounded-md border border-border">
              {highlighted}
            </pre>
            {prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-border">
                {prompt.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>)}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fill">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-6 shadow-card">
              <h2 className="text-sm font-medium mb-4">Variables</h2>
              <div className="space-y-3">
                {placeholders.map((p) => (
                  <div key={p} className="space-y-1.5">
                    <Label htmlFor={p} className="font-mono text-xs">{p}</Label>
                    <Input id={p} value={values[p] ?? ""} onChange={(e) => setValues({ ...values, [p]: e.target.value })} />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">Final prompt</h2>
                <Button size="sm" onClick={() => copy(filled, "filled")} className="gradient-primary text-primary-foreground border-0">
                  <Copy className="size-3.5 mr-1" /> Copy
                </Button>
              </div>
              <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 p-4 rounded-md border border-border max-h-[600px] overflow-auto">
                {filled}
              </pre>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {(prompt.why_it_works || prompt.sample_input || prompt.sample_output) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {prompt.why_it_works && (
            <Card className="p-6 shadow-card lg:col-span-2">
              <h2 className="text-sm font-semibold mb-2">Why this works</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{prompt.why_it_works}</p>
            </Card>
          )}
          {prompt.sample_input && (
            <Card className="p-6 shadow-card">
              <h2 className="text-sm font-semibold mb-2">Sample input</h2>
              <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border max-h-80 overflow-auto">
                {prompt.sample_input}
              </pre>
            </Card>
          )}
          {prompt.sample_output && (
            <Card className="p-6 shadow-card">
              <h2 className="text-sm font-semibold mb-2">Expected output</h2>
              <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border max-h-80 overflow-auto">
                {prompt.sample_output}
              </pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
