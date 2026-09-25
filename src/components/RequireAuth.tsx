import { ReactNode, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { WAITLIST_MODE, bypassesWaitlist } from "@/lib/waitlist";
import { WaitlistThanks } from "@/components/WaitlistThanks";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      const redirect = pathname.startsWith("/login") ? "/" : pathname;
      navigate({ to: "/login", replace: true, search: { redirect } as never });
    }
  }, [loading, isAuthenticated, navigate, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // Every product route already funnels through here, so the waitlist gate
  // lives here too rather than being repeated in each one — a route added
  // later is covered by default instead of leaking by omission. Admins pass
  // through, otherwise the product can't be tested before it opens.
  if (WAITLIST_MODE && !bypassesWaitlist(user?.email)) return <WaitlistThanks />;

  return <>{children}</>;
}
