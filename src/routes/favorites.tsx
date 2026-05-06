import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PromptCard } from "@/components/PromptCard";
import { useAuth } from "@/lib/auth";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Prompt Directory" }] }),
  component: () => <RequireAuth><FavPage /></RequireAuth>,
});

function FavPage() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => { void load(); }, [user]);

  async function load() {
    const { data: f } = await supabase.from("favorites").select("prompt_id");
    const ids = (f ?? []).map((x) => x.prompt_id);
    setFavIds(new Set(ids));
    if (ids.length === 0) { setPrompts([]); return; }
    const { data } = await supabase.from("prompts").select("*").in("id", ids);
    setPrompts(data ?? []);
  }

  async function toggleFav(id: string) {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("prompt_id", id);
    await load();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Favorites</h1>
      <p className="text-muted-foreground mb-8">Your starred prompts for quick access.</p>
      {prompts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg text-muted-foreground">
          Star prompts in the library to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} isFavorite={favIds.has(p.id)} onToggleFavorite={toggleFav} />
          ))}
        </div>
      )}
    </div>
  );
}
