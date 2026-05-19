import { ReactNode, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isAuthenticated) {
      const redirect = pathname.startsWith("/login") ? "/dashboard" : pathname;
      navigate({ to: "/login", replace: true, search: { redirect } as never });
    }
  }, [isAuthenticated, navigate, pathname]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
