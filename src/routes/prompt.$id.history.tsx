import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { listPromptVersions, restorePromptVersion } from "@/lib/versions.functions";
import { ErrorBlock, PageSpinner } from "@/components/LoadingSkeleton";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/prompt/$id/history")({
  head: () => ({ meta: [{ title: "Version History — Prompt Directory" }] }),
  component: () => (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  ),
});

function HistoryPage() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const list = useServerFn(listPromptVersions);
  const restore = useServerFn(restorePromptVersion);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prompt-versions", id],
    queryFn: () => list({ data: { prompt_id: id } }),
  });

  async function handleRestore(versionId: string) {
    if (!confirm("Restore this version? Current content will be saved as a new version first.")) return;
    setBusy(versionId);
    try {
      const res = await restore({
        data: { prompt_id: id, version_id: versionId, change_note: "Restored via UI" },
      });
      toast.success(`Restored to v${res.restored_version}`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  const canRestore = role === "admin" || role === "editor";

  return (
    <div className="p-8 md:p-12 max-w-4xl mx-auto">
      <Link
        to="/prompt/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Back to prompt
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Version history</h1>
      <p className="text-muted-foreground mb-8">Every edit is automatically snapshotted.</p>

      {isLoading && <PageSpinner label="Loading history…" />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}

      {data && data.versions.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
          No previous versions yet. They'll appear here after the first edit.
        </div>
      )}

      <div className="space-y-4">
        {data?.versions.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge>v{v.version_number}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.edited_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                {v.change_note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{v.change_note}</p>
                )}
              </div>
              {canRestore && (
                <button
                  onClick={() => handleRestore(v.id)}
                  disabled={busy === v.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted disabled:opacity-50"
                >
                  <RotateCcw className="size-3" />
                  {busy === v.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
            <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-md border border-border max-h-48 overflow-auto">
              {v.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
