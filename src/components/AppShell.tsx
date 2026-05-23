import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Library, Star, Plus, BookOpen, LogOut, Sparkles, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HelpChat } from "@/components/HelpChat";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { to: "/library", label: "Library", icon: Library },
  { to: "/favorites", label: "Favorites", icon: Star },
  { to: "/new", label: "New Prompt", icon: Plus },
  { to: "/readme", label: "README", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, role, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <Link to="/library" className="px-6 py-5 border-b border-border flex items-center gap-2">
          <div className="size-8 rounded-lg gradient-primary flex items-center justify-center shadow-elegant">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Prompt Directory</div>
            <div className="text-xs text-muted-foreground">DevOps Edition</div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = path === n.to || (n.to === "/library" && path === "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
          {role === "admin" && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                path.startsWith("/admin")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs gradient-primary text-primary-foreground">
                {(profile?.display_name || user?.email || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {profile?.display_name || user?.email}
              </div>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{role}</Badge>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      <HelpChat />
    </div>
  );
}
