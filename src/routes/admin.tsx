import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { listUsersWithRoles, setUserRole } from "@/lib/admin.functions";
import { ErrorBlock, PageSpinner } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Prompt Directory" }] }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <AdminPage />
      </AdminGate>
    </RequireAuth>
  ),
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (role !== "admin") {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <Shield className="size-10 text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">Admin only</h1>
        <p className="text-muted-foreground">
          You need the admin role to view this page.
        </p>
        <Link to="/library" className="inline-block mt-4 text-primary underline">
          Back to library
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminPage() {
  const list = useServerFn(listUsersWithRoles);
  const setRole = useServerFn(setUserRole);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list(),
  });

  async function change(id: string, role: "admin" | "editor" | "member") {
    setBusyId(id);
    try {
      await setRole({ data: { target_user_id: id, role } });
      toast.success(`Role updated to ${role}`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">Manage roles and inspect activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/logs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted text-sm"
          >
            <AlertTriangle className="size-4" /> Error logs
          </Link>
          <Link
            to="/admin/audit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted text-sm"
          >
            <FileText className="size-4" /> Audit log
          </Link>
        </div>
      </div>

      {isLoading && <PageSpinner label="Loading users…" />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Current role</th>
                <th className="text-right px-4 py-3">Change role</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex bg-background border border-border rounded-md overflow-hidden">
                      {(["member", "editor", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          disabled={busyId === u.id || u.role === r}
                          onClick={() => change(u.id, r)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            u.role === r
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted disabled:opacity-50"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
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
