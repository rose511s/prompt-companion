import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "./AppShell";
import { Sparkles } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    const t = setTimeout(() => setWaited(true), 200);
    return () => clearTimeout(t);
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {waited && <Sparkles className="size-6 animate-pulse text-primary" />}
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}

export function AuthHero() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 mb-8">
      <div className="size-9 rounded-lg gradient-primary flex items-center justify-center shadow-elegant">
        <Sparkles className="size-5 text-primary-foreground" />
      </div>
      <span className="font-semibold tracking-tight text-lg">Prompt Directory</span>
    </Link>
  );
}
