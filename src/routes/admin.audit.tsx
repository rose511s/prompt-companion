import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit.functions";
import { ErrorBlock, PageSpinner } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Prompt Directory" }] }),
  component: () => (
    <RequireAuth>
      <Gate>
        <AuditPage />
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

function AuditPage() {
  const list = useServerFn(listAuditLogs);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit", "logs"],
    queryFn: () => list({ data: { limit: 100 } }),
  });

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back to admin
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Audit log</h1>
      <p className="text-muted-foreground mb-6">Last 100 events.</p>

      {isLoading && <PageSpinner label="Loading audit log…" />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}

      {data && data.logs.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl text-muted-foreground">
          No events recorded yet.
        </div>
      )}

      {data && data.logs.length > 0 && (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{l.actor_name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{l.action}</Badge></td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {l.entity_type}
                    {l.entity_id && <div>{l.entity_id.slice(0, 8)}…</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground max-w-md">
                      {JSON.stringify(l.metadata, null, 0)}
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
