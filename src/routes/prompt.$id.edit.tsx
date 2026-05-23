import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { logEvent } from "@/lib/audit.functions";
import { PromptEditor } from "@/components/PromptEditor";
import { PageSpinner } from "@/components/LoadingSkeleton";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/prompt/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Prompt — Prompt Directory" }] }),
  component: () => (
    <RequireAuth>
      <EditPage />
    </RequireAuth>
  ),
});

function EditPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const nav = useNavigate();
  const log = useServerFn(logEvent);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<{
    title: string; description: string | null; content: string;
    category: string; framework: string | null; tags: string[]; is_public: boolean;
    user_id: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prompts").select("*").eq("id", id).maybeSingle();
      setPrompt(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!prompt) return <div className="p-10">Prompt not found.</div>;

  const isOwner = user?.id === prompt.user_id;
  const canEdit = isOwner || role === "admin" || role === "editor";

  if (!canEdit) {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <Shield className="size-10 text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold">You can't edit this prompt</h1>
        <p className="text-muted-foreground mt-2">Ask an editor or admin to update it.</p>
        <Link to="/prompt/$id" params={{ id }} className="inline-block mt-4 text-primary underline">
          Back to prompt
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <Link to="/prompt/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back to prompt
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Edit prompt</h1>
      <PromptEditor
        initial={prompt}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          const { error } = await supabase
            .from("prompts")
            .update(values)
            .eq("id", id);
          if (error) throw new Error(error.message);
          await log({
            data: {
              action: "prompt.update",
              entity_type: "prompt",
              entity_id: id,
              metadata: { title: values.title },
            },
          }).catch(() => {});
          toast.success("Prompt updated");
          nav({ to: "/prompt/$id", params: { id } });
        }}
      />
    </div>
  );
}
