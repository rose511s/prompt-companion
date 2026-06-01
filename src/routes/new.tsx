import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { logEvent } from "@/lib/audit.functions";
import { track } from "@/lib/analytics";
import { PromptEditor } from "@/components/PromptEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "New Prompt — Prompt Directory" }] }),
  component: () => <RequireAuth><NewPage /></RequireAuth>,
});

function NewPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const log = useServerFn(logEvent);

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">New prompt</h1>
      <p className="text-muted-foreground mb-6">
        Wrap user inputs in <code className="placeholder-token">[BRACKETED]</code> variables.
      </p>
      <PromptEditor
        submitLabel="Save prompt"
        onSubmit={async (v) => {
          if (!user) throw new Error("Not signed in");
          const { data, error } = await supabase
            .from("prompts")
            .insert({ ...v, user_id: user.id })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          await log({
            data: {
              action: "prompt.create",
              entity_type: "prompt",
              entity_id: data.id,
              metadata: { title: v.title, category: v.category },
            },
          }).catch(() => {});
          toast.success("Prompt saved");
          nav({ to: "/prompt/$id", params: { id: data.id } });
        }}
      />
    </div>
  );
}
