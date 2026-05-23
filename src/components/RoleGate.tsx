import { useAuth } from "@/lib/auth";

type Role = "admin" | "editor" | "member";

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { role } = useAuth();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

export function useHasRole(allow: Role[]): boolean {
  const { role } = useAuth();
  return !!role && allow.includes(role);
}
