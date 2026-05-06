import type { Database } from "@/integrations/supabase/types";
import { PLACEHOLDER_REGEX } from "@/lib/prompt-utils";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, Lock, Globe } from "lucide-react";
import { useMemo } from "react";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];

export function PromptCard({
  prompt, isFavorite, onToggleFavorite,
}: {
  prompt: Prompt;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const preview = useMemo(() => {
    const text = prompt.content.slice(0, 220);
    return text.split(/(\[[A-Z0-9_]+\])/g).map((p, i) =>
      PLACEHOLDER_REGEX.test(p)
        ? <span key={i} className="placeholder-token">{p.slice(1, -1)}</span>
        : <span key={i}>{p}</span>
    );
  }, [prompt.content]);

  return (
    <Card className="group p-5 shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5 flex flex-col gap-3 relative">
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(prompt.id); }}
        className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Toggle favorite"
      >
        <Star className={`size-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
      </button>

      <Link to="/prompt/$id" params={{ id: prompt.id }} className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-medium">{prompt.category}</Badge>
          {prompt.framework && <Badge variant="outline" className="text-[10px]">{prompt.framework}</Badge>}
          {prompt.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
        </div>
        <h3 className="font-semibold text-lg leading-tight pr-6">{prompt.title}</h3>
        {prompt.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{prompt.description}</p>
        )}
        <div className="text-xs font-mono text-muted-foreground/80 line-clamp-3 leading-relaxed">
          {preview}
        </div>
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {prompt.tags.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
      </Link>
    </Card>
  );
}
