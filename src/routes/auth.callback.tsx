import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: "Completing sign in… — Lampcode" }] }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (settled) return;
        if (event === "SIGNED_IN" && session) {
          settled = true;
          subscription.unsubscribe();
          navigate({ to: "/dashboard", replace: true });
        }
      }
    );

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        subscription.unsubscribe();
        navigate({ to: "/login", replace: true });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Completing sign in…</div>
    </div>
  );
}
