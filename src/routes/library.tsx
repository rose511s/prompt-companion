import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";
import { CATEGORIES } from "@/lib/prompt-utils";
import { PromptCard } from "@/components/PromptCard";
import { GridSkeleton, ErrorBlock } from "@/components/LoadingSkeleton";
import { Plus, Search, Star, Sparkles } from "lucide-react";
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
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "mine">("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["library", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: p, error: pErr }, { data: f, error: fErr }] = await Promise.all([
        supabase.from("prompts").select("*").order("updated_at", { ascending: false }),
        supabase.from("favorites").select("prompt_id"),
      ]);
      if (pErr) throw new Error(pErr.message);
      if (fErr) throw new Error(fErr.message);
      return {
        prompts: (p ?? []) as Prompt[],
        favorites: new Set((f ?? []).map((x) => x.prompt_id)),
      };
    },
  });

  const prompts = data?.prompts ?? [];
  const favorites = data?.favorites ?? new Set<string>();

  async function toggleFav(id: string) {
    if (!user) return;
    const isFav = favorites.has(id);
    const { error: mErr } = isFav
      ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("prompt_id", id)
      : await supabase.from("favorites").insert({ user_id: user.id, prompt_id: id });
    if (mErr) {
      toast.error(mErr.message);
      return;
    }
    if (!isFav) toast.success("Added to favorites");
    qc.invalidateQueries({ queryKey: ["library", user.id] });
    qc.invalidateQueries({ queryKey: ["favorites", user.id] });
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

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 lg:px-12 py-10">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold tracking-[0.2em] uppercase rounded-sm">
                Issue 01
              </span>
              <span className="text-border text-sm font-medium">/ Library</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-none">
              Prompt Library
            </h1>
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              Curated engineering intelligence. A collection of gold-standard prompts using
              CO-STAR, Few-Shot &amp; Chain-of-Thought methodologies.
            </p>
          </div>
          <Link
            to="/new"
            className="group px-7 py-4 gradient-primary text-primary-foreground font-bold rounded-lg shadow-elegant hover:shadow-glow transition-all flex items-center gap-2 whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="size-5 group-hover:rotate-90 transition-transform" />
            New Prompt
          </Link>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the collection..."
              className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary transition-all text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center bg-card p-1 rounded-lg border border-border">
            {(["all", "mine"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  scope === s
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All visible" : "My prompts"}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat(null)}
            className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
              cat === null
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            All categories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
                cat === c
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Beginner onboarding banner */}
        {!isLoading && !error && prompts.length > 0 && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="size-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-bold">New here? Start with the Beginner set.</div>
              <p className="text-sm text-muted-foreground">
                Plain-language prompts for explaining code, writing a first test, debugging an error, and more.
              </p>
            </div>
            <button
              onClick={() => setCat("Beginner")}
              className="px-4 py-2 rounded-md gradient-primary text-primary-foreground text-sm font-bold shadow-elegant whitespace-nowrap"
            >
              Show beginner prompts
            </button>
          </div>
        )}

        {/* Editorial grid */}
        {isLoading && <GridSkeleton count={6} />}
        {error && <ErrorBlock error={error} onRetry={() => refetch()} />}
        {!isLoading && !error && filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Sparkles className="size-8 mx-auto text-primary mb-3" />
            <p className="text-muted-foreground">No prompts match. Start the collection.</p>
            <Link
              to="/new"
              className="inline-flex mt-5 px-5 py-2.5 gradient-primary text-primary-foreground font-bold rounded-lg shadow-elegant"
            >
              Create prompt
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Featured */}
            {featured && (
              <FeaturedCard
                prompt={featured}
                isFavorite={favorites.has(featured.id)}
                onToggleFavorite={toggleFav}
              />
            )}

            {/* Rest */}
            {rest.map((p) => (
              <div key={p.id} className="lg:col-span-4">
                <PromptCard
                  prompt={p}
                  isFavorite={favorites.has(p.id)}
                  onToggleFavorite={toggleFav}
                />
              </div>
            ))}

            {/* CTA tile */}
            <Link
              to="/new"
              className="lg:col-span-4 bg-gradient-to-br from-card to-background rounded-2xl border border-dashed border-border p-8 flex flex-col items-center justify-center text-center group hover:border-primary transition-all min-h-[220px]"
            >
              <div className="size-14 rounded-full bg-background flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-border">
                <Plus className="size-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Add your own</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Contribute to the collective intelligence
              </p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedCard({
  prompt, isFavorite, onToggleFavorite,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <article className="lg:col-span-8 group relative bg-card rounded-2xl border border-border overflow-hidden hover:border-primary transition-colors">
      <Link to="/prompt/$id" params={{ id: prompt.id }} className="block p-8 md:p-10 flex flex-col h-full min-h-[320px]">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3 flex-wrap">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest">
              Featured selection
            </span>
            <span className="text-muted-foreground text-[10px] font-extrabold uppercase tracking-widest bg-background/40 border border-border px-3 py-1 rounded">
              {prompt.category}
            </span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite(prompt.id); }}
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Toggle favorite"
          >
            <Star className={`size-6 ${isFavorite ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {prompt.title}
        </h2>
        {prompt.description && (
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl">
            {prompt.description}
          </p>
        )}
        {prompt.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2">
            {prompt.tags.slice(0, 6).map((t) => (
              <span key={t} className="text-[11px] font-medium text-foreground/80 border border-border px-3 py-1 rounded">
                #{t}
              </span>
            ))}
          </div>
        )}
      </Link>
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-primary opacity-10 blur-[120px] group-hover:opacity-20 transition-opacity" />
    </article>
  );
}
