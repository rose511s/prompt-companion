import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorBlock, PageSpinner } from "@/components/LoadingSkeleton";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "@/lib/api-keys.functions";

export const Route = createFileRoute("/settings/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — Prompt Directory" },
      {
        name: "description",
        content:
          "Manage personal API keys for the Prompt Companion public REST API.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ApiKeysPage />
    </RequireAuth>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8">
      <ErrorBlock error={error} />
    </div>
  ),
});

function ApiKeysPage() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => list(),
  });

  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{
    label: string;
    secret: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setCreating(true);
    try {
      const res = await create({ data: { label: label.trim() } });
      setJustCreated({ label: res.key.label, secret: res.secret });
      setLabel("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this key? Apps using it will stop working immediately."))
      return;
    try {
      await revoke({ data: { id } });
      toast.success("Key revoked");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function copySecret() {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="p-8 md:p-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-10 rounded-lg gradient-primary flex items-center justify-center shadow-elegant">
          <KeyRound className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Use these keys to call the public REST API from your CLI, CI, or scripts.
          </p>
        </div>
      </div>

      <div className="border border-border rounded-2xl bg-card p-6 mb-8">
        <h2 className="font-semibold mb-1">Create a new key</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Give it a name so you remember where it's used (e.g. "GitHub Actions",
          "Local CLI").
        </p>
        <form onSubmit={onCreate} className="flex gap-2">
          <Input
            placeholder="Key label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            required
          />
          <Button type="submit" disabled={creating || !label.trim()}>
            <Plus className="size-4 mr-1" />
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>

        {justCreated && (
          <div className="mt-4 p-4 rounded-lg border border-primary/40 bg-primary/5">
            <div className="text-sm font-medium mb-1">
              Copy your key now — it won't be shown again.
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs px-3 py-2 rounded-md bg-background border border-border break-all">
                {justCreated.secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copySecret}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setJustCreated(null)}
              className="mt-2 text-xs text-muted-foreground hover:underline"
            >
              I've saved it
            </button>
          </div>
        )}
      </div>

      {isLoading && <PageSpinner label="Loading keys…" />}
      {error && <ErrorBlock error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Label</th>
                <th className="text-left px-4 py-3">Prefix</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Last used</th>
                <th className="text-right px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.keys.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No keys yet. Create one above to start calling the API.
                  </td>
                </tr>
              )}
              {data.keys.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{k.label}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {k.key_prefix}…
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.revoked_at ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRevoke(k.id)}
                      >
                        <Trash2 className="size-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 border border-border rounded-2xl bg-card p-6">
        <h2 className="font-semibold mb-2">Quick start</h2>
        <pre className="text-xs font-mono bg-background border border-border rounded-md p-4 overflow-auto">
{`# List public prompts
curl -H "Authorization: Bearer YOUR_KEY" \\
  https://prompt-companion-app.lovable.app/api/public/v1/prompts

# Get one prompt
curl -H "Authorization: Bearer YOUR_KEY" \\
  https://prompt-companion-app.lovable.app/api/public/v1/prompts/PROMPT_ID

# Render a prompt with variables
curl -X POST -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"variables":{"LANG":"python"}}' \\
  https://prompt-companion-app.lovable.app/api/public/v1/prompts/PROMPT_ID/render`}
        </pre>
        <p className="text-xs text-muted-foreground mt-3">
          Rate limit: 60 requests per minute per key. Only public prompts are
          accessible via the API.
        </p>
      </div>
    </div>
  );
}
