import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Shield, GitBranch, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prompt Directory — Gold-standard AI prompts for Dev & DevOps" },
      { name: "description", content: "A curated, team-ready library of production-grade AI prompts with version history, RBAC, and audit logs." },
      { property: "og:title", content: "Prompt Directory" },
      { property: "og:description", content: "Curated AI prompts for software development and DevOps." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-primary flex items-center justify-center shadow-elegant">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Prompt Directory</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">Sign in</Link>
            <Link to="/library" className="px-4 py-2 text-sm rounded-md gradient-primary text-primary-foreground shadow-elegant">Open Library</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm mb-6">
          Issue 01 · Editorial Drop
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] max-w-4xl">
          Gold-standard AI prompts for <span className="text-gradient">Dev &amp; DevOps</span>.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">
          A curated, team-ready library built on CO-STAR, Few-Shot, and Chain-of-Thought.
          Version history, role-based access, and an audit log — out of the box.
        </p>
        <div className="flex gap-3 mt-10">
          <Link to="/library" className="px-6 py-3 rounded-lg gradient-primary text-primary-foreground font-bold shadow-elegant hover:shadow-glow transition-all inline-flex items-center gap-2">
            Browse Library <ArrowRight className="size-4" />
          </Link>
          <Link to="/readme" className="px-6 py-3 rounded-lg border border-border hover:bg-muted font-bold">
            How it works
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, t: "Role-based access", d: "Admin, editor, member — each with the right permissions." },
            { icon: GitBranch, t: "Version history", d: "Every edit is snapshotted. One-click rollback." },
            { icon: FileText, t: "Audit log", d: "Full trail of who changed what, and when." },
          ].map((f) => (
            <div key={f.t} className="bg-card border border-border rounded-2xl p-6">
              <f.icon className="size-6 text-primary mb-3" />
              <h3 className="font-bold mb-1">{f.t}</h3>
              <p className="text-muted-foreground text-sm">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-muted-foreground flex justify-between">
          <span>© Prompt Directory</span>
          <Link to="/library" className="hover:text-foreground">Open Library →</Link>
        </div>
      </footer>
    </div>
  );
}
