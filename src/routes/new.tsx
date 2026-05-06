import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, FRAMEWORKS, extractPlaceholders } from "@/lib/prompt-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "New Prompt — Prompt Directory" }] }),
  component: () => <RequireAuth><NewPage /></RequireAuth>,
});

function NewPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [framework, setFramework] = useState<string>(FRAMEWORKS[0]);
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const placeholders = extractPlaceholders(content);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.from("prompts").insert({
      user_id: user.id,
      title, description: description || null, content,
      category, framework,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_public: isPublic,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Prompt saved");
    nav({ to: "/prompt/$id", params: { id: data.id } });
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">New Prompt</h1>
      <p className="text-muted-foreground mb-8">
        Wrap user inputs in <code className="placeholder-token">[BRACKETED_VARIABLES]</code> so teammates can fill them in.
      </p>

      <Card className="p-6 shadow-card">
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Production Incident Triage" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary of when to use this." />
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
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="kubernetes, debugging, postmortem" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Prompt content</Label>
            <Textarea
              id="content" required value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={"# CONTEXT\nYou are a [ROLE]...\n\n# OBJECTIVE\nHelp me [GOAL]..."}
              className="font-mono text-sm min-h-80"
            />
            {placeholders.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Detected variables:</span>
                {placeholders.map((p) => <span key={p} className="placeholder-token">{p}</span>)}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <Label htmlFor="pub" className="text-base">Visible to team</Label>
              <p className="text-xs text-muted-foreground">Off = private to you only.</p>
            </div>
            <Switch id="pub" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => nav({ to: "/library" })}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground border-0">
              {busy ? "Saving…" : "Save prompt"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
