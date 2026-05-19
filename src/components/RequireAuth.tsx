import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, useAuthStore } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // In case it already hydrated between render and effect
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      const redirect = pathname.startsWith("/login") ? "/dashboard" : pathname;
      navigate({ to: "/login", replace: true, search: { redirect } as never });
    }
  }, [hydrated, isAuthenticated, navigate, pathname]);

  if (!hydrated || !isAuthenticated) return null;
  return <>{children}</>;
}
