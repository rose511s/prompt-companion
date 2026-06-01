import type { Database } from "@/integrations/supabase/types";
import { Link } from "@tanstack/react-router";
import { Star, Lock, Globe } from "lucide-react";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export function PromptCard({
  prompt, isFavorite, onToggleFavorite,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <article className="group bg-card rounded-2xl border border-border p-7 flex flex-col h-full hover:border-primary transition-all hover:-translate-y-0.5 hover:shadow-card relative">
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(prompt.id); }}
        className="absolute top-5 right-5 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Toggle favorite"
      >
        <Star className={`size-5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
      </button>

      <Link to="/prompt/$id" params={{ id: prompt.id }} className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground text-[10px] font-extrabold uppercase tracking-widest bg-background/40 border border-border px-2.5 py-1 rounded">
            {prompt.category}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border"
            title={`${prompt.difficulty} level`}
          >
            {prompt.difficulty === "Beginner" ? "🟢" : prompt.difficulty === "Advanced" ? "🔴" : "🟡"} {prompt.difficulty}
          </span>
          {prompt.framework && (
            <span className="text-primary/80 text-[10px] font-bold uppercase tracking-wider">
              {prompt.framework}
            </span>
          )}
          {prompt.is_public
            ? <Globe className="size-3 text-muted-foreground ml-auto mr-7" />
            : <Lock className="size-3 text-muted-foreground ml-auto mr-7" />}
        </div>

        <h3 className="text-xl md:text-2xl font-bold leading-tight pr-6">
          {prompt.title}
        </h3>

        {prompt.description && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
            {prompt.description}
          </p>
        )}

        {prompt.tags.length > 0 && (
          <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
            {prompt.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 border border-border rounded"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}
