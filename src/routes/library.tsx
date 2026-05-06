import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/prompt-utils";
import { PromptCard } from "@/components/PromptCard";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Prompt Directory" },
      { name: "description", content: "Browse the gold-standard prompt library." },
    ],
  }),
  component: () => <RequireAuth><LibraryPage /></RequireAuth>,
});

function LibraryPage() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "mine">("all");

  useEffect(() => {
    void load();
  }, [user]);

  async function load() {
    const { data: p } = await supabase.from("prompts").select("*").order("updated_at", { ascending: false });
    const { data: f } = await supabase.from("favorites").select("prompt_id");
    setPrompts(p ?? []);
    setFavorites(new Set((f ?? []).map((x) => x.prompt_id)));
  }

  async function toggleFav(id: string) {
    if (!user) return;
    if (favorites.has(id)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("prompt_id", id);
      const n = new Set(favorites); n.delete(id); setFavorites(n);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, prompt_id: id });
      setFavorites(new Set([...favorites, id]));
      toast.success("Added to favorites");
    }
  }

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (scope === "mine" && p.user_id !== user?.id) return false;
      if (cat && p.category !== cat) return false;
      if (q) {
        const s = q.toLowerCase();
        return p.title.toLowerCase().includes(s)
          || (p.description ?? "").toLowerCase().includes(s)
          || p.tags.some((t) => t.toLowerCase().includes(s));
      }
      return true;
    });
  }, [prompts, q, cat, scope, user]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Library</h1>
          <p className="text-muted-foreground mt-1">Gold-standard prompts using CO-STAR, Few-Shot & Chain-of-Thought.</p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground border-0 shadow-elegant">
          <Link to="/new"><Plus className="size-4 mr-1" /> New Prompt</Link>
        </Button>
      </header>

      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, tags…" className="pl-9 h-11" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            {(["all", "mine"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-3 py-1 text-xs font-medium rounded ${scope === s ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {s === "all" ? "All visible" : "My prompts"}
              </button>
            ))}
          </div>
          <span className="w-px h-5 bg-border mx-1" />
          <Badge
            variant={cat === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCat(null)}
          >All categories</Badge>
          {CATEGORIES.map((c) => (
            <Badge
              key={c}
              variant={cat === c ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCat(c)}
            >{c}</Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No prompts match. Create the first one.</p>
          <Button asChild className="mt-4"><Link to="/new">Create prompt</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <PromptCard key={p.id} prompt={p} isFavorite={favorites.has(p.id)} onToggleFavorite={toggleFav} />
          ))}
        </div>
      )}
    </div>
  );
}
