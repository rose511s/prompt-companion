import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { listErrorLogs } from "@/lib/error-logs.functions";
import { ErrorBlock, PageSpinner } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({ meta: [{ title: "Error Logs — Prompt Directory" }] }),
  component: () => (
    <RequireAuth>
      <Gate>
        <LogsPage />
      </Gate>
    </RequireAuth>
  ),
});

function Gate({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (role !== "admin")
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <Shield className="size-10 text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold">Admin only</h1>
      </div>
    );
  return <>{children}</>;
}

function LogsPage() {
  const list = useServerFn(listErrorLogs);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "error-logs"],
    queryFn: () => list({ data: { limit: 100 } }),
  });

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back to admin
      </Link>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Error logs</h1>
          <p className="text-muted-foreground">Last 100 server-side errors (Playground, gateway failures, etc.).</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {isLoading && <PageSpinner label="Loading error logs…" />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}

      {data && data.logs.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl text-muted-foreground">
          No errors recorded — all clear.
        </div>
      )}

      {data && data.logs.length > 0 && (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Message</th>
                <th className="text-left px-4 py-3">Context</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline">{l.source}</Badge></td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="font-medium text-sm">{l.message}</div>
                    {l.user_id && (
                      <div className="text-[11px] font-mono text-muted-foreground mt-1">
                        user: {l.user_id.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-md">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                      {l.context}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
