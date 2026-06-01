import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, FRAMEWORKS, extractPlaceholders, fillPlaceholders, PLACEHOLDER_REGEX } from "@/lib/prompt-utils";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const TEMPLATES: Record<string, string> = {
  "CO-STAR":
`# CONTEXT
[Describe the situation]

# OBJECTIVE
Your task is to [GOAL].

# STYLE
[Writing style — e.g. concise, technical]

# TONE
[Tone — e.g. friendly, formal]

# AUDIENCE
[Who will read this — e.g. senior engineers]

# RESPONSE
Format your answer as [FORMAT].`,
  "Few-Shot":
`You are a [ROLE].

Examples:
Input: [EXAMPLE_INPUT_1]
Output: [EXAMPLE_OUTPUT_1]

Input: [EXAMPLE_INPUT_2]
Output: [EXAMPLE_OUTPUT_2]

Now:
Input: [USER_INPUT]
Output:`,
  "Chain-of-Thought":
`Solve the following step-by-step. Show your reasoning before giving the final answer.

Problem: [PROBLEM]

Steps:
1.`,
  "ReAct":
`You are an agent that can Think, then Act, then Observe.

Task: [TASK]

Thought:`,
  "Custom": "",
};

export type PromptValues = {
  title: string;
  description: string | null;
  content: string;
  category: string;
  framework: string | null;
  tags: string[];
  is_public: boolean;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  sample_input: string | null;
  sample_output: string | null;
  why_it_works: string | null;
};

export function PromptEditor({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<PromptValues>;
  submitLabel: string;
  onSubmit: (v: PromptValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [framework, setFramework] = useState(initial?.framework ?? FRAMEWORKS[0]);
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [difficulty, setDifficulty] = useState<PromptValues["difficulty"]>(initial?.difficulty ?? "Intermediate");
  const [sampleInput, setSampleInput] = useState(initial?.sample_input ?? "");
  const [sampleOutput, setSampleOutput] = useState(initial?.sample_output ?? "");
  const [whyItWorks, setWhyItWorks] = useState(initial?.why_it_works ?? "");
  const [busy, setBusy] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  const placeholders = useMemo(() => extractPlaceholders(content), [content]);
  const filled = useMemo(() => fillPlaceholders(content, previewValues), [content, previewValues]);
  const charCount = content.length;
  const approxTokens = Math.round(content.length / 4);

  const highlighted = useMemo(
    () =>
      content.split(/(\[[A-Z0-9_]+\])/g).map((p, i) =>
        PLACEHOLDER_REGEX.test(p)
          ? <span key={i} className="placeholder-token">{p.slice(1, -1)}</span>
          : <span key={i}>{p}</span>,
      ),
    [content],
  );

  function insertTemplate(name: string) {
    const tpl = TEMPLATES[name];
    if (!tpl) return;
    if (content.trim() && !confirm("Replace current content with template?")) return;
    setContent(tpl);
    setFramework(name);
    toast.success(`${name} template inserted`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description?.toString().trim() || null,
        content,
        category,
        framework,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_public: isPublic,
        difficulty,
        sample_input: sampleInput.trim() || null,
        sample_output: sampleOutput.trim() || null,
        why_it_works: whyItWorks.trim() || null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="p-6 shadow-card lg:col-span-3 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Production Incident Triage" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Input id="desc" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Framework</Label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as PromptValues["difficulty"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">🟢 Beginner</SelectItem>
                <SelectItem value="Intermediate">🟡 Intermediate</SelectItem>
                <SelectItem value="Advanced">🔴 Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kubernetes, debugging" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label htmlFor="content">Prompt content</Label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-2">Insert template:</span>
              {Object.keys(TEMPLATES).filter((k) => k !== "Custom").map((k) => (
                <button
                  type="button" key={k} onClick={() => insertTemplate(k)}
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-border hover:border-primary hover:text-primary"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            id="content" required value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Use [BRACKETED_VARIABLES] for inputs your teammates fill in."
            className="font-mono text-sm min-h-80"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{charCount} chars · ~{approxTokens} tokens</span>
            {placeholders.length > 0 && (
              <span>{placeholders.length} variable{placeholders.length === 1 ? "" : "s"}</span>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <h3 className="text-sm font-semibold">Worked example <span className="text-muted-foreground font-normal">(optional, recommended)</span></h3>
            <p className="text-xs text-muted-foreground">Help users understand the prompt by showing a realistic input + output.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sample_input">Sample input</Label>
            <Textarea
              id="sample_input" value={sampleInput} onChange={(e) => setSampleInput(e.target.value)}
              placeholder="Example values filled into the variables…"
              className="font-mono text-xs min-h-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sample_output">Expected output</Label>
            <Textarea
              id="sample_output" value={sampleOutput} onChange={(e) => setSampleOutput(e.target.value)}
              placeholder="What a good AI response looks like…"
              className="font-mono text-xs min-h-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="why">Why this works</Label>
            <Textarea
              id="why" value={whyItWorks} onChange={(e) => setWhyItWorks(e.target.value)}
              placeholder="1–2 sentences on the framework choice and what makes this prompt effective."
              className="text-sm min-h-20"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <Label htmlFor="pub" className="text-base">Visible to team</Label>
            <p className="text-xs text-muted-foreground">Off = private to you only.</p>
          </div>
          <Switch id="pub" checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="submit" disabled={busy || !title.trim() || !content.trim()} className="gradient-primary text-primary-foreground border-0">
            {busy ? "Saving…" : submitLabel}
          </Button>
        </div>
      </Card>

      <Card className="p-6 shadow-card lg:col-span-2 space-y-4 h-fit sticky top-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Live preview</h2>
        </div>
        {placeholders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Try variables:</p>
            {placeholders.slice(0, 5).map((p) => (
              <Input
                key={p}
                value={previewValues[p] ?? ""}
                onChange={(e) => setPreviewValues({ ...previewValues, [p]: e.target.value })}
                placeholder={p}
                className="text-xs font-mono"
              />
            ))}
          </div>
        )}
        <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border max-h-[500px] overflow-auto">
          {Object.keys(previewValues).length > 0 ? filled : (content ? highlighted : "Your prompt preview will appear here…")}
        </pre>
      </Card>
    </form>
  );
}
