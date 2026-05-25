import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PromptCard } from "@/components/PromptCard";
import { useAuth } from "@/lib/auth";
import { GridSkeleton, ErrorBlock } from "@/components/LoadingSkeleton";
import { toast } from "sonner";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Prompt Directory" }] }),
  component: () => <RequireAuth><FavPage /></RequireAuth>,
});

function FavPage() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: f, error: fErr } = await supabase
        .from("favorites")
        .select("prompt_id");
      if (fErr) throw new Error(fErr.message);
      const ids = (f ?? []).map((x) => x.prompt_id);
      if (ids.length === 0) return { prompts: [] as Prompt[], favIds: new Set<string>() };
      const { data: p, error: pErr } = await supabase
        .from("prompts")
        .select("*")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      return { prompts: p ?? [], favIds: new Set(ids) };
    },
  });

  async function toggleFav(id: string) {
    if (!user) return;
    const { error: dErr } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("prompt_id", id);
    if (dErr) {
      toast.error(dErr.message);
      return;
    }
    await refetch();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Favorites</h1>
      <p className="text-muted-foreground mb-8">Your starred prompts for quick access.</p>
      {isLoading && <GridSkeleton count={6} />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}
      {data && data.prompts.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-lg text-muted-foreground">
          Star prompts in the library to see them here.
        </div>
      )}
      {data && data.prompts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.prompts.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              isFavorite={data.favIds.has(p.id)}
              onToggleFavorite={toggleFav}
            />
          ))}
        </div>
      )}
    </div>
  );
}
